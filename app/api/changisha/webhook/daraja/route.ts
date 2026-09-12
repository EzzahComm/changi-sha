/**
 * Daraja C2B Webhook Handler for Changisha
 *
 * Path: /api/changisha/webhook/daraja
 * Method: POST
 *
 * [INVARIANT R5] Contributions created only from confirmed Daraja callbacks
 * [INVARIANT C2] trans_id MUST be unique; replay detection enforced
 * [INVARIANT I7] MSISDN normalized on receipt
 * [INVARIANT R3] reference_code format: [ref_prefix][zero_padded_sequence]
 *
 * Payload structure from Daraja C2B:
 * {
 *   "Result": {
 *     "ResultCode": 0,
 *     "ResultDesc": "The service request has been processed successfully.",
 *     "OriginatorConversationID": "16922-1700000000-1",
 *     "ConversationID": "AN23-1700000000-XXXXX",
 *     "TransactionID": "RD2K23E6SJ3", // <-- trans_id (unique)
 *     "ResultParameters": {
 *       "ResultParameter": [
 *         {
 *           "Key": "DebitAccountBalance",
 *           "Value": "100000"
 *         },
 *         ...
 *       ]
 *     }
 *   }
 * }
 *
 * AND also the C2B callback with AccountReference and MSISDN.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Initialize Supabase client lazily to avoid build-time environment variable requirements
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
    );
  }

  return createClient(url, key);
}

/**
 * Type definitions for Daraja callback payload
 */
interface DarajaResult {
  ResultCode: number;
  ResultDesc?: string;
  TransactionID: string;
  OriginatorConversationID?: string;
  ConversationID?: string;
}

interface DarajaPayload {
  Result: DarajaResult;
  MSISDN?: string;
  PhoneNumber?: string;
  TransAmount?: string;
  Amount?: string;
  AccountReference?: string;
  CheckoutRequestID?: string;
  [key: string]: any;
}

interface ProcessContributionResponse {
  success: boolean;
  contribution_id: number | null;
  reference_code: string | null;
  pledge_id: number | null;
  allocated_amount: number | null;
  exception_id: number | null;
  error_message: string | null;
}

/**
 * Validate Daraja callback signature
 * [SECURITY] MUST verify HMAC-SHA256 signature before processing
 *
 * @param payload The parsed JSON payload
 * @param signature The signature from request header
 * @returns true if signature is valid, false otherwise
 */
