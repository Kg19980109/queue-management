import React from 'react';
import Link from 'next/link';
import { PlatformService } from '@/lib/services/platform-service';
import { updateStatusAction, assignAdminAction } from '../actions';

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const restaurant = await PlatformService.getRestaurantById(restaurantId);

  async function handleActivate() {
    'use server';
    await updateStatusAction(restaurantId, 'ACTIVE');
  }

  async function handleSuspend() {
    'use server';
    await updateStatusAction(restaurantId, 'SUSPENDED');
  }

  async function handleArchive() {
    'use server';
    await updateStatusAction(restaurantId, 'ARCHIVED');
  }

  async function handleAssignAdmin(formData: FormData) {
    'use server';
    await assignAdminAction(restaurantId, null, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/platform/restaurants" className="text-xs text-emerald-400 hover:underline">
          &larr; Back to Restaurants
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="text-xs font-mono text-slate-500">Slug: /{restaurant.slug} &bull; ID: {restaurant.id}</p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/platform/restaurants/${restaurant.id}/edit`}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Edit Info
            </Link>

            {/* Status Transition State Machine Actions */}
            {restaurant.status === 'SUSPENDED' && (
              <form action={handleActivate}>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                >
                  Activate
                </button>
              </form>
            )}

            {restaurant.status === 'ACTIVE' && (
              <form action={handleSuspend}>
                <button
                  type="submit"
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
                >
                  Suspend
                </button>
              </form>
            )}

            {restaurant.status !== 'ARCHIVED' && (
              <form action={handleArchive}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                >
                  Archive
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Operational Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Tables</span>
          <span className="text-xl font-bold text-white">{restaurant.counts.tables}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Staff Members</span>
          <span className="text-xl font-bold text-white">{restaurant.counts.staff}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Menu Items</span>
          <span className="text-xl font-bold text-white">{restaurant.counts.menuItems}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Queue Entries</span>
          <span className="text-xl font-bold text-white">{restaurant.counts.queueEntries}</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="block text-xs text-slate-500 font-medium">Total Orders</span>
          <span className="text-xl font-bold text-white">{restaurant.counts.orders}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Restaurant Details Card */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Restaurant Information</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-slate-500 font-medium">Phone</span>
              <span className="text-slate-200">{restaurant.phone || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Email</span>
              <span className="text-slate-200">{restaurant.email || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Address</span>
              <span className="text-slate-200">{restaurant.address || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">City / State / Country</span>
              <span className="text-slate-200">
                {restaurant.city || '-'}, {restaurant.state || '-'}, {restaurant.country || '-'}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Timezone</span>
              <span className="text-slate-200">{restaurant.timezone}</span>
            </div>
            <div>
              <span className="block text-slate-500 font-medium">Currency</span>
              <span className="text-slate-200">{restaurant.currency}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-slate-500 font-medium">Description</span>
              <span className="text-slate-300">{restaurant.description || 'No description provided.'}</span>
            </div>
          </div>
        </div>

        {/* Restaurant Admin Assignment Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Assigned Restaurant Admin</h2>

          {restaurant.assignedAdmin ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <div className="font-bold text-white">{restaurant.assignedAdmin.display_name}</div>
              <div className="text-slate-400">{restaurant.assignedAdmin.email}</div>
              <div className="mt-1 text-[11px] text-emerald-400 font-semibold">&check; Active Administrator</div>
            </div>
          ) : (
            <div className="text-xs text-amber-400 italic">No admin assigned yet to this restaurant.</div>
          )}

          <form action={handleAssignAdmin} className="space-y-3 pt-2 border-t border-slate-800">
            <span className="block text-xs font-semibold text-slate-300">Assign / Invite Admin</span>
            <div>
              <label className="block text-[11px] text-slate-400">Display Name *</label>
              <input
                type="text"
                name="displayName"
                required
                placeholder="Manager Name"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400">Admin Email Address *</label>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@restaurant.com"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400">Initial Password *</label>
              <input
                type="text"
                name="password"
                required
                placeholder="password123"
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Assign Restaurant Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
