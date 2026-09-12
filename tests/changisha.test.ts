/**
 * CHANGISHA Phase 1 Unit Tests
 *
 * Tests for core Daraja webhook handler, contribution creation RPC,
 * exception queue, and audit logging
 *
 * Coverage:
 * - Invariant R5: Contributions from Daraja callbacks only
 * - Invariant C2: trans_id uniqueness
 * - Invariant I7: MSISDN normalization
 * - Invariant R12: Replay detection
 * - Invariant R6: Pledge matching
 * - Invariant R8: No over-allocation
 * - Invariant A6: Audit logging
 * - Invariant R7: Exception handling
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for testing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Test data fixtures
const TEST_TENANT_ID = 1; // Assumes test tenant exists
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"; // Test user UUID

interface TestCampaign {
  id: number;
  title: string;
  slug: string;
}

interface TestPledge {
  id: number;
  campaign_id: number;
  pledger_phone: string;
  pledged_amount: number;
}

let testCampaign: TestCampaign;
let testPledge: TestPledge;

/**
 * Setup: Create test campaign and collection instrument
 */
beforeEach(async () => {
  // Create test collection instrument
  const { data: instrument, error: instrumentError } = await supabase
    .from("collection_instruments")
    .insert({
      tenant_id: TEST_TENANT_ID,
      instrument_type: "paybill",
      account_reference: "TEST1234",
      display_name: "Test Paybill",
      holder_name: "Test Org",
    })
    .select()
    .single();

  if (instrumentError) {
    console.error("Failed to create test instrument:", instrumentError);
  }

  const instrumentId = instrument?.id || 1;

  // Create test campaign
  const now = new Date();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      tenant_id: TEST_TENANT_ID,
      slug: `test_campaign_${Date.now()}`,
      title: "Test Campaign",
      narrative: "Test campaign for unit testing",
      target_amount: "10000.00",
      currency_code: "KES",
      ref_prefix: "TST",
      collection_instrument_id: instrumentId,
      opens_at: now.toISOString(),
      closes_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: TEST_USER_ID,
      status: "open",
    })
    .select()
    .single();

  if (campaignError) {
    throw new Error(`Failed to create test campaign: ${campaignError.message}`);
  }

  testCampaign = campaign as TestCampaign;

  // Create test pledge
  const { data: pledge, error: pledgeError } = await supabase
    .from("pledges")
    .insert({
      campaign_id: testCampaign.id,
      pledger_name: "John Doe",
      pledger_phone: "254712345678",
      pledged_amount: "1000.00",
      consent_to_contact: true,
      consent_timestamp: now.toISOString(),
    })
    .select()
    .single();

  if (pledgeError) {
    throw new Error(`Failed to create test pledge: ${pledgeError.message}`);
  }

  testPledge = pledge as TestPledge;
});

/**
 * Cleanup: Remove test data
 */
afterEach(async () => {
  // Delete test data (cascades should handle related records)
  if (testCampaign?.id) {
    await supabase
      .from("campaigns")
      .delete()
      .eq("id", testCampaign.id);
  }
});

