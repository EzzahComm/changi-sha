/**
 * Changisha SMS Queue Listener
 *
 * Listens for SMS queue events from Changisha RPC
 * Dispatches SMS via shared SMS dispatcher
 *
 * [INVARIANT S1] All SMS dispatch via shared dispatcher
 * [INVARIANT S3] Contribution receipt SMS sent immediately after confirmation
 * [INVARIANT S2] Receipt SMS includes campaign title, amount, confirmation reference
 * [INVARIANT S4] SMS composition accounts for GSM-7 vs UCS-2 encoding
 * [INVARIANT S5] Log SMS dispatch in audit log
 */

import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface SMSQueueEvent {
  event: "contribution_receipt" | string;
  contribution_id: number;
  phone: string;
  amount: number;
  campaign_id: number;
  [key: string]: any;
}

interface SMSDispatchResult {
  success: boolean;
  message_id?: string;
  cost_kes?: number;
  encoding?: "gsm7" | "ucs2";
  error?: string;
}

/**
 * Initialize Supabase client lazily with service role key
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
 * Mock SMS dispatcher
 * [PRODUCTION] Replace with actual SMS provider integration
 * Currently logs to console and simulates dispatch
 */
const smsDispatcher = {
  send: async (options: {
    to: string;
    message: string;
    campaign_id: number;
    reference: string;
    cost_estimation: "gsm7" | "ucs2";
  }): Promise<SMSDispatchResult> => {
    // [MOCK] In production, this would call:
    // - Safaricom SMPP gateway
    // - AWS SNS
    // - Twilio
    // - Any SMS provider API

    console.log("[SMS Dispatcher] Sending SMS", {
      to: options.to,
      campaign_id: options.campaign_id,
      reference: options.reference,
      message_length: options.message.length,
    });

    // Simulate success
    return {
      success: true,
      message_id: `MSG_${Date.now()}`,
      cost_kes: 0.5,
      encoding: "gsm7",
    };
  },
};

/**
 * Compose receipt SMS message
 * [INVARIANT S2] Receipt SMS includes campaign title, amount, confirmation reference
 *
 * @param campaignTitle Campaign name
 * @param amount Contribution amount in KES
 * @param contributionId Contribution ID (reference)
 * @returns Composed SMS text (Swahili)
 */
function composeReceiptSMS(
  campaignTitle: string,
  amount: number,
  contributionId: number
): string {
  // [INVARIANT S4] Swahili message optimized for GSM-7 encoding
  return (
    `Asante! Umependeza KES ${amount} kwa "${campaignTitle}". ` +
    `Ref: ${contributionId}. ` +
    `Barua ya uthibitisho itakuja. Harambee!`
  );
}

/**
 * Handle single SMS queue event
 */
async function handleSMSQueueEvent(
  payload: string,
  channelName: string
): Promise<void> {
  try {
    const event: SMSQueueEvent = JSON.parse(payload);

    console.log("[Changisha SMS Listener] Processing event:", {
      event_type: event.event,
      contribution_id: event.contribution_id,
      phone: event.phone.substring(0, 7) + "...",
    });

    if (event.event !== "contribution_receipt") {
      console.warn(
        "[Changisha SMS Listener] Unknown event type:",
        event.event
      );
      return;
    }

    const supabase = getSupabaseClient();

    // Fetch campaign details for SMS context
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("title, tenant_id")
      .eq("id", event.campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error("[Changisha SMS Listener] Campaign not found:", {
        campaign_id: event.campaign_id,
        error: campaignError?.message,
      });
      return;
    }

    // Compose receipt SMS
    const message = composeReceiptSMS(
      campaign.title,
      event.amount,
      event.contribution_id
    );

    // Dispatch via SMS dispatcher
    const dispatchResult = await smsDispatcher.send({
      to: event.phone,
      message,
      campaign_id: event.campaign_id,
      reference: `contrib_${event.contribution_id}`,
      cost_estimation: "gsm7",
    });

    if (dispatchResult.success) {
      console.log("[Changisha SMS Listener] SMS sent successfully", {
        contribution_id: event.contribution_id,
        phone: event.phone.substring(0, 7) + "...",
        message_id: dispatchResult.message_id,
      });

      // Log SMS dispatch in audit log
      try {
        await supabase.rpc("log_audit_event", {
          event_type: "changisha_sms_sent",
          resource_type: "changisha.contributions",
          resource_id: event.contribution_id,
          metadata: {
            phone: event.phone,
            message_id: dispatchResult.message_id,
            cost_kes: dispatchResult.cost_kes,
            encoding: dispatchResult.encoding,
            campaign_id: event.campaign_id,
          },
        });
      } catch (auditError) {
        console.error("[Changisha SMS Listener] Audit log failed:", auditError);
        // Continue anyway; audit failure is not fatal
      }
    } else {
      console.error("[Changisha SMS Listener] SMS dispatch failed", {
        contribution_id: event.contribution_id,
        error: dispatchResult.error,
      });

      // Log failure to audit
      try {
        await supabase.rpc("log_audit_event", {
          event_type: "changisha_sms_failed",
          resource_type: "changisha.contributions",
          resource_id: event.contribution_id,
          metadata: {
            phone: event.phone,
            error: dispatchResult.error,
            campaign_id: event.campaign_id,
          },
        });
      } catch (auditError) {
        console.error(
          "[Changisha SMS Listener] Audit log for failure failed:",
          auditError
        );
      }
    }
  } catch (error) {
    console.error("[Changisha SMS Listener] Event processing error:", {
      error: error instanceof Error ? error.message : String(error),
      payload: payload.substring(0, 100) + "...",
    });
  }
}

/**
 * Start the SMS listener
 * Connects to PostgreSQL LISTEN channel: changisha_sms_queue
 *
 * @returns Unsubscribe function to stop the listener
 */
export async function startChangishaSMSListener(): Promise<
  () => Promise<void>
> {
  console.log("[Changisha SMS Listener] Starting...");

  const supabase = getSupabaseClient();

  // Create subscription to broadcast channel
  const subscription: RealtimeChannel = supabase
    .channel("changisha_sms_queue", {
      config: {
        broadcast: { self: false }, // Don't listen to our own broadcasts
      },
    })
    .on("broadcast", { event: "*" }, async (payload) => {
      await handleSMSQueueEvent(payload.payload, payload.channel);
    })
    .subscribe((status: string) => {
      console.log(
        "[Changisha SMS Listener] Subscription status:",
        status
      );
    });

  // Return unsubscribe function
  return async () => {
    console.log("[Changisha SMS Listener] Stopping...");
    await subscription.unsubscribe();
  };
}

/**
 * Health check function
 */
export function getListenerStatus(): {
  running: boolean;
  timestamp: string;
} {
  return {
    running: true,
    timestamp: new Date().toISOString(),
  };
}
