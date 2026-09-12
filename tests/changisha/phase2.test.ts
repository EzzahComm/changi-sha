import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Changisha Phase 2 Test Suite: Pledge & Notification
 */
describe('Changisha Phase 2: Pledge & Notification', () => {
  let campaignId: number;

  beforeEach(async () => {
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: 1,
        slug: `phase2-${Date.now()}`,
        title: 'Phase 2 Test',
        narrative: 'Test',
        target_amount: 10000,
        ref_prefix: 'P2T',
        opens_at: new Date().toISOString(),
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 1,
        collection_instrument_id: 1,
        status: 'open',
      })
      .select()
      .single();

    campaignId = campaign.id;
  });

  afterEach(async () => {
    if (campaignId) {
      await supabase.from('campaigns').delete().eq('id', campaignId);
    }
  });

  describe('Invariant P1: Pledge creation', () => {
    it('should create pledge with amount and phone', async () => {
      const { data, error } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: '0712345678',
        p_pledged_amount: 2000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      expect(error).toBeNull();
      expect(data[0].pledge_id).toBeDefined();
      expect(data[0].phone_normalized).toBe('254712345678');
    });
  });

  describe('Invariant P2: Phone uniqueness', () => {
    it('should prevent duplicate pledges from same phone', async () => {
      const phone = '0712345678';

      // First pledge
      await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: phone,
        p_pledged_amount: 2000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      // Second pledge (should fail)
      const { data } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: phone,
        p_pledged_amount: 3000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      expect(data[0].error_message).toBeDefined();
    });
  });

  describe('Invariant P3: Non-member consent requirement', () => {
    it('should reject pledge without consent for non-member', async () => {
      const { data } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: '0712345678',
        p_pledged_amount: 2000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: false, // No consent
      });

      expect(data[0].error_message).toMatch(/consent/i);
    });
  });

  describe('Invariant P4: Pledge status computation', () => {
    it('should compute status as pending initially', async () => {
      const { data: pledgeResult } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: '0712345678',
        p_pledged_amount: 2000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      const { data: statusResult } = await supabase.rpc('compute_pledge_status', {
        p_pledge_id: pledgeResult[0].pledge_id,
      });

      expect(statusResult[0].status).toBe('pending');
      expect(statusResult[0].is_fulfilled).toBe(false);
    });
  });

  describe('Invariant D1: Consent required before SMS', () => {
    it('should capture consent with method and metadata', async () => {
      const { data: pledgeResult } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Jane Doe',
        p_pledger_phone: '0712345678',
        p_pledged_amount: 2000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      const { data: consentResult } = await supabase.rpc(
        'capture_contributor_consent',
        {
          p_campaign_id: campaignId,
          p_phone_normalized: pledgeResult[0].phone_normalized,
          p_consents_to_contact: true,
          p_consents_to_data_processing: true,
          p_method: 'web_form',
          p_ip_address: '192.168.1.1',
          p_user_agent: 'Mozilla/5.0',
        }
      );

      const { data: consent } = await supabase
        .from('contributor_consents')
        .select('*')
        .eq('id', consentResult[0].consent_id)
        .single();

      expect(consent.consent_method).toBe('web_form');
      expect(consent.consent_ip_address).toBe('192.168.1.1');
      expect(consent.consent_timestamp).toBeDefined();
      expect(consent.consent_expires_at).toBeDefined();
    });
  });

  describe('Invariant A5: Bulk import idempotence', () => {
    it('should handle bulk import without duplicates on retry', async () => {
      const pledges = [
        {
          pledger_name: 'User 1',
          pledger_phone: '0701111111',
          pledged_amount: 1000,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          consent_to_contact: true,
        },
        {
          pledger_name: 'User 2',
          pledger_phone: '0702222222',
          pledged_amount: 2000,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          consent_to_contact: true,
        },
      ];

      // First import
      const result1 = await supabase.rpc('bulk_import_pledges', {
        p_campaign_id: campaignId,
        p_pledges: pledges,
      });

      expect(result1.data[0].success).toBe(2);
      expect(result1.data[0].failed).toBe(0);

      // Second import (should fail gracefully - duplicates)
      const result2 = await supabase.rpc('bulk_import_pledges', {
        p_campaign_id: campaignId,
        p_pledges: pledges,
      });

      expect(result2.data[0].failed).toBe(2); // Both duplicate
    });
  });

  describe('Phone normalization', () => {
    it('should normalize 07x format to 254x', async () => {
      const { data, error } = await supabase.rpc('create_pledge', {
        p_campaign_id: campaignId,
        p_pledger_id: null,
        p_pledger_name: 'Test User',
        p_pledger_phone: '0798765432',
        p_pledged_amount: 1000,
        p_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_is_public: false,
        p_consent_to_contact: true,
      });

      expect(error).toBeNull();
      expect(data[0].phone_normalized).toBe('254798765432');
    });
  });
});
