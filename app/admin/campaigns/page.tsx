'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Campaign {
  id: number;
  name: string;
  target_amount: number;
  description: string;
  status: 'active' | 'closed' | 'paused';
  created_at: string;
  pledge_count?: number;
  contribution_count?: number;
  total_contributions?: number;
}

export default function CampaignsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 1,
      name: 'School Renovation Project',
      target_amount: 500000,
      description: 'Renovate classrooms at Nairobi Primary',
      status: 'active',
      created_at: '2025-02-01',
      pledge_count: 45,
      contribution_count: 38,
      total_contributions: 380000,
    },
    {
      id: 2,
      name: 'Medical Fund - Community Clinic',
      target_amount: 300000,
      description: 'Equipment for local health center',
      status: 'active',
      created_at: '2025-02-05',
      pledge_count: 28,
      contribution_count: 22,
      total_contributions: 240000,
    },
    {
      id: 3,
      name: 'Water Tank Installation',
      target_amount: 200000,
      description: 'Install 50,000L tank for village',
      status: 'closed',
      created_at: '2025-01-15',
      pledge_count: 32,
      contribution_count: 32,
      total_contributions: 215000,
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'paused'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesFilter = filter === 'all' || campaign.status === filter;
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalRaised = filteredCampaigns.reduce((sum, c) => sum + (c.total_contributions || 0), 0);
  const totalPledges = filteredCampaigns.reduce((sum, c) => sum + (c.pledge_count || 0), 0);
  const totalContributions = filteredCampaigns.reduce((sum, c) => sum + (c.contribution_count || 0), 0);

  const progressPercent = (amount: number, target: number) => {
    return Math.min((amount / target) * 100, 100);
  };

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Campaigns</h1>
      <p className="text-slate-300 mb-8">Manage all active and completed campaigns</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Active Campaigns</div>
          <div className="text-3xl font-bold text-blue-400">
            {campaigns.filter((c) => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Raised</div>
          <div className="text-3xl font-bold text-cyan-400">
            KES {(totalRaised / 1000).toFixed(1)}K
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Total Pledges</div>
          <div className="text-3xl font-bold text-green-400">{totalPledges}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-slate-400 text-sm font-semibold mb-2">Contributions</div>
          <div className="text-3xl font-bold text-purple-400">{totalContributions}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-8 flex-wrap">
        {(['all', 'active', 'closed', 'paused'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}

        <input
          type="text"
          placeholder="Search campaigns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-800/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Campaigns Table */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Campaign</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Target</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Raised</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Progress</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Pledges</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredCampaigns.map((campaign) => {
              const progress = progressPercent(campaign.total_contributions || 0, campaign.target_amount);
              return (
                <tr key={campaign.id} className="hover:bg-slate-700/30 transition">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold">{campaign.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{campaign.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    KES {(campaign.target_amount / 1000).toFixed(0)}K
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    KES {((campaign.total_contributions || 0) / 1000).toFixed(1)}K
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-10">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {campaign.contribution_count}/{campaign.pledge_count}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : campaign.status === 'closed'
                          ? 'bg-slate-500/20 text-slate-300'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-400 hover:text-blue-300 transition text-sm">
                        View
                      </button>
                      <button className="text-cyan-400 hover:text-cyan-300 transition text-sm">
                        Edit
                      </button>
                      {campaign.status !== 'closed' && (
                        <button className="text-slate-400 hover:text-slate-300 transition text-sm">
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No campaigns found matching your filters.
        </div>
      )}
    </div>
  );
}
