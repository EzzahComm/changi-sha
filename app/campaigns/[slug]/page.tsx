'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Campaign {
  id: number;
  name: string;
  description: string;
  target_amount: number;
  status: 'active' | 'closed' | 'paused';
  beneficiary_name: string;
  beneficiary_story: string;
  image_url?: string;
  created_at: string;
}

interface CampaignStats {
  total_raised: number;
  pledge_count: number;
  contribution_count: number;
}

interface Realtime {
  subscription?: any;
}

export default function CampaignPage({ params }: { params: { slug: string } }) {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [campaign] = useState<Campaign>({
    id: 1,
    name: 'School Renovation Project',
    description: 'Help us renovate classrooms at Nairobi Primary School. We need to fix the roof, paint walls, and install new desks for 200 students.',
    target_amount: 500000,
    status: 'active',
    beneficiary_name: 'Nairobi Primary School',
    beneficiary_story:
      'For 30 years, Nairobi Primary School has served the community. But our classrooms are falling apart. Leaky roofs during rains, cracked walls, broken desks. Our 200 students deserve better. With your help, we can renovate the entire school in 3 months.',
    image_url: 'https://images.unsplash.com/photo-1427504494785-cdaeb6d0b09f?w=800&q=80',
    created_at: '2025-02-01',
  });

  const [stats, setStats] = useState<CampaignStats>({
    total_raised: 380000,
    pledge_count: 45,
    contribution_count: 38,
  });

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscription = supabase
      .channel(`campaign:${campaign.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `campaign_id=eq.${campaign.id}`,
        },
        () => {
          // Update stats when contributions change
          setStats((prev) => ({
            ...prev,
            contribution_count: prev.contribution_count + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [campaign.id, supabase]);

  const progress = Math.min((stats.total_raised / campaign.target_amount) * 100, 100);
  const remaining = Math.max(campaign.target_amount - stats.total_raised, 0);

  const campaignUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `Help ${campaign.name}! We're raising KES ${campaign.target_amount.toLocaleString()} on Changisha. ${Math.round(progress)}% funded!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(campaignUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + campaignUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(campaignUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(campaign.name)}&body=${encodeURIComponent(shareText + '\n\n' + campaignUrl)}`,
  };

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

      {/* Hero Section */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Campaign Image */}
          <div className="mb-8 rounded-lg overflow-hidden h-96 bg-slate-800">
            <img
              src={campaign.image_url}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <h1 className="text-4xl font-bold mb-4">{campaign.name}</h1>

              <div className="flex items-center gap-4 mb-6">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  campaign.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : campaign.status === 'closed'
                    ? 'bg-slate-500/20 text-slate-300'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
                <span className="text-slate-400 text-sm">
                  Started {new Date(campaign.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                {campaign.description}
              </p>

              {/* Beneficiary Section */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">About the Beneficiary</h2>
                <h3 className="font-semibold text-blue-400 mb-2">{campaign.beneficiary_name}</h3>
                <p className="text-slate-300 leading-relaxed">
                  {campaign.beneficiary_story}
                </p>
              </div>

              {/* Share Buttons */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                <h3 className="font-bold mb-4">Share This Campaign</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <a
                    href={shareLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-center font-semibold transition text-sm"
                  >
                    💬 WhatsApp
                  </a>
                  <a
                    href={shareLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-center font-semibold transition text-sm"
                  >
                    𝕏 Twitter
                  </a>
                  <a
                    href={shareLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-center font-semibold transition text-sm"
                  >
                    f Facebook
                  </a>
                  <a
                    href={shareLinks.email}
                    className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-center font-semibold transition text-sm"
                  >
                    ✉️ Email
                  </a>
                  <div className="relative">
                    <button
                      onClick={handleCopyLink}
                      className="w-full bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition text-sm"
                    >
                      {copied ? '✓ Copied!' : '🔗 Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Pledge Card */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg p-6 sticky top-24">
                {/* Target Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <div className="text-4xl font-bold mb-2">
                        KES {(stats.total_raised / 1000).toFixed(0)}K
                      </div>
                      <div className="text-white/80 text-sm">
                        of KES {(campaign.target_amount / 1000).toFixed(0)}K goal
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{Math.round(progress)}%</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {remaining > 0 && (
                    <div className="text-white/80 text-sm mt-3">
                      KES {remaining.toLocaleString()} to go
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.contribution_count}</div>
                    <div className="text-xs text-white/80">Contributions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.pledge_count}</div>
                    <div className="text-xs text-white/80">Pledges</div>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href="/campaigns/1/pledge"
                  className="w-full bg-white text-blue-600 hover:bg-slate-100 font-semibold py-3 rounded-lg text-center transition block mb-3"
                >
                  Make a Pledge
                </a>

                <p className="text-xs text-white/80 text-center">
                  Pay via M-Pesa when ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Pledge Board CTA */}
      <section className="py-12 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Who's Pledging?</h2>
          <p className="text-slate-300 mb-6">
            See who's contributing to {campaign.name}
          </p>
          <a
            href={`/campaigns/1/pledges`}
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition"
          >
            View Pledge Board →
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
