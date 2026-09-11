'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Building2, Users, UserCog, Activity, 
  Store, Ban, Archive, ChevronRight,
  ShieldAlert, CheckCircle2
} from 'lucide-react';

export default function PlatformDashboardPage() {
  const stats = { totalRestaurants: 2, activeRestaurants: 2, suspendedRestaurants: 0, archivedRestaurants: 0, totalAdmins: 2, totalStaff: 2 };
  const recentLogs = { logs: [] as { id: string; createdAt: string; action: string; actor?: { name?: string, email?: string }; restaurant?: { name?: string }; targetRestaurantId?: string | null }[] };
  // Using client components for the animations, accepting props from a server layout or using default data for visual testing.

  return (
    <div className="space-y-8 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Control Center</h1>
          <p className="mt-1 text-sm text-slate-400">QueueFlow SaaS multi-tenant platform overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">System Operational</span>
        </div>
      </motion.div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Restaurants', value: stats.totalRestaurants, icon: Building2, color: 'blue' },
          { label: 'Active', value: stats.activeRestaurants, icon: CheckCircle2, color: 'emerald' },
          { label: 'Suspended', value: stats.suspendedRestaurants, icon: Ban, color: 'amber' },
          { label: 'Archived', value: stats.archivedRestaurants, icon: Archive, color: 'slate' },
          { label: 'Tenant Admins', value: stats.totalAdmins, icon: UserCog, color: 'indigo' },
          { label: 'Active Staff', value: stats.totalStaff, icon: Users, color: 'violet' }
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md hover:bg-slate-800/80 transition-all group`}
          >
            <div className={`absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <stat.icon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <stat.icon className={`w-5 h-5 mb-3 text-${stat.color}-400`} />
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-3xl font-extrabold text-white">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 mb-6 md:mb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Store className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Manage Restaurant Tenants</h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">Onboard new restaurants, manage status lifecycle, or assign tenant admins across the QueueFlow network.</p>
        </div>
        
        <div className="relative z-10 flex w-full md:w-auto items-center gap-4">
          <Link
            href="/platform/restaurants"
            className="flex-1 md:flex-none text-center rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-lg backdrop-blur-md"
          >
            View Directory
          </Link>
          <Link
            href="/platform/restaurants/new"
            className="flex-1 md:flex-none text-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
          >
            + New Tenant
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Recent Audit Activity</h3>
          </div>
          <Link href="/platform/audit-logs" className="group flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            View full log <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {recentLogs.logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-700 mb-3" />
            <div className="text-sm font-medium text-slate-400">No administrative audit activity recorded yet.</div>
            <div className="text-xs text-slate-500 mt-1">Actions performed by staff will appear here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="pb-4 px-4">Timestamp</th>
                  <th className="pb-4 px-4">Action</th>
                  <th className="pb-4 px-4">Actor</th>
                  <th className="pb-4 px-4">Restaurant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentLogs.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium">{log.actor?.name || log.actor?.email || 'System'}</td>
                    <td className="py-4 px-4 text-slate-400">{log.restaurant?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
