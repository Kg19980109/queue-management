import React from 'react';
import Link from 'next/link';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';

export default async function RestaurantAdminDashboardPage() {
  const { restaurant, counts } = await RestaurantAdminService.getRestaurantDashboardStats();

  return (
    <div className="space-y-8">
      {/* Status Warning Banner if Suspended or Archived */}
      {restaurant.status === 'SUSPENDED' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-300 text-xs font-semibold">
          &warning; Operational Warning: Your restaurant is currently SUSPENDED by the platform administrator. Contact support for assistance.
        </div>
      )}
      {restaurant.status === 'ARCHIVED' && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300 text-xs font-semibold">
          &warning; Notice: Your restaurant has been ARCHIVED. Operational modules are read-only.
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">{restaurant.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                restaurant.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : restaurant.status === 'SUSPENDED'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {restaurant.status}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500">/{restaurant.slug} &bull; {restaurant.city || 'City N/A'}</p>
        </div>

        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Edit Profile
        </Link>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Active Staff</span>
          <span className="text-2xl font-bold text-white">{counts.staff}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Tables</span>
          <span className="text-2xl font-bold text-white">{counts.tables}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Menu Items</span>
          <span className="text-2xl font-bold text-white">{counts.menuItems}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Queue Entries</span>
          <span className="text-2xl font-bold text-white">{counts.queueEntries}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Orders</span>
          <span className="text-2xl font-bold text-white">{counts.orders}</span>
        </div>
      </div>

      {/* Module Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Staff Management</h3>
            <p className="text-xs text-slate-400 mt-1">Manage team members, roles, and operational permissions.</p>
          </div>
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            Manage Staff Members &rarr;
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Queue & Seating Engine</h3>
            <p className="text-xs text-slate-500 mt-1">Manage your active queue, seating, and table assignments.</p>
          </div>
          <Link
            href="/dashboard/queue"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            Manage Queue &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
