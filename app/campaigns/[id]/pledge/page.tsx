'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function PledgePage({ params }: { params: { id: string } }) {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    pledger_name: '',
    pledger_phone: '',
    pledged_amount: '',
    due_date: '',
    consents_to_contact: false,
    consents_to_data_processing: false,
  });

  const campaignId = parseInt(params.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get client IP
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const clientIp = ipRes ? (await ipRes.json()).ip : null;

      // 1. Create pledge
      const { data: pledgeResult, error: pledgeError } = await supabase.rpc(
        'create_pledge',
        {
          p_campaign_id: campaignId,
          p_pledger_id: null,
          p_pledger_name: formData.pledger_name,
          p_pledger_phone: formData.pledger_phone,
          p_pledged_amount: parseFloat(formData.pledged_amount),
          p_due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          p_is_public: false,
          p_consent_to_contact: formData.consents_to_contact,
        }
      );

      if (pledgeError || !pledgeResult?.[0]?.pledge_id) {
        setError(pledgeResult?.[0]?.error_message || pledgeError?.message || 'Unknown error');
        return;
      }

      const phoneNormalized = pledgeResult[0].phone_normalized;

      // 2. Capture consent
      if (formData.consents_to_contact) {
        const { error: consentError } = await supabase.rpc(
          'capture_contributor_consent',
          {
            p_campaign_id: campaignId,
            p_phone_normalized: phoneNormalized,
            p_consents_to_contact: formData.consents_to_contact,
            p_consents_to_data_processing: formData.consents_to_data_processing,
            p_method: 'web_form',
            p_ip_address: clientIp,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          }
        );

        if (consentError) {
          setError('Consent capture failed: ' + consentError.message);
          return;
        }
      }

      // Success
      router.push(`/campaigns/${campaignId}/pledge-success?phone=${encodeURIComponent(phoneNormalized)}`);
    } catch (err) {
      setError('An error occurred: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-8">
      <h1 className="text-2xl font-bold mb-4">Make a Pledge</h1>
      <p className="text-gray-600 mb-6">Help us reach our fundraising goal</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Your Name *</label>
          <input
            type="text"
            name="pledger_name"
            value={formData.pledger_name}
            onChange={(e) =>
              setFormData({ ...formData, pledger_name: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Phone Number *</label>
          <input
            type="tel"
            name="pledger_phone"
            placeholder="07XX XXX XXX"
            value={formData.pledger_phone}
            onChange={(e) =>
              setFormData({ ...formData, pledger_phone: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
            required
          />
          <p className="text-xs text-gray-500 mt-1">We'll send reminders to this number</p>
        </div>

        <div>
          <label className="block font-semibold mb-1">Pledge Amount (KES) *</label>
          <input
            type="number"
            name="pledged_amount"
            value={formData.pledged_amount}
            onChange={(e) =>
              setFormData({ ...formData, pledged_amount: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
            required
            min="100"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={(e) =>
              setFormData({ ...formData, due_date: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Consent Section */}
        <div className="border-t pt-4">
          <h2 className="font-semibold mb-3">Consent & Privacy</h2>

          <label className="flex items-start gap-2 mb-3">
            <input
              type="checkbox"
              name="consents_to_contact"
              checked={formData.consents_to_contact}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consents_to_contact: e.target.checked,
                })
              }
              className="mt-1"
              required
            />
            <span>
              I consent to receive SMS reminders about my pledge{' '}
              <span className="text-red-600">*</span>
            </span>
          </label>

          <label className="flex items-start gap-2 mb-3">
            <input
              type="checkbox"
              name="consents_to_data_processing"
              checked={formData.consents_to_data_processing}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consents_to_data_processing: e.target.checked,
                })
              }
              className="mt-1"
              required
            />
            <span>
              I consent to data processing under the{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                privacy policy
              </a>{' '}
              <span className="text-red-600">*</span>
            </span>
          </label>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold disabled:bg-gray-400 hover:bg-blue-700"
        >
          {isLoading ? 'Creating pledge...' : 'Create Pledge'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By creating a pledge, you agree to our terms and privacy policy
        </p>
      </form>
    </div>
  );
}
