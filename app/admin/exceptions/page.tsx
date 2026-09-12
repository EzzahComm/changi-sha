'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Exception {
  id: number;
  campaign_id: number;
  exception_type: 'unmatched_msisdn' | 'overpaid_pledge' | 'invalid_amount';
  contribution_id: number;
  contribution_amount: number;
  msisdn: string;
  campaign_name: string;
  created_at: string;
  status: 'open' | 'resolved';
}

interface PledgeMatch {
  pledge_id: number;
  pledger_name: string;
  pledged_amount: number;
  remaining: number;
}

export default function ExceptionsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [exceptions, setExceptions] = useState<Exception[]>([
    {
      id: 1,
      campaign_id: 1,
      exception_type: 'unmatched_msisdn',
      contribution_id: 101,
      contribution_amount: 50000,
      msisdn: '254712345678',
      campaign_name: 'School Renovation Project',
      created_at: '2025-02-15T10:30:00Z',
      status: 'open',
    },
    {
      id: 2,
      campaign_id: 1,
      exception_type: 'overpaid_pledge',
      contribution_id: 102,
      contribution_amount: 75000,
      msisdn: '254787654321',
      campaign_name: 'School Renovation Project',
      created_at: '2025-02-14T14:20:00Z',
      status: 'open',
    },
    {
      id: 3,
      campaign_id: 2,
      exception_type: 'invalid_amount',
      contribution_id: 103,
      contribution_amount: 5000,
      msisdn: '254798765432',
      campaign_name: 'Medical Fund - Community Clinic',
      created_at: '2025-02-13T09:15:00Z',
      status: 'open',
    },
  ]);

  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [selectedPledge, setSelectedPledge] = useState<PledgeMatch | null>(null);

  const [suggestedPledges] = useState<PledgeMatch[]>([
    {
      pledge_id: 201,
      pledger_name: 'Sarah Kipchoge',
      pledged_amount: 50000,
      remaining: 50000,
    },
    {
      pledge_id: 202,
      pledger_name: 'James Mwangi',
      pledged_amount: 75000,
      remaining: 25000,
    },
    {
      pledge_id: 203,
      pledger_name: 'Emma Ochieng',
      pledged_amount: 100000,
      remaining: 100000,
    },
  ]);

  const openExceptions = exceptions.filter((e) => e.status === 'open');

  const handleResolveException = (exceptionId: number) => {
    setExceptions((prev) =>
      prev.map((e) =>
        e.id === exceptionId ? { ...e, status: 'resolved' } : e
      )
    );
    setSelectedException(null);
    setSelectedPledge(null);
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'unmatched_msisdn':
        return '📱';
      case 'overpaid_pledge':
        return '💰';
      case 'invalid_amount':
        return '❌';
      default:
        return '⚠️';
    }
  };

  const getExceptionDescription = (type: string) => {
    switch (type) {
      case 'unmatched_msisdn':
        return 'Phone number doesn\'t match any pledge';
      case 'overpaid_pledge':
        return 'Contribution exceeds pledged amount';
      case 'invalid_amount':
        return 'Amount is suspiciously low';
      default:
        return 'Unknown exception';
    }
  };

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Exception Workbench</h1>
      <p className="text-slate-300 mb-8">Resolve payment mismatches and allocation issues</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Open Exceptions</div>
          <div className="text-3xl font-bold text-red-400">{openExceptions.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Unmatched MSISDN</div>
          <div className="text-3xl font-bold text-orange-400">
            {exceptions.filter((e) => e.exception_type === 'unmatched_msisdn').length}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Overpaid</div>
          <div className="text-3xl font-bold text-yellow-400">
            {exceptions.filter((e) => e.exception_type === 'overpaid_pledge').length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exceptions List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
              <h2 className="font-bold text-lg">Open Exceptions</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {openExceptions.map((exception) => (
                <div
                  key={exception.id}
                  onClick={() => setSelectedException(exception)}
                  className={`p-6 cursor-pointer transition ${
                    selectedException?.id === exception.id
                      ? 'bg-blue-600/20 border-l-4 border-blue-500'
                      : 'hover:bg-slate-700/30 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getExceptionIcon(exception.exception_type)}</span>
                      <div>
                        <div className="font-semibold">{exception.campaign_name}</div>
                        <div className="text-sm text-slate-400">
                          {getExceptionDescription(exception.exception_type)}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">#{exception.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-slate-400">Phone:</span>
                      <div className="font-mono text-blue-300">{exception.msisdn}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Amount:</span>
                      <div className="font-mono text-green-300">KES {exception.contribution_amount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {openExceptions.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                ✓ All exceptions resolved!
              </div>
            )}
          </div>
        </div>

        {/* Resolution Panel */}
        {selectedException && (
          <div className="lg:col-span-1">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 sticky top-24">
              <h2 className="font-bold text-lg mb-4">Resolution</h2>

              <div className="bg-slate-700/50 p-4 rounded-lg mb-6">
                <div className="text-sm text-slate-400 mb-1">Exception Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="font-semibold">{selectedException.exception_type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className="text-green-400 font-semibold">KES {selectedException.contribution_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-300">{new Date(selectedException.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-3 text-slate-300">
                  Select Pledge to Allocate
                </label>
                <div className="space-y-2">
                  {suggestedPledges.map((pledge) => (
                    <button
                      key={pledge.pledge_id}
                      onClick={() => setSelectedPledge(pledge)}
                      className={`w-full p-3 rounded-lg text-left text-sm transition ${
                        selectedPledge?.pledge_id === pledge.pledge_id
                          ? 'bg-blue-600/40 border border-blue-500'
                          : 'bg-slate-700/50 border border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-semibold">{pledge.pledger_name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Pledged: KES {pledge.pledged_amount.toLocaleString()} | Remaining: KES {pledge.remaining.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleResolveException(selectedException.id)}
                disabled={!selectedPledge}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold transition"
              >
                {selectedPledge ? 'Allocate & Resolve' : 'Select a Pledge'}
              </button>

              <button
                onClick={() => {
                  setSelectedException(null);
                  setSelectedPledge(null);
                }}
                className="w-full mt-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
