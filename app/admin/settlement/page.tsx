'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Settlement {
  id: number;
  campaign_id: number;
  campaign_name: string;
  expected_amount: number;
  received_amount: number;
  discrepancy: number;
  status: 'reconciled' | 'pending' | 'disputed';
  closed_date: string;
  settlement_ref: string;
}

interface ContributionDetail {
  id: number;
  msisdn: string;
  amount: number;
  trans_id: string;
  payment_date: string;
  status: 'settled' | 'pending' | 'failed';
}

export default function SettlementPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [settlements, setSettlements] = useState<Settlement[]>([
    {
      id: 1,
      campaign_id: 3,
      campaign_name: 'Water Tank Installation',
      expected_amount: 215000,
      received_amount: 215000,
      discrepancy: 0,
      status: 'reconciled',
      closed_date: '2025-02-10',
      settlement_ref: 'STL-2025-00001',
    },
    {
      id: 2,
      campaign_id: 2,
      campaign_name: 'Medical Fund - Community Clinic',
      expected_amount: 240000,
      received_amount: 238500,
      discrepancy: -1500,
      status: 'pending',
      closed_date: '2025-02-12',
      settlement_ref: 'STL-2025-00002',
    },
  ]);

  const [expandedSettlement, setExpandedSettlement] = useState<number | null>(null);
  const [contributionDetails] = useState<Record<number, ContributionDetail[]>>({
    1: [
      {
        id: 1,
        msisdn: '254712345678',
        amount: 50000,
        trans_id: 'RD2K23E6SJ3',
        payment_date: '2025-01-20',
        status: 'settled',
      },
      {
        id: 2,
        msisdn: '254787654321',
        amount: 75000,
        trans_id: 'RD2K23E6SJ4',
        payment_date: '2025-01-22',
        status: 'settled',
      },
      {
        id: 3,
        msisdn: '254798765432',
        amount: 90000,
        trans_id: 'RD2K23E6SJ5',
        payment_date: '2025-02-01',
        status: 'settled',
      },
    ],
    2: [
      {
        id: 4,
        msisdn: '254712111111',
        amount: 60000,
        trans_id: 'RD2K23E6SJ6',
        payment_date: '2025-02-03',
        status: 'settled',
      },
      {
        id: 5,
        msisdn: '254787222222',
        amount: 80000,
        trans_id: 'RD2K23E6SJ7',
        payment_date: '2025-02-05',
        status: 'settled',
      },
      {
        id: 6,
        msisdn: '254798333333',
        amount: 98500,
        trans_id: 'RD2K23E6SJ8',
        payment_date: '2025-02-08',
        status: 'pending',
      },
    ],
  });

  const toggleExpand = (settlementId: number) => {
    setExpandedSettlement(expandedSettlement === settlementId ? null : settlementId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reconciled':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'disputed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const totalExpected = settlements.reduce((sum, s) => sum + s.expected_amount, 0);
  const totalReceived = settlements.reduce((sum, s) => sum + s.received_amount, 0);
  const totalDiscrepancy = settlements.reduce((sum, s) => sum + s.discrepancy, 0);

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Settlement Reconciliation</h1>
      <p className="text-slate-300 mb-8">Track settlement status for closed campaigns</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Closed Campaigns</div>
          <div className="text-3xl font-bold text-blue-400">{settlements.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Expected Total</div>
          <div className="text-3xl font-bold text-green-400">
            KES {(totalExpected / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Received Total</div>
          <div className="text-3xl font-bold text-cyan-400">
            KES {(totalReceived / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Discrepancy</div>
          <div className={`text-3xl font-bold ${totalDiscrepancy === 0 ? 'text-green-400' : 'text-red-400'}`}>
            KES {(totalDiscrepancy / 1000).toFixed(1)}K
          </div>
        </div>
      </div>

      {/* Settlements */}
      <div className="space-y-4">
        {settlements.map((settlement) => (
          <div key={settlement.id} className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleExpand(settlement.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition"
            >
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-lg">{settlement.campaign_name}</div>
                    <div className="text-sm text-slate-400">Ref: {settlement.settlement_ref}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-green-400">
                    KES {settlement.received_amount.toLocaleString()}
                  </div>
                  <div className={`text-sm ${settlement.discrepancy === 0 ? 'text-slate-400' : 'text-red-400'}`}>
                    {settlement.discrepancy === 0 ? '✓ Matched' : `Δ ${settlement.discrepancy > 0 ? '+' : ''}${settlement.discrepancy.toLocaleString()}`}
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(settlement.status)}`}>
                  {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                </span>

                <span className="text-slate-400 text-xl">
                  {expandedSettlement === settlement.id ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedSettlement === settlement.id && (
              <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold mb-4 text-slate-300">Settlement Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expected Amount:</span>
                        <span className="font-mono text-green-400">KES {settlement.expected_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Received Amount:</span>
                        <span className="font-mono text-green-400">KES {settlement.received_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700 pt-3">
                        <span className="text-slate-400">Discrepancy:</span>
                        <span className={`font-mono ${settlement.discrepancy === 0 ? 'text-green-400' : 'text-red-400'}`}>
                          KES {settlement.discrepancy.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Closed Date:</span>
                        <span className="text-slate-300">{new Date(settlement.closed_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 text-slate-300">Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full bg-blue-600/40 hover:bg-blue-600/50 border border-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition">
                        Review Details
                      </button>
                      {settlement.status === 'pending' && (
                        <button className="w-full bg-green-600/40 hover:bg-green-600/50 border border-green-500 px-4 py-2 rounded-lg text-sm font-semibold transition">
                          Mark Reconciled
                        </button>
                      )}
                      {settlement.status === 'disputed' && (
                        <button className="w-full bg-red-600/40 hover:bg-red-600/50 border border-red-500 px-4 py-2 rounded-lg text-sm font-semibold transition">
                          Investigate Issue
                        </button>
                      )}
                      <button className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition">
                        Export as CSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contributions List */}
                <div className="mt-8">
                  <h3 className="font-semibold mb-4 text-slate-300">Contributions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800/50 border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-slate-400">MSISDN</th>
                          <th className="px-4 py-2 text-left text-slate-400">Amount</th>
                          <th className="px-4 py-2 text-left text-slate-400">Trans ID</th>
                          <th className="px-4 py-2 text-left text-slate-400">Date</th>
                          <th className="px-4 py-2 text-left text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {(contributionDetails[settlement.id] || []).map((contrib) => (
                          <tr key={contrib.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-4 py-2 font-mono text-slate-300">{contrib.msisdn}</td>
                            <td className="px-4 py-2 text-green-400">KES {contrib.amount.toLocaleString()}</td>
                            <td className="px-4 py-2 font-mono text-blue-300">{contrib.trans_id}</td>
                            <td className="px-4 py-2 text-slate-400">{new Date(contrib.payment_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                contrib.status === 'settled'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {contrib.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {settlements.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No closed campaigns yet.
        </div>
      )}
    </div>
  );
}
