-- Changisha Phase 2: Pledge & Notification Migration
-- Adds contributor consent tracking, pledge management, and reminder infrastructure
-- Status: ✓ Ready for deployment

-- ============================================================================
-- TABLE: contributor_consents
-- DPA 2019 consent capture for non-members
-- [INVARIANT D1] Consent MUST be captured before SMS dispatch
-- [INVARIANT D2] Consent records method, timestamp, IP, user agent
-- [INVARIANT D4] Consent expires after 12 months
-- ============================================================================
CREATE TABLE changisha.contributor_consents (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES changisha.campaigns(id) ON DELETE CASCADE,
  phone_normalized TEXT NOT NULL,
  consents_to_contact BOOLEAN NOT NULL DEFAULT FALSE,
  consents_to_data_processing BOOLEAN NOT NULL DEFAULT FALSE,
  consent_method TEXT NOT NULL CHECK (consent_method IN ('web_form', 'sms_callback', 'ussd', 'offline')),
  consent_ip_address INET,
  consent_user_agent TEXT,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '12 months'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, phone_normalized)
);

CREATE INDEX idx_changisha_consents_campaign ON changisha.contributor_consents(campaign_id);
CREATE INDEX idx_changisha_consents_phone ON changisha.contributor_consents(phone_normalized);
CREATE INDEX idx_changisha_consents_expires ON changisha.contributor_consents(consent_expires_at);

-- ============================================================================
-- UPDATE TABLE: pledges
-- Add reminder tracking fields
-- ============================================================================
ALTER TABLE changisha.pledges
ADD COLUMN IF NOT EXISTS reminder_sent_count INT DEFAULT 0;

ALTER TABLE changisha.pledges
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- ============================================================================
-- VIEW: v_pledges_with_consent_status
-- Shows pledge status with consent validation
-- [INVARIANT P3] Non-members must have explicit consent
-- ============================================================================
CREATE OR REPLACE VIEW changisha.v_pledges_with_consent_status AS
SELECT
  p.id,
  p.campaign_id,
  p.pledger_id,
  p.pledger_name,
  p.pledger_phone,
  p.pledged_amount,
  p.due_date,
  p.is_public,
  p.consent_to_contact,
  p.consent_timestamp,
  p.reminder_sent_count,
  p.last_reminder_at,
  CASE
    WHEN p.pledger_id IS NOT NULL THEN 'member'
    ELSE 'external'
  END AS pledger_type,
  CASE
    WHEN p.pledger_id IS NOT NULL THEN TRUE  -- Members implicitly consent
    WHEN cc.consents_to_contact = TRUE
      AND (cc.consent_expires_at IS NULL OR now() < cc.consent_expires_at)
      THEN TRUE
    ELSE FALSE
  END AS has_valid_consent,
  cc.consent_method,
  cc.consent_timestamp,
  cc.consent_expires_at,
  p.status
FROM changisha.pledges p
LEFT JOIN changisha.contributor_consents cc
  ON cc.campaign_id = p.campaign_id
  AND cc.phone_normalized = p.pledger_phone
ORDER BY p.created_at DESC;

GRANT SELECT ON changisha.v_pledges_with_consent_status TO authenticated;

-- ============================================================================
-- VIEW: v_pledge_status_computed
-- Dynamic pledge status with contribution amounts
-- [INVARIANT P4] Status: pending → partially_contributed → fulfilled → overdue
-- ============================================================================
CREATE OR REPLACE VIEW changisha.v_pledge_status_computed AS
SELECT
  p.id,
  p.campaign_id,
  p.pledged_amount,
  COALESCE(SUM(a.allocated_amount), 0) as contributed_amount,
  CASE
    WHEN COALESCE(SUM(a.allocated_amount), 0) >= p.pledged_amount THEN 'fulfilled'
    WHEN COALESCE(SUM(a.allocated_amount), 0) > 0 THEN 'partially_contributed'
    WHEN now() > COALESCE(p.due_date, now() - interval '1 second') THEN 'overdue'
    ELSE 'pending'
  END AS computed_status,
  CASE
    WHEN COALESCE(SUM(a.allocated_amount), 0) >= p.pledged_amount THEN TRUE
    ELSE FALSE
  END AS is_fulfilled
FROM changisha.pledges p
LEFT JOIN changisha.allocations a ON a.pledge_id = p.id
GROUP BY p.id, p.campaign_id, p.pledged_amount, p.due_date;

GRANT SELECT ON changisha.v_pledge_status_computed TO authenticated;

-- ============================================================================
-- RLS: contributor_consents
-- ============================================================================
ALTER TABLE changisha.contributor_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_manage_consents ON changisha.contributor_consents
  FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM changisha.campaigns
      WHERE tenant_id = (
        SELECT org_id FROM core.members
        WHERE user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON changisha.contributor_consents TO authenticated;

-- ============================================================================
-- END MIGRATION
-- ============================================================================
