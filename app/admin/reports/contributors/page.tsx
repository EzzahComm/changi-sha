'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { calculateContributorMetrics, formatKES } from '@/lib/changisha/analytics';

interface Contributor {
  msisdn: string;
  name: string;
  contributions: number[];
  last_contribution: string;
  campaigns: number;
}

export default function ContributorReportsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [contributions] = useState([
    { amount: 50000, msisdn: '254712345678' },
    { amount: 75000, msisdn: '254787654321' },
    { amount: 90000, msisdn: '254798765432' },
    { amount: 65000, msisdn: '254712345678' }, // repeat
    { amount: 60000, msisdn: '254712111111' },
    { amount: 80000, msisdn: '254787222222' },
    { amount: 50000, msisdn: '254798333333' },
    { amount: 75000, msisdn: '254787654321' }, // repeat
    { amount: 90000, msisdn: '254712345678' }, // repeat
  ]);

  const [contributors] = useState<Contributor[]>([
    {
      msisdn: '254712345678',
      name: 'Sarah K.',
      contributions: [50000, 65000, 90000],
      last_contribution: '2025-02-15',
      campaigns: 3,
    },
    {
      msisdn: '254787654321',
      name: 'James M.',
      contributions: [75000, 75000],
      last_contribution: '2025-02-14',
      campaigns: 2,
    },
    {
      msisdn: '254798765432',
      name: 'Emma O.',
      contributions: [90000],
      last_contribution: '2025-02-01',
      campaigns: 1,
    },
    {
      msisdn: '254712111111',
      name: 'David N.',
      contributions: [60000],
      last_contribution: '2025-02-12',
      campaigns: 1,
    },
    {
      msisdn: '254787222222',
      name: 'Grace M.',
      contributions: [80000],
      last_contribution: '2025-02-08',
      campaigns: 1,
    },
    {
      msisdn: '254798333333',
      name: 'Peter K.',
      contributions: [50000],
      last_contribution: '2025-02-06',
      campaigns: 1,
    },
  ]);

  const metrics = useMemo(() => calculateContributorMetrics(contributions), [contributions]);

  const [sortBy, setSortBy] = useState<'amount' | 'frequency' | 'recent'>('amount');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'repeat' | 'one-time'>('all');

  const sortedContributors = [...contributors].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.contributions.reduce((s, c) => s + c, 0) - a.contributions.reduce((s, c) => s + c, 0);
      case 'frequency':
        return b.contributions.length - a.contributions.length;
      case 'recent':
        return new Date(b.last_contribution).getTime() - new Date(a.last_contribution).getTime();
      default:
        return 0;
    }
  });

  const filteredContributors = sortedContributors.filter((c) => {
    switch (segmentFilter) {
      case 'repeat':
        return c.contributions.length > 1;
      case 'one-time':
        return c.contributions.length === 1;
      default:
        return true;
    }
  });

  // Contribution amount distribution
  const distribution = {
    under50: contributions.filter((c) => c.amount < 50000).length,
    '50-100': contributions.filter((c) => c.amount >= 50000 && c.amount <= 100000).length,
    over100: contributions.filter((c) => c.amount > 100000).length,
  };

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Contributor Analytics</h1>
      <p className="text-slate-300 mb-8">Insights into donor behavior and segments</p>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Contributors</div>
          <div className="text-3xl font-bold text-blue-400">{metrics.total_contributors}</div>
          <div className="text-xs text-slate-500 mt-2">Unique MSISDN</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Repeat Contributors</div>
          <div className="text-3xl font-bold text-purple-400">{metrics.repeat_contributors}</div>
          <div className="text-xs text-slate-500 mt-2">{metrics.repeat_rate}% of total</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Average Contribution</div>
          <div className="text-3xl font-bold text-green-400">{formatKES(metrics.avg_contribution)}</div>
          <div className="text-xs text-slate-500 mt-2">Median: {formatKES(metrics.median_contribution)}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Top Contributor</div>
          <div className="text-3xl font-bold text-yellow-400">{formatKES(metrics.top_contributor_amount)}</div>
          <div className="text-xs text-slate-500 mt-2">Largest single contribution</div>
        </div>
      </div>

      {/* Distribution & Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Amount Distribution */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Contribution Distribution</h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Under KES 50K</span>
                <span className="text-blue-400 font-semibold">{distribution.under50}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(distribution.under50 / contributions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">KES 50K - 100K</span>
                <span className="text-cyan-400 font-semibold">{distribution['50-100']}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-cyan-500"
                  style={{
                    width: `${(distribution['50-100'] / contributions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300">Over KES 100K</span>
                <span className="text-green-400 font-semibold">{distribution.over100}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${(distribution.over100 / contributions.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Donor Segments */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Donor Segments</h2>

          <div className="space-y-3">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">One-Time Contributors</span>
                <span className="text-blue-400 font-bold text-xl">
                  {contributors.filter((c) => c.contributions.length === 1).length}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {Math.round(
                  ((contributors.filter((c) => c.contributions.length === 1).length /
                    contributors.length) *
                    100)
                )}% of base
              </div>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Repeat Contributors</span>
                <span className="text-purple-400 font-bold text-xl">
                  {metrics.repeat_contributors}
                </span>
              </div>
              <div className="text-xs text-slate-400">High lifetime value</div>
            </div>

            <div className="bg-slate-700/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Major Donors</span>
                <span className="text-yellow-400 font-bold text-xl">
                  {contributors.filter((c) => c.contributions.some((x) => x > 80000)).length}
                </span>
              </div>
              <div className="text-xs text-slate-400">Contributed KES 80K+</div>
            </div>
          </div>
        </div>

        {/* Retention */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Retention Metrics</h2>

          <div className="space-y-4">
            <div>
              <span className="text-slate-400 text-sm">Repeat Rate</span>
              <div className="text-4xl font-bold text-green-400 mt-2">{metrics.repeat_rate}%</div>
              <div className="text-xs text-slate-500 mt-1">Contributors with 2+ gifts</div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <span className="text-slate-400 text-sm">Avg Repeat Gifts</span>
              <div className="text-2xl font-bold text-cyan-400 mt-2">
                {metrics.repeat_contributors > 0
                  ? (
                      contributions.reduce((sum, c) => sum + c.amount, 0) /
                      metrics.repeat_contributors /
                      2
                    ).toFixed(0)
                  : 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Per repeat donor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Contributors Table */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Top Contributors</h2>
          <div className="flex gap-2 flex-wrap">
            {(['amount', 'frequency', 'recent'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  sortBy === sort
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {sort === 'amount' ? 'By Amount' : sort === 'frequency' ? 'By Frequency' : 'By Recent'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'repeat', 'one-time'] as const).map((segment) => (
            <button
              key={segment}
              onClick={() => setSegmentFilter(segment)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                segmentFilter === segment
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {segment === 'all' ? 'All' : segment === 'repeat' ? 'Repeat Only' : 'One-Time Only'}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400">Contributor</th>
                <th className="px-4 py-3 text-right text-slate-400">Total Given</th>
                <th className="px-4 py-3 text-right text-slate-400"># Gifts</th>
                <th className="px-4 py-3 text-right text-slate-400">Avg Gift</th>
                <th className="px-4 py-3 text-right text-slate-400">Campaigns</th>
                <th className="px-4 py-3 text-right text-slate-400">Last Gift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredContributors.map((c) => {
                const total = c.contributions.reduce((s, x) => s + x, 0);
                const avg = total / c.contributions.length;

                return (
                  <tr key={c.msisdn} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.msisdn}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatKES(total)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold">{c.contributions.length}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{formatKES(avg)}</td>
                    <td className="px-4 py-3 text-right text-purple-400 font-semibold">{c.campaigns}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                      {new Date(c.last_contribution).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end gap-2">
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
