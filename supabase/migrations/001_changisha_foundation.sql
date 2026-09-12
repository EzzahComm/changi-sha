-- CHANGISHA Phase 1 Foundation
-- Migration: 001_changisha_foundation.sql
-- Purpose: Core Daraja webhook handler, contribution ledger, and exception queue
-- Status: Week 1, Days 1-2

-- [INVARIANT E1] Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- [INVARIANT E2] Create core schema if not exists
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS changisha;

-- [INVARIANT E3] Grant permissions on schemas
GRANT USAGE ON SCHEMA core TO postgres, authenticated, anon;
GRANT USAGE ON SCHEMA changisha TO postgres, authenticated, anon;

-- ============================================================================
-- CORE TABLES (Prerequisites - assumed to exist in core schema)
-- ============================================================================

-- core.orgs table (tenant isolation)
-- Assumed to exist; if not, create it:
-- CREATE TABLE core.orgs (
--   id BIGSERIAL PRIMARY KEY,
--   slug TEXT NOT NULL UNIQUE,
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );

-- core.members table (tenant membership)
-- Assumed to exist; if not, create it:
-- CREATE TABLE core.members (
--   id BIGSERIAL PRIMARY KEY,
--   org_id BIGINT NOT NULL REFERENCES core.orgs(id),
--   user_id UUID NOT NULL REFERENCES auth.users(id),
--   created_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE(org_id, user_id)
-- );

-- core.audit_events table (state trail)
-- Assumed to exist; if not, create it:
-- CREATE TABLE core.audit_events (
--   id BIGSERIAL PRIMARY KEY,
--   event_type TEXT NOT NULL,
--   resource_type TEXT NOT NULL,
--   resource_id BIGINT,
--   user_id UUID,
--   metadata JSONB,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );

-- [INVARIANT P1] Shared phone normalization function
-- Used by both Changisha and other modules
CREATE OR REPLACE FUNCTION phone_utils.normalize_ke_msisdn(p_phone TEXT)
RETURNS TEXT
IMMUTABLE
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove all non-digits
  p_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- If starts with 0, replace with 254 (Kenya country code)
  IF substring(p_phone, 1, 1) = '0' THEN
    p_phone := '254' || substring(p_phone, 2);
  END IF;

  -- If starts with 254 but has 13 digits, it's valid
  IF substring(p_phone, 1, 3) = '254' AND length(p_phone) = 12 THEN
    RETURN p_phone;
  END IF;

  -- Fallback: return original if can't parse
  RETURN p_phone;
END;
$$;

-- ============================================================================
-- CHANGISHA TABLES
-- ============================================================================

-- [INVARIANT T1] Collection instruments table
CREATE TABLE changisha.collection_instruments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES core.orgs(id) ON DELETE CASCADE,
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('paybill', 'till', 'bank_account')),
  account_reference TEXT NOT NULL,
  display_name TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  settlement_frequency TEXT DEFAULT 'daily',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, instrument_type, account_reference)
);

CREATE INDEX idx_changisha_instruments_tenant ON changisha.collection_instruments(tenant_id);
CREATE INDEX idx_changisha_instruments_active ON changisha.collection_instruments(is_active) WHERE is_active = TRUE;

-- [INVARIANT T2] Campaigns table
CREATE TABLE changisha.campaigns (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES core.orgs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,
  target_amount NUMERIC(19,2) NOT NULL CHECK (target_amount > 0),
  currency_code TEXT NOT NULL DEFAULT 'KES',
  beneficiary_id BIGINT REFERENCES core.members(id),
  beneficiary_name TEXT,
  beneficiary_story TEXT,
  collection_instrument_id BIGINT NOT NULL REFERENCES changisha.collection_instruments(id),
  ref_prefix TEXT NOT NULL CHECK (char_length(ref_prefix) BETWEEN 3 AND 5),
  next_ref_sequence INT NOT NULL DEFAULT 1,
  visibility TEXT NOT NULL DEFAULT 'closed' CHECK (visibility IN ('closed', 'members_only', 'public')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_by BIGINT NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auto_publish_at_close BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, slug),
  CHECK (closes_at > opens_at)
);

CREATE INDEX idx_changisha_campaigns_tenant ON changisha.campaigns(tenant_id);
CREATE INDEX idx_changisha_campaigns_status ON changisha.campaigns(status, opens_at);
CREATE INDEX idx_changisha_campaigns_visible ON changisha.campaigns(visibility, status) WHERE status = 'open';

-- [INVARIANT T3] Pledges table
CREATE TABLE changisha.pledges (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES changisha.campaigns(id) ON DELETE CASCADE,
  pledger_id BIGINT REFERENCES core.members(id),
  pledger_name TEXT NOT NULL,
  pledger_phone TEXT NOT NULL,
  pledged_amount NUMERIC(19,2) NOT NULL CHECK (pledged_amount > 0),
  due_date TIMESTAMPTZ,
  reminder_sent_count INT DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  consent_to_contact BOOLEAN NOT NULL DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_contributed', 'fulfilled', 'overdue', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, pledger_phone)
);

CREATE INDEX idx_changisha_pledges_campaign ON changisha.pledges(campaign_id);
CREATE INDEX idx_changisha_pledges_phone ON changisha.pledges(pledger_phone);
CREATE INDEX idx_changisha_pledges_status ON changisha.pledges(status);