// ============================================================================
// Test Suite: Invariant R5 - Contributions from Daraja callbacks only
// ============================================================================
describe("Invariant R5: Contributions created only from Daraja callbacks", () => {
  it("should create contribution from valid RPC call", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_TRANS_${Date.now()}`,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        Result: {
          TransactionID: `TEST_TRANS_${Date.now()}`,
          ResultCode: 0,
        },
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data[0].success).toBe(true);
    expect(data[0].contribution_id).toBeDefined();
  });

  it("should reject contribution with invalid campaign", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: 999999, // Non-existent campaign
      p_trans_id: `TEST_TRANS_${Date.now()}`,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(false);
    expect(data[0].error_message).toContain("Campaign");
  });
});

// ============================================================================
// Test Suite: Invariant C2 - trans_id uniqueness
// ============================================================================
describe("Invariant C2: trans_id MUST be unique", () => {
  it("should prevent duplicate trans_id", async () => {
    const transId = `TEST_DUP_${Date.now()}`;

    // First call
    const result1 = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: transId,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(result1.error).toBeNull();
    expect(result1.data[0].success).toBe(true);

    const contributionId1 = result1.data[0].contribution_id;

    // Second call with same trans_id (should be idempotent, not duplicate)
    const result2 = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: transId,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    // Should be idempotent, not error
    expect(result2.error).toBeNull();
    expect(result2.data[0].success).toBe(true);
    expect(result2.data[0].contribution_id).toBe(contributionId1);

    // Verify only one contribution exists
    const { data: contributions } = await supabase
      .from("contributions")
      .select("*")
      .eq("trans_id", transId);

    expect(contributions).toHaveLength(1);
  });
});

// ============================================================================
// Test Suite: Invariant I7 - MSISDN normalization
// ============================================================================
describe("Invariant I7: MSISDN normalization", () => {
  it("should normalize local format (0XXXXXXXXXX) to 254-prefix", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_PHONE_${Date.now()}`,
      p_initiator_msisdn: "0712345678", // Local format
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "0712345678",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);

    // Verify phone was stored normalized
    const contributionId = data[0].contribution_id;
    const { data: contribution } = await supabase
      .from("contributions")
      .select("initiator_msisdn")
      .eq("id", contributionId)
      .single();

    expect(contribution?.initiator_msisdn).toBe("254712345678");
  });

  it("should handle already-normalized 254-prefix", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_PHONE_254_${Date.now()}`,
      p_initiator_msisdn: "254712345678", // Already 254-prefix
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);

    // Verify phone was stored correctly
    const contributionId = data[0].contribution_id;
    const { data: contribution } = await supabase
      .from("contributions")
      .select("initiator_msisdn")
      .eq("id", contributionId)
      .single();

    expect(contribution?.initiator_msisdn).toBe("254712345678");
  });
});

// ============================================================================
// Test Suite: Invariant R12 - Replay detection
// ============================================================================
describe("Invariant R12: Replay detection", () => {
  it("should handle replayed callbacks idempotently", async () => {
    const transId = `TEST_REPLAY_${Date.now()}`;

    // First callback
    const result1 = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: transId,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    const contributionId1 = result1.data[0].contribution_id;

    // Second callback (replay)
    const result2 = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: transId,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    const contributionId2 = result2.data[0].contribution_id;

    // Should return same contribution ID (idempotent)
    expect(contributionId1).toBe(contributionId2);

    // Verify only one row exists
    const { data: contributions } = await supabase
      .from("contributions")
      .select("*")
      .eq("trans_id", transId);

    expect(contributions).toHaveLength(1);

    // Verify payment_events has replay flag set
    const { data: paymentEvent } = await supabase
      .from("payment_events")
      .select("*")
      .eq("trans_id", transId)
      .single();

    expect(paymentEvent?.is_replay).toBe(true);
  });
});

// ============================================================================
// Test Suite: Invariant R6 - Pledge matching
// ============================================================================
describe("Invariant R6: Pledge matching via phone", () => {
  it("should match contribution to pledge via phone number", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_MATCH_${Date.now()}`,
      p_initiator_msisdn: "0712345678", // Same as pledge
      p_initiator_name: "John Doe",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].pledge_id).toBe(testPledge.id);
    expect(data[0].allocated_amount).toBe(500);
  });

  it("should create exception when no pledge matches", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_NO_MATCH_${Date.now()}`,
      p_initiator_msisdn: "0798765432", // Different phone
      p_initiator_name: "Unknown User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254798765432",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].exception_id).toBeDefined();

    // Verify exception record
    const { data: exception } = await supabase
      .from("exceptions")
      .select("*")
      .eq("id", data[0].exception_id)
      .single();

    expect(exception?.exception_type).toBe("unmatched_msisdn");
    expect(exception?.status).toBe("open");
  });
});

// ============================================================================
// Test Suite: Invariant R8 - No over-allocation
// ============================================================================
describe("Invariant R8: No over-allocation beyond pledge amount", () => {
  it("should cap allocation at pledged amount", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_OVER_${Date.now()}`,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "John Doe",
      p_amount: 5000, // Greater than pledge (1000)
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].allocated_amount).toBe(1000); // Capped at pledge amount
  });
});

// ============================================================================
// Test Suite: Invariant A6 - Audit logging
// ============================================================================
describe("Invariant A6: Audit logging", () => {
  it("should log all contributions to audit_events", async () => {
    const { data } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_AUDIT_${Date.now()}`,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    const contributionId = data[0].contribution_id;

    // Give audit log time to be written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify audit entry exists
    const { data: audit } = await supabase
      .from("audit_events")
      .select("*")
      .eq("resource_type", "changisha.contributions")
      .eq("resource_id", contributionId)
      .limit(1);

    expect(audit && audit.length > 0).toBe(true);
    if (audit && audit.length > 0) {
      expect(audit[0].event_type).toBe("changisha_contribution_processed");
      expect(audit[0].metadata).toBeDefined();
    }
  });
});

// ============================================================================
// Test Suite: Invariant R7 - Exception handling
// ============================================================================
describe("Invariant R7: Exception handling for unmatched pledges", () => {
  it("should create exception when no pledge found", async () => {
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_EXCEPTION_${Date.now()}`,
      p_initiator_msisdn: "0798765432", // Different phone, no pledge
      p_initiator_name: "Unknown User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254798765432",
      },
    });

    expect(error).toBeNull();
    expect(data[0].success).toBe(true);
    expect(data[0].exception_id).toBeDefined();

    // Verify exception record
    const { data: exception } = await supabase
      .from("exceptions")
      .select("*")
      .eq("id", data[0].exception_id)
      .single();

    expect(exception?.exception_type).toBe("unmatched_msisdn");
    expect(exception?.severity).toBe("warning");
    expect(exception?.status).toBe("open");
  });
});

// ============================================================================
// Test Suite: Immutability constraints
// ============================================================================
describe("Contribution immutability", () => {
  it("should store contribution as immutable record", async () => {
    const { data } = await supabase.rpc("process_contribution", {
      p_campaign_id: testCampaign.id,
      p_trans_id: `TEST_IMMUTABLE_${Date.now()}`,
      p_initiator_msisdn: "0712345678",
      p_initiator_name: "Test User",
      p_amount: 500,
      p_payload: {
        AccountReference: "TST0000001",
        MSISDN: "254712345678",
      },
    });

    const contributionId = data[0].contribution_id;

    // Verify initial record
    const { data: contrib1 } = await supabase
      .from("contributions")
      .select("*")
      .eq("id", contributionId)
      .single();

    expect(contrib1?.amount).toBe(500);

    // Try to update (should fail or be disallowed by RLS)
    const { error: updateError } = await supabase
      .from("contributions")
      .update({ amount: 600 })
      .eq("id", contributionId);

    // If update succeeds, verify via a fetch that it matches original
    // (This depends on RLS policy - if RLS allows update, verify it's still 500)
    const { data: contrib2 } = await supabase
      .from("contributions")
      .select("amount")
      .eq("id", contributionId)
      .single();

    expect(contrib2?.amount).toBe(500); // Should remain unchanged
  });
});
