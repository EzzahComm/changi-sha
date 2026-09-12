'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  calculateCampaignMetrics,
  formatKES,
  formatPercent,
  getPerformanceBadge,
} from '@/lib/changisha/analytics';

interface Campaign {
  id: number;
  name: string;
  target_amount: number;
  status: 'active' | 'closed' | 'paused';
  created_at: string;
}

export default function CampaignReportsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [campaigns] = useState([
    {
      id: 1,
      name: 'School Renovation Project',
      target_amount: 500000,
      status: 'active' as const,
      created_at: '2025-02-01',
    },
    {
      id: 2,
      name: 'Medical Fund - Community Clinic',
      target_amount: 300000,
      status: 'active' as const,
      created_at: '2025-02-05',
    },
    {
      id: 3,
      name: 'Water Tank Installation',
      target_amount: 200000,
      status: 'closed' as const,
      created_at: '2025-01-15',
    },
  ]);

  const [mockData] = useState({
    1: {
      contributions: [
        { id: 1, amount: 50000, created_at: '2025-02-15', msisdn: '254712345678' },
        { id: 2, amount: 75000, created_at: '2025-02-14', msisdn: '254787654321' },
        { id: 3, amount: 90000, created_at: '2025-02-01', msisdn: '254798765432' },
        { id: 4, amount: 65000, created_at: '2025-02-10', msisdn: '254712111111' },
      ],
      pledges: [
        { pledged_amount: 50000, created_at: '2025-02-01' },
        { pledged_amount: 75000, created_at: '2025-02-02' },
        { pledged_amount: 100000, created_at: '2025-02-03' },
      ],
    },
    2: {
      contributions: [
        { id: 5, amount: 60000, created_at: '2025-02-12', msisdn: '254712222222' },
        { id: 6, amount: 80000, created_at: '2025-02-08', msisdn: '254787333333' },
      ],
      pledges: [
        { pledged_amount: 60000, created_at: '2025-02-05' },
        { pledged_amount: 80000, created_at: '2025-02-06' },
      ],
    },
    3: {
      contributions: [
        { id: 7, amount: 50000, created_at: '2025-01-20', msisdn: '254712444444' },
        { id: 8, amount: 75000, created_at: '2025-01-22', msisdn: '254787555555' },
        { id: 9, amount: 90000, created_at: '2025-02-01', msisdn: '254798666666' },
      ],
      pledges: [
        { pledged_amount: 50000, created_at: '2025-01-15' },
        { pledged_amount: 75000, created_at: '2025-01-16' },
        { pledged_amount: 100000, created_at: '2025-01-17' },
      ],
    },
  });

  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  const campaignMetrics = useMemo(() => {
    return campaigns.map((campaign) => {
      const data = mockData[campaign.id as keyof typeof mockData];
      return calculateCampaignMetrics(campaign, data.contributions, data.pledges);
    });
  }, [campaigns, mockData]);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalRaised = campaignMetrics.reduce((sum, m) => sum + m.total_raised, 0);
  const avgFulfillmentRate = Math.round(
    campaignMetrics.reduce((sum, m) => sum + m.fulfillment_rate, 0) / campaignMetrics.length
  );

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Campaign Performance</h1>
      <p className="text-slate-300 mb-8">Analyze performance across all campaigns</p>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Campaigns</div>
          <div className="text-3xl font-bold text-blue-400">{totalCampaigns}</div>
          <div className="text-xs text-slate-500 mt-2">{activeCampaigns} active</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Raised</div>
          <div className="text-3xl font-bold text-green-400">{formatKES(totalRaised)}</div>
          <div className="text-xs text-slate-500 mt-2">
            {formatPercent((totalRaised / campaigns.reduce((sum, c) => sum + c.target_amount, 0)) * 100)} of target
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Avg Fulfillment</div>
          <div className="text-3xl font-bold text-cyan-400">{avgFulfillmentRate}%</div>
          <div className="text-xs text-slate-500 mt-2">Pledge completion rate</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Avg per Campaign</div>
          <div className="text-3xl font-bold text-purple-400">
            {formatKES(totalRaised / totalCampaigns)}
          </div>
          <div className="text-xs text-slate-500 mt-2">Average raised</div>
        </div>
      </div>

      {/* Campaign Details Table */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Campaign</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Target</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Raised</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Progress</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pledges</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Contributions</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Fulfillment</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Per Day</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Performance</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {campaignMetrics.map((metric) => {
              const badge = getPerformanceBadge(metric.fulfillment_rate);
              const campaign = campaigns.find((c) => c.id === metric.campaign_id)!;
              const progress = (metric.total_raised / metric.target_amount) * 100;

              return (
                <tr key={metric.campaign_id} className="hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{metric.campaign_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{metric.days_active} days active</div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{formatKES(metric.target_amount)}</td>
                  <td className="px-6 py-4 text-green-400 font-semibold">{formatKES(metric.total_raised)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-8">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-400">{metric.pledge_count}</td>
                  <td className="px-6 py-4 text-purple-400">{metric.contribution_count}</td>
                  <td className="px-6 py-4 text-cyan-400">{formatPercent(metric.fulfillment_rate)}</td>
                  <td className="px-6 py-4 text-yellow-400">{metric.contributions_per_day}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedCampaign(metric.campaign_id)}
                      className="text-blue-400 hover:text-blue-300 transition text-sm font-semibold"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Campaign Detail View */}
      {selectedCampaign && (
        <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">
              {campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.campaign_name}
            </h2>
            <button
              onClick={() => setSelectedCampaign(null)}
              className="text-slate-400 hover:text-white transition text-xl font-bold"
            >
              ✕
            </button>
          </div>

          {campaignMetrics.find((m) => m.campaign_id === selectedCampaign) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column - Metrics */}
              <div className="space-y-4">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-2">Average Pledge</div>
                  <div className="text-3xl font-bold text-blue-400">
                    {formatKES(campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.avg_pledge || 0)}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-2">Average Contribution</div>
                  <div className="text-3xl font-bold text-green-400">
                    {formatKES(campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.avg_contribution || 0)}
                  </div>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-slate-400 text-sm mb-2">Contributions/Day</div>
                  <div className="text-3xl font-bold text-purple-400">
                    {campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.contributions_per_day || 0}
                  </div>
                </div>
              </div>

              {/* Middle Column - Distribution */}
              <div className="bg-slate-700/50 p-6 rounded-lg">
                <h3 className="font-bold mb-4">Pledge Distribution</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Under KES 50K</span>
                    <span className="font-semibold">35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">KES 50K - 100K</span>
                    <span className="font-semibold">50%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Over KES 100K</span>
                    <span className="font-semibold">15%</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-600">
                  <h3 className="font-bold mb-4">Trend</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Week 1</div>
                      <div className="w-full h-2 bg-slate-600 rounded">
                        <div className="w-1/3 h-full bg-blue-500 rounded"></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Week 2</div>
                      <div className="w-full h-2 bg-slate-600 rounded">
                        <div className="w-2/3 h-full bg-cyan-500 rounded"></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Week 3</div>
                      <div className="w-full h-2 bg-slate-600 rounded">
                        <div className="w-1/2 h-full bg-green-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Status */}
              <div className="space-y-4">
                <div className="bg-slate-700/50 p-6 rounded-lg">
                  <h3 className="font-bold mb-4">Status</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Pledges</span>
                      <span className="text-blue-400 font-semibold">
                        {campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.pledge_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contributions</span>
                      <span className="text-green-400 font-semibold">
                        {campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.contribution_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Outstanding</span>
                      <span className="text-yellow-400 font-semibold">
                        {
                          (campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.pledge_count || 0) -
                          (campaignMetrics.find((m) => m.campaign_id === selectedCampaign)?.contribution_count || 0)
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={`/admin/exceptions?campaign=${selectedCampaign}`}
                  className="block bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-center font-semibold transition"
                >
                  View Exceptions
                </a>

                <a
                  href={`/campaigns/${selectedCampaign}`}
                  className="block bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-lg text-center font-semibold transition"
                >
                  View Public Page
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
