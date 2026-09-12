import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Daraja C2B Webhook Handler for Changisha
 *
 * [INVARIANT R5] Contributions created only from confirmed Daraja callbacks
 * [INVARIANT C2] trans_id MUST be unique; replay detection enforced
 * [INVARIANT I7] MSISDN normalized on receipt
 *
 * Daraja C2B Callback Payload Structure:
 * {
 *   "Result": {
 *     "ResultCode": 0,
 *     "ResultDesc": "The service request has been processed successfully.",
 *     "OriginatorConversationID": "...",
 *     "ConversationID": "...",
 *     "TransactionID": "RD2K23E6SJ3"  // <-- trans_id (unique)
 *   },
 *   "MSISDN": "254712345678",
 *   "TransAmount": "500",
 *   "AccountReference": "HRM0000001",
 *   "MerchantRequestID": "...",
 *   "CheckoutRequestID": "..."
 * }
 */

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Log incoming request
    console.log(`[Daraja Webhook ${requestId}] Received callback`, {
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
    });

    // 1. Parse JSON payload
    const payload = await request.json();

    // 2. Validate Daraja callback signature
    // [SECURITY] Signature validation MUST pass before processing
    const signatureValid = await validateDarajaSignature(payload, request);
    if (!signatureValid) {
      console.error(`[Daraja Webhook ${requestId}] Invalid signature`);
      return NextResponse.json(
        { error: 'Invalid signature', request_id: requestId },
        { status: 401 }
      );
    }

    // 3. Extract payload fields
    const transId = payload.Result?.TransactionID || payload.TransactionID;
    const resultCode = payload.Result?.ResultCode ?? -1;
    const msisdn = payload.MSISDN;
    const amount = payload.TransAmount;
    const accountReference = payload.AccountReference;
    const checkoutRequestId = payload.CheckoutRequestID;

    // Validate required fields
    if (!transId || resultCode === undefined || !msisdn || !amount) {
      console.error(`[Daraja Webhook ${requestId}] Missing required fields`, {
        transId,
        resultCode,
        msisdn,
        amount,
      });
      return NextResponse.json(
        { error: 'Missing required fields', request_id: requestId },
        { status: 400 }
      );
    }

    // Only process successful transactions (ResultCode 0)
    if (resultCode !== 0) {
      console.log(`[Daraja Webhook ${requestId}] Non-zero ResultCode`, {
        transId,
        resultCode,
      });
      return NextResponse.json(
        { status: 'received', resultCode, message: 'Transaction not successful' },
        { status: 200 }
      );
    }

    // 4. Extract campaign_id from request headers or query params
    // In production, this would come from the AccountReference or a separate lookup
    const campaignId = request.headers.get('x-campaign-id')
      ? parseInt(request.headers.get('x-campaign-id')!)
      : null;

    if (!campaignId) {
      console.error(`[Daraja Webhook ${requestId}] No campaign_id provided`);
      return NextResponse.json(
        { error: 'Missing campaign_id', request_id: requestId },
        { status: 400 }
      );
    }

    // 5. Call Changisha RPC: process_contribution()
    // [INVARIANT C1] RPC is the single entry point
    const { data, error } = await supabase.rpc('process_contribution', {
      p_campaign_id: campaignId,
      p_trans_id: transId,
      p_initiator_msisdn: msisdn,
      p_initiator_name: payload.Names || 'Unknown',
      p_amount: parseFloat(amount),
      p_payload: payload,
      p_checkout_request_id: checkoutRequestId || null,
    });

    if (error) {
      console.error(`[Daraja Webhook ${requestId}] RPC error`, {
        transId,
        error: error.message,
        details: error.details,
      });

      // Log the error but return 200 (Daraja will retry on 5xx)
      return NextResponse.json(
        {
          status: 'error',
          request_id: requestId,
          message: error.message,
          trans_id: transId,
        },
        { status: 200 } // Always 200 to Daraja to avoid retries
      );
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result.success) {
      console.log(`[Daraja Webhook ${requestId}] Contribution processed successfully`, {
        contribution_id: result.contribution_id,
        trans_id: transId,
        amount,
        pledge_id: result.pledge_id,
        allocated_amount: result.allocated_amount,
        exception_id: result.exception_id,
        duration_ms: Date.now() - startTime,
      });

      // 6. SMS dispatch will be queued via RPC notification (async)
      // No need to wait for it here; SMS is non-blocking
    } else {
      console.error(`[Daraja Webhook ${requestId}] RPC returned success=false`, {
        trans_id: transId,
        error: result.error_message,
      });
    }

    // 7. Always return 200 to Daraja
    // [IDEMPOTENT] Daraja may retry; return 200 regardless of outcome
    return NextResponse.json(
      {
        status: 'received',
        request_id: requestId,
        trans_id: transId,
        contribution_id: result.contribution_id,
        success: result.success,
        duration_ms: Date.now() - startTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[Daraja Webhook ${requestId}] Unexpected error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: Date.now() - startTime,
    });

    // Return 200 to prevent Daraja retry loop
    return NextResponse.json(
      { error: 'Internal server error', request_id: requestId },
      { status: 200 }
    );
  }
}

/**
 * Validate Daraja callback signature
 * [SECURITY] MUST verify HMAC-SHA256 signature
 *
 * Production: Daraja uses specific signing; this is a placeholder.
 * Verify with Safaricom docs for exact algorithm and header name.
 */
async function validateDarajaSignature(
  payload: any,
  request: NextRequest
): Promise<boolean> {
  // For Phase 1, allow a test-mode bypass via environment variable
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_DARAJA_SIGNATURE !== undefined) {
    console.warn('[Daraja Signature] Bypassed in development');
    return true;
  }

  const signature = request.headers.get('x-daraja-signature') ||
                   request.headers.get('authorization');

  if (!signature) {
    console.error('[Daraja Signature] Missing signature header');
    return false;
  }

  const secretKey = process.env.DARAJA_CONSUMER_SECRET!;
  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadString)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.error('[Daraja Signature] Mismatch', {
      provided: signature.slice(0, 16) + '...',
      expected: expectedSignature.slice(0, 16) + '...',
    });
  }

  return isValid;
}
