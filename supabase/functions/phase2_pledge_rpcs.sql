-- Changisha Phase 2 RPCs
-- create_pledge, compute_pledge_status, capture_contributor_consent, bulk_import_pledges

-- ============================================================================
-- RPC: create_pledge
-- Create a new pledge with validation and consent requirement
-- [INVARIANT P1] Pledge created with pledged_amount and phone
-- [INVARIANT P2] pledger_phone unique per campaign
-- [INVARIANT P3] Non-members must have explicit consent
-- ============================================================================
CREATE OR REPLACE FUNCTION changisha.create_pledge(
  p_campaign_id BIGINT,
  p_pledger_id BIGINT DEFAULT NULL,
  p_pledger_name TEXT,
  p_pledger_phone TEXT,
  p_pledged_amount NUMERIC,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT FALSE,
  p_consent_to_contact BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  pledge_id BIGINT,
  phone_normalized TEXT,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public, changisha, core
LANGUAGE plpgsql
AS $$
DECLARE
  v_pledge_id BIGINT;
  v_phone_normalized TEXT;
  v_campaign_exists BOOLEAN;
  v_tenant_id BIGINT;
  v_error_msg TEXT := NULL;
BEGIN
  -- 1. Validate campaign
  SELECT id, tenant_id INTO v_campaign_id, v_tenant_id
  FROM changisha.campaigns
  WHERE id = p_campaign_id
  AND status IN ('draft', 'open')
  AND now() < closes_at;

  IF v_campaign_id IS NULL THEN
    v_error_msg := 'Campaign not found or closed';
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  END IF;

  -- 2. Normalize phone
  BEGIN
    v_phone_normalized := p_pledger_phone;
    IF v_phone_normalized LIKE '07%' THEN
      v_phone_normalized := '254' || substring(v_phone_normalized, 2);
    ELSIF v_phone_normalized LIKE '+2547%' THEN
      v_phone_normalized := substring(v_phone_normalized, 2);
    END IF;

    IF v_phone_normalized !~ '^254[7-9]\d{8}$' THEN
      v_error_msg := 'Invalid phone number: ' || p_pledger_phone;
      RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Phone normalization failed: ' || SQLERRM;
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  END;

  -- 3. Check uniqueness
  IF EXISTS (
    SELECT 1 FROM changisha.pledges
    WHERE campaign_id = p_campaign_id
    AND pledger_phone = v_phone_normalized
  ) THEN
    v_error_msg := 'Pledge already exists for this phone in this campaign';
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  END IF;

  -- 4. Validate consent requirement
  -- [INVARIANT P3] Non-members MUST have explicit consent_to_contact
  IF p_pledger_id IS NULL AND p_consent_to_contact = FALSE THEN
    v_error_msg := 'External pledgers require explicit contact consent';
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  END IF;

  -- 5. Create pledge
  BEGIN
    INSERT INTO changisha.pledges (
      campaign_id,
      pledger_id,
      pledger_name,
      pledger_phone,
      pledged_amount,
      due_date,
      is_public,
      consent_to_contact,
      consent_timestamp,
      status
    )
    VALUES (
      p_campaign_id,
      p_pledger_id,
      p_pledger_name,
      v_phone_normalized,
      p_pledged_amount,
      p_due_date,
      p_is_public,
      p_consent_to_contact,
      CASE WHEN p_consent_to_contact THEN now() ELSE NULL END,
      'pending'
    )
    RETURNING id INTO v_pledge_id;
  EXCEPTION WHEN UNIQUE_VIOLATION THEN
    v_error_msg := 'Pledge already exists for this phone';
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Pledge creation failed: ' || SQLERRM;
    RETURN QUERY SELECT NULL::BIGINT, NULL::TEXT, v_error_msg;
    RETURN;
  END;

  -- 6. Audit log
  PERFORM core.log_audit_event(
    'changisha_pledge_created',
    'changisha.pledges',
    v_pledge_id,
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'pledger_id', p_pledger_id,
      'pledged_amount', p_pledged_amount,
      'consent_to_contact', p_consent_to_contact
    )
  );

  RETURN QUERY SELECT v_pledge_id, v_phone_normalized, NULL::TEXT;

