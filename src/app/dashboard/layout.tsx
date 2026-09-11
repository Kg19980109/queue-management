import React from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth/session';
import { signOutAction } from '@/app/login/actions';

export default async function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-100">
      {/* Background glow for Dashboard */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-slate-900/10 pointer-events-none -z-10" />

      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5 glass-panel-subtle p-6 flex flex-col justify-between z-10 relative">
        <div className="animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg glow-bg">
              QF
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">QueueFlow</h2>
              <span className="text-xs font-semibold text-emerald-400">Restaurant Admin</span>
            </div>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Restaurant Profile
            </Link>
            <Link
              href="/dashboard/settings/qr"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              QR Code Generator
            </Link>
            <Link
              href="/dashboard/staff"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Staff Management
            </Link>

            <Link
              href="/dashboard/zones"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Zones & Sections
            </Link>
            <Link
              href="/dashboard/tables"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Table Management
            </Link>

            <Link
              href="/dashboard/menu"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Menu Management
            </Link>

            <Link
              href="/dashboard/inventory"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Inventory Management
            </Link>

            <Link
              href="/dashboard/queue"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-500/80 hover:bg-amber-500/20 hover:text-amber-400 transition-all duration-300"
            >
              Queue Management
            </Link>

            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              Order Management
            </Link>

            <Link
              href="/dashboard/kitchen"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-500/80 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-300"
            >
              🍳 Kitchen Display (KDS)
            </Link>
            {/* Coming Soon Modules */}
            <div className="pt-4 pb-2 px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Coming Soon
            </div>

            {[
              'Payments',
              'Notifications',
              'Analytics',
            ].map((moduleName) => (
              <div
                key={moduleName}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 cursor-not-allowed select-none"
              >
                <span>{moduleName}</span>
                <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                  Soon
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* User Account / Sign Out Footer */}
        <div className="border-t border-white/5 pt-4 mt-6 animate-fade-in-up stagger-2">
          <div className="mb-3 px-1">
            <div className="truncate text-xs font-semibold text-slate-200">
              {user?.email || 'Restaurant Admin'}
            </div>
            <div className="text-xs text-slate-500">Restaurant Manager</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-lg shadow-rose-500/5"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 animate-fade-in-up stagger-1 z-10 relative">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
