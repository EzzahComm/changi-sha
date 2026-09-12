'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface AuditEntry {
  id: number;
  event_type: 'contribution' | 'pledge' | 'sms' | 'consent' | 'allocation' | 'exception' | 'settlement';
  resource_id: string;
  actor: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'error';
}

export default function AuditPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [auditEntries] = useState<AuditEntry[]>([
    {
      id: 1,
      event_type: 'contribution',
      resource_id: 'CONTRIB-101',
      actor: 'System',
      timestamp: '2025-02-15T10:30:00Z',
      action: 'Contribution Created',
      details: 'MSISDN: 254712345678, Amount: KES 50,000, Campaign: School Renovation',
      status: 'success',
    },
    {
      id: 2,
      event_type: 'exception',
      resource_id: 'EXC-1',
      actor: 'System',
      timestamp: '2025-02-15T10:35:00Z',
      action: 'Exception Created',
      details: 'Type: unmatched_msisdn, Contribution: 101, Reason: Phone not in pledge list',
      status: 'success',
    },
    {
      id: 3,
      event_type: 'allocation',
      resource_id: 'ALLOC-1',
      actor: 'admin@changisha.ke',
      timestamp: '2025-02-15T11:00:00Z',
      action: 'Manual Allocation',
      details: 'Allocated Contribution 101 to Pledge 201, Amount: KES 50,000',
      status: 'success',
    },
    {
      id: 4,
      event_type: 'sms',
      resource_id: 'SMS-1001',
      actor: 'Job: changisha-reminder',
      timestamp: '2025-02-15T14:00:00Z',
      action: 'SMS Sent',
      details: 'Reminder SMS to 254787654321, Campaign: School Renovation, Template: reminder_v1',
      status: 'success',
    },
    {
      id: 5,
      event_type: 'consent',
      resource_id: 'CONSENT-501',
      actor: 'System',
      timestamp: '2025-02-14T09:15:00Z',
      action: 'Consent Captured',
      details: 'Phone: 254798765432, Type: contact + data_processing, Method: web_form, IP: 196.51.100.50',
      status: 'success',
    },
    {
      id: 6,
      event_type: 'pledge',
      resource_id: 'PLEDGE-201',
      actor: 'System',
      timestamp: '2025-02-14T08:45:00Z',
      action: 'Pledge Created',
      details: 'Name: Sarah Kipchoge, Phone: 254712111111, Amount: KES 50,000, Campaign: School Renovation',
      status: 'success',
    },
    {
      id: 7,
      event_type: 'settlement',
      resource_id: 'STL-2025-00001',
      actor: 'System',
      timestamp: '2025-02-10T16:00:00Z',
      action: 'Settlement Reconciled',
      details: 'Campaign: Water Tank Installation, Expected: KES 215,000, Received: KES 215,000, Status: reconciled',
      status: 'success',
    },
  ]);

  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const eventTypes: Array<{ value: string; label: string; icon: string; color: string }> = [
    { value: 'contribution', label: 'Contributions', icon: '💳', color: 'text-green-400' },
    { value: 'pledge', label: 'Pledges', icon: '🤝', color: 'text-blue-400' },
    { value: 'sms', label: 'SMS', icon: '📱', color: 'text-purple-400' },
    { value: 'consent', label: 'Consent', icon: '✓', color: 'text-cyan-400' },
    { value: 'allocation', label: 'Allocations', icon: '📊', color: 'text-yellow-400' },
    { value: 'exception', label: 'Exceptions', icon: '⚠️', color: 'text-red-400' },
    { value: 'settlement', label: 'Settlement', icon: '✅', color: 'text-emerald-400' },
  ];

  const filteredEntries = auditEntries.filter((entry) => {
    const matchesType = filterEventType === 'all' || entry.event_type === filterEventType;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    const matchesSearch = entry.resource_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const getEventIcon = (eventType: string) => {
    const event = eventTypes.find((e) => e.value === eventType);
    return event?.icon || '📋';
  };

  const getEventColor = (eventType: string) => {
    const event = eventTypes.find((e) => e.value === eventType);
    return event?.color || 'text-slate-400';
  };

  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-2">Audit Log</h1>
      <p className="text-slate-300 mb-8">Track all system events and user actions</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-xs font-semibold mb-2">Total Events</div>
          <div className="text-2xl font-bold text-blue-400">{auditEntries.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-xs font-semibold mb-2">Last 24h</div>
          <div className="text-2xl font-bold text-cyan-400">
            {auditEntries.filter((e) => {
              const date = new Date(e.timestamp);
              const now = new Date();
              return (now.getTime() - date.getTime()) < 24 * 60 * 60 * 1000;
            }).length}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-xs font-semibold mb-2">Success Rate</div>
          <div className="text-2xl font-bold text-green-400">
            {Math.round((auditEntries.filter((e) => e.status === 'success').length / auditEntries.length) * 100)}%
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-xs font-semibold mb-2">Errors</div>
          <div className="text-2xl font-bold text-red-400">
            {auditEntries.filter((e) => e.status === 'error').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Event Types</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEventType('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filterEventType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Events
          </button>
          {eventTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilterEventType(type.value)}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                filterEventType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by resource ID, actor, or action..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-800/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Audit Timeline */}
      <div className="space-y-3">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition"
          >
            <button
              onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              className="w-full px-6 py-4 flex items-center justify-between transition hover:bg-slate-700/20"
            >
              <div className="flex-1 text-left flex items-start gap-4">
                <span className="text-2xl mt-1">{getEventIcon(entry.event_type)}</span>
                <div className="flex-1">
                  <div className="font-semibold">{entry.action}</div>
                  <div className="text-sm text-slate-400 mt-1">{entry.resource_id}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                <div className="text-right hidden md:block">
                  <div className="text-sm text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">by {entry.actor}</div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  entry.status === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {entry.status}
                </span>

                <span className="text-slate-400">
                  {expandedEntry === entry.id ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedEntry === entry.id && (
              <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-4 text-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-slate-400 mb-1">Resource ID</div>
                    <div className="font-mono text-blue-300">{entry.resource_id}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Actor</div>
                    <div className="font-mono">{entry.actor}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Event Type</div>
                    <div className="font-mono capitalize">{entry.event_type}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Timestamp</div>
                    <div className="font-mono">{new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 mb-2">Details</div>
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-700 font-mono text-xs leading-relaxed">
                    {entry.details}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                    View Related Events
                  </button>
                  <button className="text-slate-400 hover:text-slate-300 text-sm font-semibold">
                    Export Entry
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No audit entries found matching your filters.
        </div>
      )}

      {/* Export Button */}
      <div className="mt-8 flex justify-end">
        <button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition">
          📥 Export as CSV
        </button>
      </div>
    </div>
  );
}