END;
$$;

GRANT EXECUTE ON FUNCTION changisha.create_pledge(BIGINT, BIGINT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, BOOLEAN, BOOLEAN) TO authenticated;

-- ============================================================================
-- RPC: compute_pledge_status
-- Compute pledge status based on contributions
-- [INVARIANT P4] Status transitions: pending → partially_contributed → fulfilled → overdue
-- ============================================================================
CREATE OR REPLACE FUNCTION changisha.compute_pledge_status(p_pledge_id BIGINT)
RETURNS TABLE (
  status TEXT,
  contributed_amount NUMERIC,
  pledged_amount NUMERIC,
  is_fulfilled BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pledged_amount NUMERIC;
  v_contributed_amount NUMERIC;
  v_due_date TIMESTAMPTZ;
  v_is_fulfilled BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT pledged_amount, due_date
  INTO v_pledged_amount, v_due_date
  FROM changisha.pledges
  WHERE id = p_pledge_id;

  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO v_contributed_amount
  FROM changisha.allocations
  WHERE pledge_id = p_pledge_id;

  -- Determine status
  IF v_contributed_amount >= v_pledged_amount THEN
    v_status := 'fulfilled';
    v_is_fulfilled := TRUE;
  ELSIF v_contributed_amount > 0 THEN
    v_status := 'partially_contributed';
    v_is_fulfilled := FALSE;
  ELSIF now() > COALESCE(v_due_date, now() - interval '1 second') THEN
    v_status := 'overdue';
    v_is_fulfilled := FALSE;
  ELSE
    v_status := 'pending';
    v_is_fulfilled := FALSE;
  END IF;

  RETURN QUERY SELECT v_status, v_contributed_amount, v_pledged_amount, v_is_fulfilled;
END;
$$;

GRANT EXECUTE ON FUNCTION changisha.compute_pledge_status(BIGINT) TO authenticated;

-- ============================================================================
-- RPC: capture_contributor_consent
-- Capture DPA 2019 consent for non-members
-- [INVARIANT D1] Consent MUST be captured before SMS dispatch
-- [INVARIANT D2] Consent records method, timestamp, IP, user agent
-- ============================================================================
CREATE OR REPLACE FUNCTION changisha.capture_contributor_consent(
  p_campaign_id BIGINT,
  p_phone_normalized TEXT,
  p_consents_to_contact BOOLEAN,
  p_consents_to_data_processing BOOLEAN,
  p_method TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  consent_id BIGINT,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public, changisha, core
LANGUAGE plpgsql
AS $$
DECLARE
  v_consent_id BIGINT;
  v_error_msg TEXT := NULL;
BEGIN
  -- 1. Validate method
  IF p_method NOT IN ('web_form', 'sms_callback', 'ussd', 'offline') THEN
    v_error_msg := 'Invalid consent method: ' || p_method;
    RETURN QUERY SELECT NULL::BIGINT, v_error_msg;
    RETURN;
  END IF;

  -- 2. Insert or update consent record
  BEGIN
    INSERT INTO changisha.contributor_consents (
      campaign_id,
      phone_normalized,
      consents_to_contact,
      consents_to_data_processing,
      consent_method,
      consent_ip_address,
      consent_user_agent,
      consent_timestamp,
      consent_expires_at
    )
    VALUES (
      p_campaign_id,
      p_phone_normalized,
      p_consents_to_contact,
      p_consents_to_data_processing,
      p_method,
      p_ip_address,
      p_user_agent,
      now(),
      now() + interval '12 months'
    )
    ON CONFLICT (campaign_id, phone_normalized)
    DO UPDATE SET
      consents_to_contact = p_consents_to_contact,
      consents_to_data_processing = p_consents_to_data_processing,
      consent_timestamp = now(),
      consent_expires_at = now() + interval '12 months',
      consent_method = p_method,
      consent_user_agent = COALESCE(p_user_agent, consent_user_agent)
    RETURNING id INTO v_consent_id;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Consent capture failed: ' || SQLERRM;
    RETURN QUERY SELECT NULL::BIGINT, v_error_msg;
    RETURN;
  END;

  -- 3. Audit log
  PERFORM core.log_audit_event(
    'changisha_consent_captured',
    'changisha.contributor_consents',
    v_consent_id,
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'method', p_method,
      'consents_to_contact', p_consents_to_contact
    )
  );

  RETURN QUERY SELECT v_consent_id, NULL::TEXT;

END;
$$;

GRANT EXECUTE ON FUNCTION changisha.capture_contributor_consent(BIGINT, TEXT, BOOLEAN, BOOLEAN, TEXT, INET, TEXT) TO authenticated;

-- ============================================================================
-- RPC: bulk_import_pledges
-- Idempotent bulk import of pledges from CSV
-- [INVARIANT A5] Bulk import is idempotent
-- ============================================================================
CREATE OR REPLACE FUNCTION changisha.bulk_import_pledges(
  p_campaign_id BIGINT,
  p_pledges JSONB
)
RETURNS TABLE (
  success INT,
  failed INT,
  errors JSONB
)
SECURITY DEFINER
SET search_path = public, changisha, core
LANGUAGE plpgsql
AS $$
DECLARE
  v_pledge JSONB;
  v_success INT := 0;
  v_failed INT := 0;
  v_errors JSONB := '[]'::JSONB;
  v_result RECORD;
  v_idx INT;
BEGIN
  IF NOT JSONB_IS_ARRAY(p_pledges) THEN
    RETURN QUERY SELECT 0, 1, JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('error', 'Pledges must be an array'));
    RETURN;
  END IF;

  -- Iterate through each pledge
  FOR v_idx IN 0..JSONB_ARRAY_LENGTH(p_pledges) - 1 LOOP
    v_pledge := p_pledges -> v_idx;

    BEGIN
      SELECT * INTO v_result FROM changisha.create_pledge(
        p_campaign_id,
        (v_pledge->>'pledger_id')::BIGINT,
        v_pledge->>'pledger_name',
        v_pledge->>'pledger_phone',
        (v_pledge->>'pledged_amount')::NUMERIC,
        (v_pledge->>'due_date')::TIMESTAMPTZ,
        (v_pledge->>'is_public')::BOOLEAN,
        (v_pledge->>'consent_to_contact')::BOOLEAN
      );

      IF v_result.error_message IS NULL THEN
        v_success := v_success + 1;
      ELSE
        v_failed := v_failed + 1;
        v_errors := JSONB_ARRAY_APPEND(
          v_errors,
          JSONB_BUILD_OBJECT(
            'row', v_idx,
            'phone', v_pledge->>'pledger_phone',
            'error', v_result.error_message
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := JSONB_ARRAY_APPEND(
        v_errors,
        JSONB_BUILD_OBJECT(
          'row', v_idx,
          'phone', v_pledge->>'pledger_phone',
          'error', SQLERRM
        )
      );
    END;
  END LOOP;

  -- Audit log
  PERFORM core.log_audit_event(
    'changisha_bulk_import_pledges',
    'changisha.campaigns',
    p_campaign_id,
    JSONB_BUILD_OBJECT(
      'success', v_success,
      'failed', v_failed,
      'total', v_success + v_failed
    )
  );

  RETURN QUERY SELECT v_success, v_failed, v_errors;

END;
$$;

GRANT EXECUTE ON FUNCTION changisha.bulk_import_pledges(BIGINT, JSONB) TO authenticated;

-- ============================================================================
-- END PHASE 2 RPCs
-- ============================================================================
