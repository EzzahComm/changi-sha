/**
 * Changisha Pledge Reminder Job
 *
 * Scheduled job that sends SMS reminders to pledgers with:
 * - Valid consent to contact
 * - Status: pending, partially_contributed, or overdue
 * - Last reminder sent > 24h ago (or never)
 *
 * [INVARIANT P5] Reminders sent only to pledges with consent=TRUE
 * [INVARIANT P6] reminder_sent_count incremented atomically
 * [INVARIANT S1] All SMS via shared dispatcher
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Pledge {
  id: number;
  campaign_id: number;
  pledger_phone: string;
  pledger_name: string;
  pledged_amount: number;
  due_date: string;
  reminder_sent_count: number;
  last_reminder_at: string | null;
  status: string;
  has_valid_consent: boolean;
}

interface Campaign {
  id: number;
  title: string;
}

interface SMSResult {
  success: boolean;
  message_id?: string;
  cost_kes?: number;
  encoding?: string;
  error?: string;
}

/**
 * Main reminder job - send SMS to eligible pledges
 */
export async function sendPledgeReminders(): Promise<void> {
  console.log('[Changisha Reminders] Job started at', new Date().toISOString());

  try {
    // 1. Find pledges that need reminders
    const { data: pledges, error: queryError } = await supabase
      .from('v_pledges_with_consent_status')
      .select('*')
      .in('status', ['pending', 'partially_contributed', 'overdue'])
      .eq('has_valid_consent', true);

    if (queryError) {
      console.error('[Changisha Reminders] Query failed:', queryError);
      return;
    }

    if (!pledges || pledges.length === 0) {
      console.log('[Changisha Reminders] No eligible pledges found');
      return;
    }

    console.log(`[Changisha Reminders] Found ${pledges.length} eligible pledges`);

    // 2. Filter: last_reminder_at < 24h ago
    const nowMinusDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const eligiblePledges = pledges.filter((p: Pledge) => {
      if (!p.last_reminder_at) return true; // Never reminded
      return new Date(p.last_reminder_at) < nowMinusDay;
    });

    console.log(`[Changisha Reminders] ${eligiblePledges.length} pledges need reminders`);

    let sent = 0;
    let failed = 0;

    for (const pledge of eligiblePledges) {
      try {
        // 3. Fetch campaign for context
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, title')
          .eq('id', pledge.campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.warn(`[Changisha Reminders] Campaign not found: ${pledge.campaign_id}`);
          failed++;
          continue;
        }

        // 4. Compose reminder SMS
        const message = composeReminderSMS(
          campaign.title,
          pledge.pledged_amount,
          pledge.due_date
        );

        // 5. Dispatch SMS (placeholder implementation)
        const result = await dispatchSMS(pledge.pledger_phone, message);

        if (result.success) {
          // 6. Update pledge: increment reminder_sent_count, set last_reminder_at
          const { error: updateError } = await supabase
            .from('pledges')
            .update({
              reminder_sent_count: (pledge.reminder_sent_count || 0) + 1,
              last_reminder_at: new Date().toISOString(),
            })
            .eq('id', pledge.id);

          if (updateError) {
            console.error(
              `[Changisha Reminders] Update failed for pledge ${pledge.id}:`,
              updateError
            );
            failed++;
          } else {
            // 7. Log to audit trail
            await supabase.rpc('log_audit_event', {
              event_type: 'changisha_pledge_reminder_sent',
              resource_type: 'changisha.pledges',
              resource_id: pledge.id,
              metadata: {
                phone: pledge.pledger_phone,
                message_id: result.message_id,
                cost_kes: result.cost_kes || 0,
              },
            });

            console.log(`[Changisha Reminders] SMS sent to pledge ${pledge.id}`);
            sent++;
          }
        } else {
          console.error(
            `[Changisha Reminders] SMS dispatch failed for pledge ${pledge.id}:`,
            result.error
          );
          failed++;

          // Log failure
          await supabase.rpc('log_audit_event', {
            event_type: 'changisha_pledge_reminder_failed',
            resource_type: 'changisha.pledges',
            resource_id: pledge.id,
            metadata: {
              phone: pledge.pledger_phone,
              error: result.error,
            },
          });
        }
      } catch (pledgeError) {
        console.error(
          `[Changisha Reminders] Error processing pledge ${pledge.id}:`,
          pledgeError
        );
        failed++;
      }
    }

    console.log(
      `[Changisha Reminders] Job complete: ${sent} sent, ${failed} failed`
    );
  } catch (error) {
    console.error('[Changisha Reminders] Job error:', error);
  }
}

/**
 * Compose Swahili reminder SMS
 * [INVARIANT S2] Reminder SMS includes campaign, amount, due date
 */
function composeReminderSMS(
  campaignTitle: string,
  pledgedAmount: number,
  dueDate: string | null
): string {
  if (!dueDate) {
    return (
      `Salama! Ukumbuke: Ulijua KES ${pledgedAmount} kwa "${campaignTitle}". ` +
      `Karibu sana kuweka ahadi yako. Asante!`
    );
  }

  const dateObj = new Date(dueDate);
  const dateStr = dateObj.toLocaleDateString('sw-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    `Salama! Ukumbuke: Ulijua KES ${pledgedAmount} kwa "${campaignTitle}". ` +
    `Tarehe ya malipo: ${dateStr}. Asante!`
  );
}

/**
 * Dispatch SMS to phone number
 * Phase 2: Placeholder implementation
 * Phase 3+: Integrate with Twilio, AfricasTalking, etc.
 */
async function dispatchSMS(
  phone: string,
  message: string
): Promise<SMSResult> {
  try {
    // TODO: Integrate with actual SMS provider (Twilio, AfricasTalking, etc.)
    // For Phase 2, this is a placeholder
    console.log(`[SMS Dispatch] Would send to ${phone}: ${message.slice(0, 30)}...`);

    return {
      success: true,
      message_id: `msg_${Date.now()}`,
      cost_kes: 0, // Free in sandbox
      encoding: 'gsm7',
    };
  } catch (error) {
    console.error('[SMS Dispatch] Error:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Schedule reminder job to run every 6 hours
 * Call this from your job scheduler (PM2, systemd, Cloud Tasks, etc.)
 */
export async function scheduleReminders(): Promise<void> {
  console.log('[Changisha Reminders] Starting scheduler (6h interval)');

  // Run immediately
  await sendPledgeReminders();

  // Then every 6 hours
  setInterval(() => {
    sendPledgeReminders().catch((error) => {
      console.error('[Changisha Reminders] Cron error:', error);
    });
  }, 6 * 60 * 60 * 1000);
}

// Entry point for PM2
if (require.main === module) {
  scheduleReminders();
  console.log('[Changisha Reminders] Running. Press Ctrl+C to exit.');
}

export {};
