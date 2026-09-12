import { createClient } from '@supabase/supabase-js';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Changisha SMS Queue Listener
 *
 * Listens for SMS queue events from the changisha.process_contribution() RPC
 * via PostgreSQL NOTIFY/LISTEN channel: 'changisha_sms_queue'
 *
 * [INVARIANT S1] All SMS dispatch via shared dispatcher
 * [INVARIANT S3] Contribution receipt SMS sent immediately after confirmation
 */

interface SMSQueueEvent {
  event: 'contribution_receipt' | string;
  contribution_id: number;
  phone: string;
  amount: number;
  campaign_id: number;
}

/**
 * Start listening for SMS queue events
 */
export async function startChangishaSMSListener() {
  console.log('[Changisha SMS Listener] Starting...');

  // Subscribe to the PostgreSQL NOTIFY channel
  const subscription = supabase
    .channel('changisha_sms_queue')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'pg_notify_messages', // This is a virtual table for receiving notifications
      },
      async (payload: RealtimePostgresChangesPayload<any>) => {
        // This approach via postgres_changes doesn't work directly for notifications
        // Instead, we'll use the raw channel subscription below
      }
    )
    .subscribe();

  // Alternative: Use raw subscribe to listen for pg_notify events
  // Note: pg_notify in Supabase requires a custom implementation
  // For Phase 1, we'll use a polling approach

  startPollingApproach();

  return subscription;
}

/**
 * Polling approach for Phase 1 (until Supabase pg_notify is fully integrated)
 * In production, migrate to direct pg_notify listeners
 */
async function startPollingApproach() {
  console.log('[Changisha SMS Listener] Starting polling approach');

  const pollInterval = parseInt(process.env.SMS_POLL_INTERVAL_MS || '5000');

  setInterval(async () => {
    try {
      // In production, this would be replaced with direct pg_notify listening
      // For now, poll for unprocessed SMS queue entries
      const { data: pendingSMS, error } = await supabase
        .from('changisha_sms_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[Changisha SMS Listener] Poll error', error);
        return;
      }

      if (!pendingSMS || pendingSMS.length === 0) {
        return; // No pending SMS
      }

      for (const smsEntry of pendingSMS) {
        await processSMSEntry(smsEntry);
      }
    } catch (error) {
      console.error('[Changisha SMS Listener] Unexpected polling error', error);
    }
  }, pollInterval);
}

/**
 * Process a single SMS queue entry
 */
async function processSMSEntry(entry: any) {
  try {
    const { event, contribution_id, phone, amount, campaign_id } = entry.payload;

    if (event === 'contribution_receipt') {
      // Fetch campaign title for SMS context
      const { data: campaign, error: campaignError } = await supabase
        .from('changisha_campaigns')
        .select('title, tenant_id')
        .eq('id', campaign_id)
        .single();

      if (campaignError || !campaign) {
        console.error('[Changisha SMS] Campaign not found', { campaign_id, error: campaignError });
        // Mark as failed
        await supabase
          .from('changisha_sms_queue')
          .update({ status: 'failed', error_reason: 'Campaign not found' })
          .eq('id', entry.id);
        return;
      }

      // Compose receipt SMS
      const message = composeReceiptSMS(campaign.title, amount, contribution_id);

      // Dispatch via SMS provider
      // TODO: Integrate with actual SMS provider (Twilio, AfricasTalking, etc.)
      const result = await dispatchSMS({
        to: phone,
        message,
        campaign_id,
        reference: `contrib_${contribution_id}`,
      });

      if (result.success) {
        console.log('[Changisha SMS] Receipt sent', {
          contribution_id,
          phone,
          message_id: result.message_id,
        });

        // [INVARIANT S5] Log SMS dispatch in audit log
        await supabase.rpc('log_audit_event', {
          event_type: 'changisha_sms_sent',
          resource_type: 'changisha.contributions',
          resource_id: contribution_id,
          metadata: {
            phone,
            message_id: result.message_id,
            cost: result.cost_kes || 0,
            encoding: result.encoding || 'gsm7',
          },
        });

        // Mark as sent
        await supabase
          .from('changisha_sms_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', entry.id);
      } else {
        console.error('[Changisha SMS] Send failed', {
          contribution_id,
          error: result.error,
        });

        // Log failure
        await supabase.rpc('log_audit_event', {
          event_type: 'changisha_sms_failed',
          resource_type: 'changisha.contributions',
          resource_id: contribution_id,
          metadata: { phone, error: result.error },
        });

        // Mark as failed
        await supabase
          .from('changisha_sms_queue')
          .update({ status: 'failed', error_reason: result.error })
          .eq('id', entry.id);
      }
    }
  } catch (error) {
    console.error('[Changisha SMS] Listener error', error);
  }
}

/**
 * Compose contribution receipt SMS
 * [INVARIANT S2] Receipt SMS includes campaign title, amount, confirmation reference
 */
function composeReceiptSMS(campaignTitle: string, amount: number, contributionId: number): string {
  // Swahili SMS template
  // Max length ~160 chars for GSM-7 encoding (single SMS)
  return (
    `Asante! Umependeza KES ${amount} kwa "${campaignTitle}". ` +
    `Ref: ${contributionId}. Harambee!`
  );
}

/**
 * SMS Dispatch Interface (Phase 1: placeholder)
 * In production, integrate with Twilio, AfricasTalking, or similar
 */
async function dispatchSMS(options: {
  to: string;
  message: string;
  campaign_id: number;
  reference: string;
}): Promise<{
  success: boolean;
  message_id?: string;
  cost_kes?: number;
  encoding?: string;
  error?: string;
}> {
  // Phase 1 placeholder: log only
  console.log('[SMS Dispatch] Would send SMS', {
    to: options.to,
    message: options.message.slice(0, 50) + '...',
    reference: options.reference,
  });

  // TODO: Integrate with actual SMS provider
  // For now, simulate success
  return {
    success: true,
    message_id: `msg_${Date.now()}`,
    cost_kes: 0, // Free in sandbox
    encoding: 'gsm7',
  };
}

// Start listener if run directly
if (require.main === module) {
  startChangishaSMSListener();
  console.log('[Changisha SMS Listener] Running. Press Ctrl+C to exit.');
}

export { };
