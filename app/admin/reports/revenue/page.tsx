'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { calculateRevenueMetrics, calculateSettlementMetrics, formatKES } from '@/lib/changisha/analytics';

interface Settlement {
  id: number;
  campaign_name: string;
  expected_amount: number;
  received_amount: number;
  status: 'reconciled' | 'pending' | 'disputed';
  closed_date: string;
}

export default function RevenueReportsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [contributions] = useState([
    { amount: 50000 },
    { amount: 75000 },
    { amount: 90000 },
    { amount: 65000 },
    { amount: 60000 },
    { amount: 80000 },
    { amount: 50000 },
    { amount: 75000 },
    { amount: 90000 },
  ]);

  const [settlements] = useState<Settlement[]>([
    {
      id: 1,
      campaign_name: 'Water Tank Installation',
      expected_amount: 215000,
      received_amount: 215000,
      status: 'reconciled',
      closed_date: '2025-02-10',
    },
    {
      id: 2,
      campaign_name: 'Medical Fund - Community Clinic',
      expected_amount: 240000,
      received_amount: 238500,
      status: 'pending',
      closed_date: '2025-02-12',
    },
  ]);

  const revenueMetrics = useMemo(
    () => calculateRevenueMetrics(contributions, 2),
    [contributions]
  );

  const settlementMetrics = useMemo(
    () => calculateSettlementMetrics(settlements),
    [settlements]
  );

  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  // Monthly revenue data
  const monthlyData = [
    { month: 'Jan', contributions: 150000, fees: 3000, net: 147000 },
    { month: 'Feb', contributions: 415000, fees: 8300, net: 406700 },
  ];

  const totalMonthlyContributions = monthlyData.reduce((sum, m) => sum + m.contributions, 0);
  const totalMonthlyFees = monthlyData.reduce((sum, m) => sum + m.fees, 0);
  const totalMonthlyNet = monthlyData.reduce((sum, m) => sum + m.net, 0);

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Revenue & Settlement</h1>
      <p className="text-slate-300 mb-8">Track financial performance and settlement status</p>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Contributions</div>
          <div className="text-3xl font-bold text-green-400">{formatKES(revenueMetrics.total_contributions)}</div>
          <div className="text-xs text-slate-500 mt-2">All time</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Platform Fees</div>
          <div className="text-3xl font-bold text-blue-400">{formatKES(revenueMetrics.platform_fee)}</div>
          <div className="text-xs text-slate-500 mt-2">{revenueMetrics.fee_percent}% of total</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Net to Communities</div>
          <div className="text-3xl font-bold text-purple-400">{formatKES(revenueMetrics.net_payment)}</div>
          <div className="text-xs text-slate-500 mt-2">After fees</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Reconciliation Rate</div>
          <div className="text-3xl font-bold text-cyan-400">{settlementMetrics.reconciliation_rate}%</div>
          <div className="text-xs text-slate-500 mt-2">
            {settlementMetrics.reconciled}/{settlementMetrics.total_campaigns} settled
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Monthly Breakdown</h2>
          <div className="flex gap-2">
            {(['month', 'quarter', 'year'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  timeframe === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400">Month</th>
                <th className="px-4 py-3 text-right text-slate-400">Contributions</th>
                <th className="px-4 py-3 text-right text-slate-400">Fees (2%)</th>
                <th className="px-4 py-3 text-right text-slate-400">Net to Communities</th>
                <th className="px-4 py-3 text-right text-slate-400">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {monthlyData.map((row) => {
                const lastContribution = row.contributions;
                const maxContribution = Math.max(...monthlyData.map((m) => m.contributions));
                const barWidth = (lastContribution / maxContribution) * 100;

                return (
                  <tr key={row.month} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold">{row.month}</td>
                    <td className="px-4 py-3 text-right text-green-400">{formatKES(row.contributions)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{formatKES(row.fees)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{formatKES(row.net)}</td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Total Contributions</span>
            <div className="text-2xl font-bold text-green-400 mt-1">{formatKES(totalMonthlyContributions)}</div>
          </div>
          <div>
            <span className="text-slate-400">Total Fees Collected</span>
            <div className="text-2xl font-bold text-blue-400 mt-1">{formatKES(totalMonthlyFees)}</div>
          </div>
          <div>
            <span className="text-slate-400">Net to Communities</span>
            <div className="text-2xl font-bold text-purple-400 mt-1">{formatKES(totalMonthlyNet)}</div>
          </div>
        </div>
      </div>

      {/* Settlement Status */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Settlement Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Reconciled</span>
              <span className="text-2xl font-bold text-green-400">{settlementMetrics.reconciled}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {formatKES(settlements.filter((s) => s.status === 'reconciled').reduce((sum, s) => sum + s.received_amount, 0))}
            </div>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Pending</span>
              <span className="text-2xl font-bold text-yellow-400">{settlementMetrics.pending}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {formatKES(settlements.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.received_amount, 0))}
            </div>
          </div>
          <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Disputed</span>
              <span className="text-2xl font-bold text-red-400">{settlementMetrics.disputed}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              {formatKES(settlements.filter((s) => s.status === 'disputed').reduce((sum, s) => sum + s.received_amount, 0))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {settlements.map((settlement) => {
            const discrepancy = settlement.received_amount - settlement.expected_amount;

            return (
              <div
                key={settlement.id}
                className="bg-slate-700/30 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold">{settlement.campaign_name}</div>
                    <div className="text-xs text-slate-400 mt-1">Closed {new Date(settlement.closed_date).toLocaleDateString()}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      settlement.status === 'reconciled'
                        ? 'bg-green-500/20 text-green-400'
                        : settlement.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Expected</span>
                    <div className="text-lg font-semibold text-blue-400 mt-1">
                      {formatKES(settlement.expected_amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Received</span>
                    <div className="text-lg font-semibold text-green-400 mt-1">
                      {formatKES(settlement.received_amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Discrepancy</span>
                    <div
                      className={`text-lg font-semibold mt-1 ${
                        discrepancy === 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {discrepancy === 0 ? '✓ Matched' : `${discrepancy > 0 ? '+' : ''}${formatKES(discrepancy)}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export */}
      <div className="mt-8 flex justify-end gap-2">
        <button className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg font-semibold transition">
          📄 Export PDF
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition">
          📥 Download CSV
        </button>
      </div>
    </div>
  );
}
