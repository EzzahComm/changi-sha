import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Changisha Phase 1 Test Suite
 *
 * Tests for:
 * - Invariant R5: Contributions from Daraja callbacks only
 * - Invariant C2: trans_id uniqueness
 * - Invariant R12: Replay detection
 * - Invariant I7: MSISDN normalization
 * - Invariant R6: Pledge matching
 * - Invariant R8: No over-allocation
 * - Invariant A6: Audit logging
 * - Invariant R7: Exception for unmatched pledges
 */

describe('Changisha Phase 1: Contribution Ledger', () => {
  let campaignId: number;
  let pledgeId: number;
  let tenantId: number;

  beforeEach(async () => {
    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('orgs')
      .insert({
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      throw tenantError;
    }

    tenantId = tenant.id;

    // Create collection instrument
    const { data: instrument, error: instrumentError } = await supabase
      .from('changisha_collection_instruments')
      .insert({
        tenant_id: tenantId,
        instrument_type: 'paybill',
        account_reference: 'TEST123',
        display_name: 'Test Paybill',
        holder_name: 'Test Organization',
      })
      .select()
      .single();

    if (instrumentError) {
      throw instrumentError;
    }

    // Create test campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('changisha_campaigns')
      .insert({
        tenant_id: tenantId,
        slug: `campaign-${Date.now()}`,
        title: 'Test Campaign',
        narrative: 'Test fundraising campaign',
        target_amount: 10000,
        ref_prefix: 'TST',
        opens_at: new Date().toISOString(),
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 1,
        collection_instrument_id: instrument.id,
        status: 'open',
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      throw campaignError;
    }

    campaignId = campaign.id;

    // Create pledge
    const { data: pledge, error: pledgeError } = await supabase
      .from('changisha_pledges')
      .insert({
        campaign_id: campaignId,
        pledger_name: 'John Doe',
        pledger_phone: '254712345678',
        pledged_amount: 1000,
        consent_to_contact: true,
      })
      .select()
      .single();

    if (pledgeError) {
      throw pledgeError;
    }

    pledgeId = pledge.id;
  });

  afterEach(async () => {
    // Cleanup: delete campaign (cascades to all related records)
    if (campaignId) {
      await supabase
        .from('changisha_campaigns')
        .delete()
        .eq('id', campaignId);
    }

    if (tenantId) {
      await supabase
        .from('orgs')
        .delete()
        .eq('id', tenantId);
    }
  });

  describe('Invariant R5: Contributions from Daraja callbacks only', () => {
    it('should create contribution from valid RPC call', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_TRANS_001',
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          Result: { TransactionID: 'TEST_TRANS_001', ResultCode: 0 },
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      const result = data[0];
      expect(result.success).toBe(true);
      expect(result.contribution_id).toBeDefined();
      expect(result.contribution_id).toBeGreaterThan(0);
    });
  });

  describe('Invariant C2: trans_id uniqueness', () => {
    it('should prevent duplicate trans_id on second insert', async () => {
      const transId = 'TEST_TRANS_UNIQUE';

      // First call
      const { error: error1 } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: transId,
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error1).toBeNull();

      // Verify only one contribution exists
      const { data: contributions1 } = await supabase
        .from('changisha_contributions')
        .select('*')
        .eq('trans_id', transId);

      expect(contributions1).toHaveLength(1);

      // Second call with same trans_id should be idempotent
      const { data: data2, error: error2 } = await supabase.rpc(
        'process_contribution',
        {
          p_campaign_id: campaignId,
          p_trans_id: transId,
          p_initiator_msisdn: '0712345678',
          p_initiator_name: 'Test User',
          p_amount: 500,
          p_payload: {
            AccountReference: 'TST0000001',
            MSISDN: '254712345678',
          },
        }
      );

      expect(error2).toBeNull();
      expect(data2[0].success).toBe(true);

      // Still only one contribution
      const { data: contributions2 } = await supabase
        .from('changisha_contributions')
        .select('*')
        .eq('trans_id', transId);

      expect(contributions2).toHaveLength(1);
    });
  });

  describe('Invariant R12: Replay detection', () => {
    it('should handle replayed callbacks idempotently', async () => {
      const transId = 'TEST_REPLAY_ID';

      // First callback
      const result1 = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: transId,
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(result1.error).toBeNull();
      const contributionId1 = result1.data[0].contribution_id;

      // Second callback (replay)
      const result2 = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: transId,
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(result2.error).toBeNull();
      const contributionId2 = result2.data[0].contribution_id;

      // Should return same contribution ID (idempotent)
      expect(contributionId1).toBe(contributionId2);

      // Verify only one contribution exists
      const { data: contributions } = await supabase
        .from('changisha_contributions')
        .select('*')
        .eq('trans_id', transId);

      expect(contributions).toHaveLength(1);
    });
  });

  describe('Invariant I7: MSISDN normalization', () => {
    it('should normalize 07x format to 254x format', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_PHONE_NORM',
        p_initiator_msisdn: '0712345678', // Local format
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);

      // Verify phone was stored normalized
      const contributionId = data[0].contribution_id;
      const { data: contribution } = await supabase
        .from('changisha_contributions')
        .select('initiator_msisdn')
        .eq('id', contributionId)
        .single();

      expect(contribution.initiator_msisdn).toBe('254712345678');
    });

    it('should accept already-normalized 254x format', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_PHONE_254',
        p_initiator_msisdn: '254712345678', // Already normalized
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);

      // Verify phone stored as-is
      const contributionId = data[0].contribution_id;
      const { data: contribution } = await supabase
        .from('changisha_contributions')
        .select('initiator_msisdn')
        .eq('id', contributionId)
        .single();

      expect(contribution.initiator_msisdn).toBe('254712345678');
    });
  });

  describe('Invariant R6: Pledge matching', () => {
    it('should match contribution to pledge via phone', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_MATCH_PLEDGE',
        p_initiator_msisdn: '0712345678', // Same as pledge
        p_initiator_name: 'John Doe',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
      expect(data[0].pledge_id).toBe(pledgeId);
      expect(data[0].allocated_amount).toBe(500);
    });
  });

  describe('Invariant R8: No over-allocation', () => {
    it('should cap allocation at pledged amount', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_OVER_ALLOCATE',
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'John Doe',
        p_amount: 5000, // Greater than pledge of 1000
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
      expect(data[0].allocated_amount).toBe(1000); // Capped at pledge amount
    });
  });

  describe('Invariant A6: Audit logging', () => {
    it('should log all contributions to audit_events', async () => {
      const { data } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_AUDIT_LOG',
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254712345678',
        },
      });

      expect(data[0].success).toBe(true);
      const contributionId = data[0].contribution_id;

      // Verify audit entry exists
      const { data: audit } = await supabase
        .from('core_audit_events')
        .select('*')
        .eq('resource_type', 'changisha.contributions')
        .eq('resource_id', contributionId);

      expect(audit).toBeDefined();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].event_type).toBe('changisha_contribution_processed');
    });
  });

  describe('Invariant R7: Exception for unmatched pledges', () => {
    it('should create exception when no pledge found', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_UNMATCHED_PLEDGE',
        p_initiator_msisdn: '0798765432', // Different phone, no pledge
        p_initiator_name: 'Unknown User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: '254798765432',
        },
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
      expect(data[0].exception_id).toBeDefined();

      // Verify exception record
      const { data: exception } = await supabase
        .from('changisha_exceptions')
        .select('*')
        .eq('id', data[0].exception_id)
        .single();

      expect(exception).toBeDefined();
      expect(exception.exception_type).toBe('unmatched_msisdn');
      expect(exception.status).toBe('open');
    });
  });

  describe('Error handling', () => {
    it('should reject invalid AccountReference (> 12 chars)', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_INVALID_REF',
        p_initiator_msisdn: '0712345678',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'THISISTOOLONGFORTHISFIELDHERE', // > 12 chars
          MSISDN: '254712345678',
        },
      });

      expect(data[0].success).toBe(false);
      expect(data[0].error_message).toContain('Invalid AccountReference');
    });

    it('should reject invalid MSISDN', async () => {
      const { data, error } = await supabase.rpc('process_contribution', {
        p_campaign_id: campaignId,
        p_trans_id: 'TEST_INVALID_MSISDN',
        p_initiator_msisdn: 'invalid-phone',
        p_initiator_name: 'Test User',
        p_amount: 500,
        p_payload: {
          AccountReference: 'TST0000001',
          MSISDN: 'invalid-phone',
        },
      });

      expect(data[0].success).toBe(false);
      expect(data[0].error_message).toContain('Invalid MSISDN');
    });
  });
});
