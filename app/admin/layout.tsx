'use client';

import { useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { href: '/admin/campaigns', label: 'Campaigns', icon: '📊' },
    { href: '/admin/exceptions', label: 'Exceptions', icon: '⚠️' },
    { href: '/admin/settlement', label: 'Settlement', icon: '💰' },
    { href: '/admin/audit', label: 'Audit Log', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-300 hover:text-white transition"
            >
              ☰
            </button>
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Changisha Admin
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-300 hover:text-white transition text-sm">
              ← Back to Site
            </a>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-64' : 'w-0'
          } transition-all duration-300 bg-slate-800/50 border-r border-slate-700 overflow-hidden`}
        >
          <div className="p-6 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
