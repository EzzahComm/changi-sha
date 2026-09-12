-- Changisha RPC: process_contribution
-- The single entry point for Daraja C2B callbacks
-- Handles replay detection, pledge matching, exception creation, and audit logging

CREATE OR REPLACE FUNCTION changisha.process_contribution(
  p_campaign_id BIGINT,
  p_trans_id TEXT,
  p_initiator_msisdn TEXT,
  p_initiator_name TEXT,
  p_amount NUMERIC,
  p_payload JSONB,
  p_checkout_request_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  contribution_id BIGINT,
  reference_code TEXT,
  pledge_id BIGINT,
  allocated_amount NUMERIC,
  exception_id BIGINT,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public, changisha, core
LANGUAGE plpgsql
AS $$
DECLARE
  v_contribution_id BIGINT;
  v_reference_code TEXT;
  v_pledge_id BIGINT;
  v_allocated_amount NUMERIC;
  v_exception_id BIGINT;
  v_is_replay BOOLEAN;
  v_account_reference TEXT;
  v_campaign_exists BOOLEAN;
  v_tenant_id BIGINT;
  v_phone_normalized TEXT;
  v_error_msg TEXT := NULL;
  v_pledge_amount NUMERIC;
BEGIN
  -- [INVARIANT R5] Contribution MUST come from confirmed Daraja callback
  -- [INVARIANT C2] trans_id MUST be unique
  -- [INVARIANT I7] Initiator MSISDN MUST be normalized

  -- 1. Validate campaign exists and is open
  BEGIN
    SELECT id, tenant_id INTO v_campaign_id, v_tenant_id
    FROM changisha.campaigns
    WHERE id = p_campaign_id
    AND status = 'open'
    AND now() BETWEEN opens_at AND closes_at;

    IF v_campaign_id IS NULL THEN
      v_error_msg := 'Campaign not found or not open';
      RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Campaign lookup failed: ' || SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END;

  -- 2. Extract AccountReference from payload
  -- [INVARIANT R4] AccountReference MUST be <= 12 chars
  v_account_reference := p_payload->>'AccountReference';

  IF v_account_reference IS NULL OR char_length(v_account_reference) > 12 THEN
    v_error_msg := 'Invalid AccountReference: ' || COALESCE(v_account_reference, 'NULL');
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END IF;

  -- 3. Normalize MSISDN
  -- [INVARIANT I7] Phone normalization: convert 07xx to 254xx format
  v_phone_normalized := p_initiator_msisdn;
  IF v_phone_normalized LIKE '07%' THEN
    v_phone_normalized := '254' || substring(v_phone_normalized, 2);
  ELSIF v_phone_normalized LIKE '+2547%' THEN
    v_phone_normalized := substring(v_phone_normalized, 2);
  END IF;

  -- Validate normalized format
  IF v_phone_normalized !~ '^254[0-9]{9}$' THEN
    v_error_msg := 'Invalid MSISDN after normalization: ' || v_phone_normalized;
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END IF;

  -- 4. Detect replay
  -- [INVARIANT R12] Replayed callbacks MUST be idempotent, no new contribution
  SELECT is_replay, id INTO v_is_replay, v_contribution_id
  FROM changisha.payment_events
  WHERE trans_id = p_trans_id;

  IF v_is_replay IS NOT NULL AND v_is_replay = TRUE THEN
    -- Callback already processed; return existing contribution
    SELECT id, reference_code, pledge_id
    INTO v_contribution_id, v_reference_code, v_pledge_id
    FROM changisha.contributions
    WHERE trans_id = p_trans_id;

    PERFORM core.log_audit_event(
      'changisha_contribution_replayed',
      'changisha.contributions',
      v_contribution_id,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'trans_id', p_trans_id,
        'amount', p_amount
      )
    );

    RETURN QUERY SELECT TRUE, v_contribution_id, v_reference_code, v_pledge_id, NULL::NUMERIC, NULL::BIGINT, 'Replay detected (idempotent)';
    RETURN;
  END IF;

  -- 5. Create payment_events record (atomically)
  -- [INVARIANT C1] Raw payload stored before contribution created
  BEGIN
    INSERT INTO changisha.payment_events (trans_id, payload, processed_at)
    VALUES (p_trans_id, p_payload, now())
    ON CONFLICT (trans_id) DO UPDATE
    SET is_replay = TRUE, updated_at = now();
  EXCEPTION WHEN UNIQUE_VIOLATION THEN
    -- Another process inserted this trans_id between our check and insert
    SELECT is_replay INTO v_is_replay
    FROM changisha.payment_events
    WHERE trans_id = p_trans_id;

    IF v_is_replay = TRUE THEN
      -- It's a replay; return existing contribution
      SELECT id, reference_code, pledge_id
      INTO v_contribution_id, v_reference_code, v_pledge_id
      FROM changisha.contributions
      WHERE trans_id = p_trans_id;

      RETURN QUERY SELECT TRUE, v_contribution_id, v_reference_code, v_pledge_id, NULL::NUMERIC, NULL::BIGINT, 'Concurrent replay detected';
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'payment_events insert failed: ' || SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END;

  -- 6. Create contribution record (immutable)
  -- [INVARIANT C3] Contributions are immutable; only INSERT allowed
  BEGIN
    INSERT INTO changisha.contributions (
      campaign_id,
      pledge_id,
      trans_id,
      initiator_msisdn,
      initiator_name,
      amount,
      reference_code,
      checkout_request_id,
      received_at,
      allocation_status
    )
    VALUES (
      p_campaign_id,
      NULL,  -- Will be populated by pledge matching
      p_trans_id,
      v_phone_normalized,
      p_initiator_name,
      p_amount,
      v_account_reference,
      p_checkout_request_id,
      now(),
      'unallocated'
    )
    RETURNING id, reference_code INTO v_contribution_id, v_reference_code;
  EXCEPTION WHEN UNIQUE_VIOLATION THEN
    v_error_msg := 'Contribution trans_id already exists: ' || p_trans_id;
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Contribution insert failed: ' || SQLERRM;
    RETURN QUERY SELECT FALSE, NULL::BIGINT, NULL::TEXT, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END;

  -- 7. Match contribution to pledge via phone
  -- [INVARIANT R6] Pledge matching MUST use phone, not amount heuristics
  BEGIN
    SELECT id, pledged_amount
    INTO v_pledge_id, v_pledge_amount
    FROM changisha.pledges
    WHERE campaign_id = p_campaign_id
    AND pledger_phone = v_phone_normalized
    LIMIT 1;

    IF v_pledge_id IS NOT NULL THEN
      -- [INVARIANT R8] Do not over-allocate
      v_allocated_amount := LEAST(p_amount, v_pledge_amount);

      -- Create allocation record
      INSERT INTO changisha.allocations (
        contribution_id,
        campaign_id,
        pledge_id,
        allocated_amount,
        match_method
      )
      VALUES (
        v_contribution_id,
        p_campaign_id,
        v_pledge_id,
        v_allocated_amount,
        'reference'
      );

      -- Update contribution to mark as allocated
      UPDATE changisha.contributions
      SET pledge_id = v_pledge_id, allocation_status = 'allocated'
      WHERE id = v_contribution_id;
    ELSE
      -- No matching pledge; create exception
      -- [INVARIANT R7] Unmatched phone → exception
      INSERT INTO changisha.exceptions (
        campaign_id,
        contribution_id,
        exception_type,
        severity,
        description,
        suggested_action
      )
      VALUES (
        p_campaign_id,
        v_contribution_id,
        'unmatched_msisdn',
        'warning',
        'No pledge found for phone: ' || v_phone_normalized || ' in campaign ' || p_campaign_id,
        'Manually allocate to pledge via admin workbench'
      )
      RETURNING id INTO v_exception_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_error_msg := 'Pledge matching failed: ' || SQLERRM;
    RETURN QUERY SELECT FALSE, v_contribution_id, v_reference_code, NULL::BIGINT, NULL::NUMERIC, NULL::BIGINT, v_error_msg;
    RETURN;
  END;

  -- 8. Emit audit log entry
  -- [INVARIANT A6] All state changes audited
  BEGIN
    PERFORM core.log_audit_event(
      'changisha_contribution_processed',
      'changisha.contributions',
      v_contribution_id,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'amount', p_amount,
        'trans_id', p_trans_id,
        'reference_code', v_account_reference,
        'pledge_id', v_pledge_id,
        'allocated_amount', v_allocated_amount,
        'exception_id', v_exception_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log failure but don't fail the whole transaction
    RAISE WARNING 'Audit log failed: %', SQLERRM;
  END;

  -- 9. Queue SMS receipt (non-blocking via notify)
  -- [INVARIANT S1] SMS dispatch via shared dispatcher
  BEGIN
    PERFORM pg_notify(
      'changisha_sms_queue',
      jsonb_build_object(
        'event', 'contribution_receipt',
        'contribution_id', v_contribution_id,
        'phone', v_phone_normalized,
        'amount', p_amount,
        'campaign_id', p_campaign_id
      )::TEXT
    );
  EXCEPTION WHEN OTHERS THEN
    -- SMS queueing failure is not fatal; log it but continue
    RAISE WARNING 'SMS queue failed: %', SQLERRM;
  END;

  -- 10. Success response
  RETURN QUERY SELECT
    TRUE,
    v_contribution_id,
    v_reference_code,
    v_pledge_id,
    v_allocated_amount,
    v_exception_id,
    NULL::TEXT;

END;
$$;

-- Grant SECURITY DEFINER call to authenticated users
GRANT EXECUTE ON FUNCTION changisha.process_contribution(BIGINT, TEXT, TEXT, TEXT, NUMERIC, JSONB, TEXT) TO authenticated;
