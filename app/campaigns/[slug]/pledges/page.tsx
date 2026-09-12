'use client';

import { useState } from 'react';

interface Pledge {
  id: number;
  pledger_name: string;
  pledged_amount: number;
  contributed_amount: number;
  created_at: string;
  is_public: boolean;
}

export default function PledgesPage({ params }: { params: { slug: string } }) {
  const [pledges] = useState<Pledge[]>([
    {
      id: 1,
      pledger_name: 'Sarah K.',
      pledged_amount: 50000,
      contributed_amount: 50000,
      created_at: '2025-02-01',
      is_public: true,
    },
    {
      id: 2,
      pledger_name: 'James M.',
      pledged_amount: 75000,
      contributed_amount: 75000,
      created_at: '2025-02-02',
      is_public: true,
    },
    {
      id: 3,
      pledger_name: 'Emma O.',
      pledged_amount: 100000,
      contributed_amount: 90000,
      created_at: '2025-02-03',
      is_public: true,
    },
    {
      id: 4,
      pledger_name: 'David N.',
      pledged_amount: 60000,
      contributed_amount: 60000,
      created_at: '2025-02-04',
      is_public: true,
    },
    {
      id: 5,
      pledger_name: 'Grace M.',
      pledged_amount: 40000,
      contributed_amount: 0,
      created_at: '2025-02-05',
      is_public: true,
    },
    {
      id: 6,
      pledger_name: 'Peter K.',
      pledged_amount: 55000,
      contributed_amount: 55000,
      created_at: '2025-02-06',
      is_public: true,
    },
  ]);

  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'oldest'>('newest');
  const [filterAmount, setFilterAmount] = useState<'all' | 'under50' | '50-100' | 'over100'>('all');

  const publicPledges = pledges.filter((p) => p.is_public);

  const sortedPledges = [...publicPledges].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'highest':
        return b.pledged_amount - a.pledged_amount;
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

  const filteredPledges = sortedPledges.filter((p) => {
    const amount = p.pledged_amount / 1000;
    switch (filterAmount) {
      case 'under50':
        return amount < 50;
      case '50-100':
        return amount >= 50 && amount <= 100;
      case 'over100':
        return amount > 100;
      default:
        return true;
    }
  });

  const totalPledges = publicPledges.reduce((sum, p) => sum + p.pledged_amount, 0);
  const totalContributed = publicPledges.reduce((sum, p) => sum + p.contributed_amount, 0);
  const completionRate = Math.round((totalContributed / totalPledges) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Changisha
          </a>
          <a href="/campaigns/1/pledge" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition font-semibold">
            Pledge Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">School Renovation Project</h1>
        <p className="text-xl text-slate-300 mb-8">Public Pledge Board</p>
        <p className="text-slate-400">
          Meet the community members supporting this campaign
        </p>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{publicPledges.length}</div>
            <div className="text-slate-300">Public Pledges</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-cyan-400 mb-2">
              KES {(totalPledges / 1000).toFixed(0)}K
            </div>
            <div className="text-slate-300">Total Pledged</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              KES {(totalContributed / 1000).toFixed(0)}K
            </div>
            <div className="text-slate-300">Contributed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">{completionRate}%</div>
            <div className="text-slate-300">Follow-through Rate</div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div>
              <label className="block text-sm font-semibold mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="highest">Highest Amount</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Filter by Amount</label>
              <select
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value as any)}
                className="bg-slate-800/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Amounts</option>
                <option value="under50">Under KES 50K</option>
                <option value="50-100">KES 50K - 100K</option>
                <option value="over100">Over KES 100K</option>
              </select>
            </div>
          </div>

          {/* Pledges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPledges.map((pledge) => {
              const contributed = pledge.contributed_amount > 0;
              const completionPercent = Math.round(
                (pledge.contributed_amount / pledge.pledged_amount) * 100
              );

              return (
                <div
                  key={pledge.id}
                  className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">{pledge.pledger_name}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Pledged {new Date(pledge.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {contributed && (
                      <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-semibold">
                        ✓ Paid
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                      KES {pledge.pledged_amount.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-400">Pledge Amount</p>
                  </div>

                  {pledge.pledged_amount !== pledge.contributed_amount && (
                    <div className="mb-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-slate-400">Contributed</span>
                        <span className="text-sm font-semibold text-cyan-400">
                          {completionPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        KES {pledge.contributed_amount.toLocaleString()} of KES{' '}
                        {pledge.pledged_amount.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {!contributed && (
                    <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 font-semibold">
                      ⏳ Awaiting Payment
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredPledges.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No pledges match your filters.
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Them?</h2>
          <p className="text-lg mb-6 text-white/90">
            Make your pledge and help reach the school renovation goal.
          </p>
          <a
            href="/campaigns/1/pledge"
            className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition"
          >
            Make a Pledge
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} Changisha. All rights reserved. Built for Kenya.</p>
        </div>
      </footer>
    </div>
  );
}
