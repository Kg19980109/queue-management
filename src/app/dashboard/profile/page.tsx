'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { updateProfileFormAction } from '../actions';

export default function RestaurantProfilePage() {
  const [state, formAction, isPending] = useActionState(updateProfileFormAction, null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('updated') === 'true') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-emerald-400 hover:underline">
          &larr; Back to Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Restaurant Profile</h1>
        <p className="text-sm text-slate-400">Manage establishment contact information and regional settings</p>
      </div>

      {showSuccess && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
          &check; Restaurant profile successfully updated.
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
          {state.error}
        </div>
      )}

      <form action={formAction} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300">Restaurant Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="Restaurant Name"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Brief description for customers..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">Phone</label>
            <input
              type="text"
              name="phone"
              placeholder="+15550001111"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              placeholder="contact@restaurant.com"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300">Address</label>
          <input
            type="text"
            name="address"
            placeholder="123 Street Address"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300">City</label>
            <input
              type="text"
              name="city"
              placeholder="City"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">State</label>
            <input
              type="text"
              name="state"
              placeholder="State"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Country</label>
            <input
              type="text"
              name="country"
              placeholder="Country"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">Timezone</label>
            <input
              type="text"
              name="timezone"
              defaultValue="UTC"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Currency</label>
            <input
              type="text"
              name="currency"
              defaultValue="USD"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
            Seating System Mode
          </label>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure how tables are allocated to parties:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-white/10 bg-[#111827] cursor-pointer hover:border-emerald-500/40">
              <input
                type="radio"
                name="seating_mode"
                value="SIMPLE"
                defaultChecked
                className="mt-0.5 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-white block">Simple Seating</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Exclusive tables only. Never shares tables between independent parties.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-white/10 bg-[#111827] cursor-pointer hover:border-emerald-500/40">
              <input
                type="radio"
                name="seating_mode"
                value="STRICT"
                className="mt-0.5 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-white block">Strict Seating</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Efficient capacity utilization. Allows sharing free seats on large tables.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
