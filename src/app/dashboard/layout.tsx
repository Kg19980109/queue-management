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
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-lg">
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
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Restaurant Profile
            </Link>
            <Link
              href="/dashboard/settings/qr"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              QR Code Generator
            </Link>
            <Link
              href="/dashboard/staff"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Staff Management
            </Link>

            <Link
              href="/dashboard/zones"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Zones & Sections
            </Link>
            <Link
              href="/dashboard/tables"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Table Management
            </Link>

            <Link
              href="/dashboard/menu"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Menu Management
            </Link>

            <Link
              href="/dashboard/inventory"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Inventory Management
            </Link>

            <Link
              href="/dashboard/queue"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors"
            >
              Queue Management
            </Link>

            <Link
              href="/dashboard/orders"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Order Management
            </Link>

            <Link
              href="/dashboard/kitchen"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors"
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
                <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                  Soon
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* User Account / Sign Out Footer */}
        <div className="border-t border-slate-800 pt-4">
          <div className="mb-3 px-1">
            <div className="truncate text-xs font-semibold text-slate-200">
              {user?.email || 'Restaurant Admin'}
            </div>
            <div className="text-xs text-slate-500">Restaurant Manager</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