function validateDarajaSignature(
  payload: any,
  signature: string | null
): boolean {
  if (!signature) {
    console.error("[Changisha Webhook] Missing signature header");
    return false;
  }

  const secretKey = process.env.DARAJA_SECRET_KEY;
  if (!secretKey) {
    console.error("[Changisha Webhook] DARAJA_SECRET_KEY not configured");
    return false;
  }

  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payloadString)
    .digest("hex");

  const isValid = signature === expectedSignature;
  if (!isValid) {
    console.error("[Changisha Webhook] Signature mismatch", {
      provided: signature.substring(0, 8) + "...",
      expected: expectedSignature.substring(0, 8) + "...",
    });
  }

  return isValid;
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON payload
    const payload: DarajaPayload = await request.json();

    // Log receipt (without sensitive data)
    console.log("[Changisha Webhook] Received Daraja callback:", {
      trans_id: payload.Result?.TransactionID,
      timestamp: new Date().toISOString(),
      result_code: payload.Result?.ResultCode,
    });

    // 2. Validate Daraja callback signature
    // [SECURITY] Signature validation MUST pass before processing
    const signature = request.headers.get("x-daraja-signature");
    const isSignatureValid = validateDarajaSignature(payload, signature);

    if (!isSignatureValid) {
      console.error("[Changisha Webhook] Invalid signature - rejecting callback");
      return NextResponse.json(
        { error: "Invalid signature", status: "rejected" },
        { status: 401 }
      );
    }

    // 3. Extract payload fields
    const transId = payload.Result?.TransactionID;
    const resultCode = payload.Result?.ResultCode;
    const msisdn = payload.MSISDN || payload.PhoneNumber;
    const amount = payload.TransAmount || payload.Amount;
    const accountReference = payload.AccountReference;

    // Validate required fields
    if (!transId || resultCode === undefined || !msisdn || !amount) {
      console.error("[Changisha Webhook] Missing required fields", {
        transId: !!transId,
        resultCode: resultCode !== undefined,
        msisdn: !!msisdn,
        amount: !!amount,
      });
      return NextResponse.json(
        { error: "Missing required fields", status: "invalid" },
        { status: 400 }
      );
    }

    // [INVARIANT R2] Only process successful result codes
    // Daraja uses ResultCode 0 for success
    if (resultCode !== 0) {
      console.warn("[Changisha Webhook] Non-zero result code, not processing", {
        trans_id: transId,
        result_code: resultCode,
      });
      // Still return 200 to acknowledge receipt
      return NextResponse.json(
        {
          status: "skipped",
          trans_id: transId,
          reason: `Non-zero result code: ${resultCode}`,
        },
        { status: 200 }
      );
    }

    // 4. Extract campaign_id from request context
    // [DESIGN NOTE] campaign_id should come from:
    // - x-campaign-id header (for system-initiated calls)
    // - AccountReference parsing (production: reference_code contains campaign context)
    // For Phase 1, accept both methods
    let campaignId: number | null = null;

    // Try header first
    const campaignIdHeader = request.headers.get("x-campaign-id");
    if (campaignIdHeader) {
      campaignId = parseInt(campaignIdHeader, 10);
    }

    // TODO: Phase 2 - Parse campaign_id from reference_code format
    // reference_code format: [ref_prefix][zero_padded_sequence]
    // Need to reverse-lookup campaign by ref_prefix

    if (!campaignId || isNaN(campaignId)) {
      console.error("[Changisha Webhook] No valid campaign_id provided", {
        trans_id: transId,
        header: campaignIdHeader,
      });
      return NextResponse.json(
        { error: "Missing campaign_id", status: "invalid" },
        { status: 400 }
      );
    }

    // 5. Call Changisha RPC: process_contribution()
    // [INVARIANT C1] RPC is the single entry point for contribution processing
    console.log("[Changisha Webhook] Calling process_contribution RPC", {
      campaign_id: campaignId,
      trans_id: transId,
      amount: parseFloat(amount),
    });

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("process_contribution", {
      p_campaign_id: campaignId,
      p_trans_id: transId,
      p_initiator_msisdn: msisdn,
      p_initiator_name: payload.Names || payload.FirstName || "Unknown",
      p_amount: parseFloat(amount),
      p_payload: payload,
      p_checkout_request_id: payload.CheckoutRequestID || null,
    });

    if (error) {
      console.error("[Changisha Webhook] RPC error:", {
        trans_id: transId,
        error: error.message,
        code: error.code,
      });

      // Return 200 to Daraja (will retry on 5xx)
      // but provide error details for debugging
      return NextResponse.json(
        {
          status: "error",
          trans_id: transId,
          message: error.message,
          code: error.code,
        },
        { status: 200 } // Always 200 to Daraja
      );
    }

    // Parse response (RPC returns array or single object)
    const result: ProcessContributionResponse = Array.isArray(data)
      ? data[0]
      : data;

    if (result.success) {
      console.log("[Changisha Webhook] Contribution processed successfully", {
        contribution_id: result.contribution_id,
        reference_code: result.reference_code,
        pledge_id: result.pledge_id,
        allocated_amount: result.allocated_amount,
        trans_id: transId,
      });

      // SMS dispatch will be queued via RPC notification
      // No need to wait for it here; SMS is async
    } else {
      console.error("[Changisha Webhook] RPC returned success=false", {
        trans_id: transId,
        error: result.error_message,
        contribution_id: result.contribution_id,
      });
    }

    // 6. Always return 200 to Daraja
    // [IDEMPOTENT] Daraja may retry; return 200 regardless of outcome
    return NextResponse.json(
      {
        status: "received",
        trans_id: transId,
        contribution_id: result.contribution_id,
        success: result.success,
        message: result.error_message || "Contribution processed",
      },
      { status: 200 }
    );

  } catch (error) {
    // Catch unexpected errors
    console.error("[Changisha Webhook] Unexpected error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 200 to prevent Daraja retry loop
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: "healthy",
      endpoint: "/api/changisha/webhook/daraja",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