-- [INVARIANT T4] Payment events table (raw Daraja payloads, replay detection)
CREATE TABLE changisha.payment_events (
  id BIGSERIAL PRIMARY KEY,
  trans_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  is_replay BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changisha_payment_events_trans_id ON changisha.payment_events(trans_id);
CREATE INDEX idx_changisha_payment_events_processed ON changisha.payment_events(processed_at);
CREATE INDEX idx_changisha_payment_events_replay ON changisha.payment_events(is_replay) WHERE is_replay = TRUE;

-- [INVARIANT T5] Contributions table (immutable ledger)
CREATE TABLE changisha.contributions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES changisha.campaigns(id) ON DELETE CASCADE,
  pledge_id BIGINT REFERENCES changisha.pledges(id),
  trans_id TEXT NOT NULL UNIQUE,
  initiator_msisdn TEXT NOT NULL,
  initiator_name TEXT,
  amount NUMERIC(19,2) NOT NULL CHECK (amount > 0),
  reference_code TEXT NOT NULL,
  checkout_request_id TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  settlement_reference TEXT,
  allocation_status TEXT NOT NULL DEFAULT 'unallocated' CHECK (allocation_status IN ('unallocated', 'allocated', 'reallocated', 'reversed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trans_id_unique UNIQUE(trans_id)
);

CREATE INDEX idx_changisha_contributions_campaign ON changisha.contributions(campaign_id);
CREATE INDEX idx_changisha_contributions_trans_id ON changisha.contributions(trans_id);
CREATE INDEX idx_changisha_contributions_reference ON changisha.contributions(reference_code);
CREATE INDEX idx_changisha_contributions_allocated ON changisha.contributions(allocation_status);
CREATE INDEX idx_changisha_contributions_msisdn ON changisha.contributions(initiator_msisdn);

-- [INVARIANT T6] Allocations table
CREATE TABLE changisha.allocations (
  id BIGSERIAL PRIMARY KEY,
  contribution_id BIGINT NOT NULL REFERENCES changisha.contributions(id) ON DELETE CASCADE,
  campaign_id BIGINT NOT NULL REFERENCES changisha.campaigns(id) ON DELETE CASCADE,
  pledge_id BIGINT REFERENCES changisha.pledges(id),
  allocated_amount NUMERIC(19,2) NOT NULL CHECK (allocated_amount > 0),
  match_method TEXT NOT NULL CHECK (match_method IN ('reference', 'manual', 'fallback')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changisha_allocations_contribution ON changisha.allocations(contribution_id);
CREATE INDEX idx_changisha_allocations_campaign ON changisha.allocations(campaign_id);
CREATE INDEX idx_changisha_allocations_pledge ON changisha.allocations(pledge_id);

-- [INVARIANT T7] Exceptions table (unmatched, invalid, manual review)
CREATE TABLE changisha.exceptions (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT REFERENCES changisha.campaigns(id) ON DELETE CASCADE,
  contribution_id BIGINT NOT NULL REFERENCES changisha.contributions(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'unmatched_reference',
    'overpaid_pledge',
    'unmatched_msisdn',
    'invalid_amount',
    'duplicate_trans_id'
  )),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
  description TEXT NOT NULL,
  suggested_action TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolved_at TIMESTAMPTZ,
  resolved_by BIGINT REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_changisha_exceptions_campaign ON changisha.exceptions(campaign_id);
CREATE INDEX idx_changisha_exceptions_status ON changisha.exceptions(status);
CREATE INDEX idx_changisha_exceptions_contribution ON changisha.exceptions(contribution_id);
CREATE INDEX idx_changisha_exceptions_type ON changisha.exceptions(exception_type);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- [INVARIANT S1] Enable RLS on all Changisha tables
ALTER TABLE changisha.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.collection_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE changisha.payment_events ENABLE ROW LEVEL SECURITY;

-- [INVARIANT S2] Public campaigns (read-only)
CREATE POLICY public_read_campaigns ON changisha.campaigns
  FOR SELECT
  USING (
    status = 'open'
    AND visibility != 'closed'
    AND now() BETWEEN opens_at AND closes_at
  );

-- [INVARIANT S3] Tenant owns campaigns
CREATE POLICY tenant_manage_campaigns ON changisha.campaigns
  FOR ALL
  USING (
    tenant_id = (
      SELECT org_id FROM core.members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- [INVARIANT S4] Tenant owns pledges
CREATE POLICY tenant_manage_pledges ON changisha.pledges
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

-- [INVARIANT S5] Tenant owns contributions
CREATE POLICY tenant_manage_contributions ON changisha.contributions
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

-- [INVARIANT S6] Tenant owns allocations
CREATE POLICY tenant_manage_allocations ON changisha.allocations
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

-- [INVARIANT S7] Tenant owns exceptions
CREATE POLICY tenant_manage_exceptions ON changisha.exceptions
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

-- [INVARIANT S8] Tenant owns collection instruments
CREATE POLICY tenant_manage_instruments ON changisha.collection_instruments
  FOR ALL
  USING (
    tenant_id = (
      SELECT org_id FROM core.members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- [INVARIANT P2] Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON changisha.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON changisha.pledges TO authenticated;
GRANT SELECT, INSERT ON changisha.contributions TO authenticated;
GRANT SELECT, INSERT ON changisha.allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON changisha.exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON changisha.collection_instruments TO authenticated;
GRANT SELECT, INSERT ON changisha.payment_events TO authenticated;

-- Public read access for open campaigns
GRANT SELECT ON changisha.campaigns TO anon;

-- [INVARIANT P3] Grant permission to phone_utils function
GRANT EXECUTE ON FUNCTION phone_utils.normalize_ke_msisdn(TEXT) TO public, authenticated, anon;

-- ============================================================================
-- Migration End
-- ============================================================================
-- Status: Ready for deployment
-- Next: Step 2 - RPC Implementation
