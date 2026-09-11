'use me client';
'use client';

import React, { useState, useActionState } from 'react';
import { joinQueuePublicAction, JoinQueueState } from '@/app/q/actions';
import type { PublicRestaurantInfo } from '@/lib/services/public-restaurant-service';

interface QueueJoinFormProps {
  restaurant: PublicRestaurantInfo;
}

export function QueueJoinForm({ restaurant }: QueueJoinFormProps) {
  const minParty = restaurant.minPartySize || 1;
  const maxParty = restaurant.maxPartySize || 20;

  const [partySize, setPartySize] = useState<number>(Math.min(2, maxParty));
  const [state, formAction, isPending] = useActionState<JoinQueueState | null, FormData>(
    joinQueuePublicAction,
    null
  );

  const incrementParty = () => setPartySize((prev) => Math.min(prev + 1, maxParty));
  const decrementParty = () => setPartySize((prev) => Math.max(prev - 1, minParty));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Join Digital Waiting Line</h2>
        <p className="text-xs text-slate-400">
          Save your spot from your phone. We&apos;ll notify you when your table is getting close.
        </p>
      </div>

      {state?.error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium leading-relaxed">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        <input type="hidden" name="restaurantSlug" value={restaurant.slug} />
        <input type="hidden" name="partySize" value={partySize} />

        {/* Interactive Party Size Stepper */}
        <div className="space-y-2 text-center">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            How many guests in your party?
          </label>
          <div className="flex items-center justify-center gap-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <button
              type="button"
              onClick={decrementParty}
              disabled={partySize <= minParty || isPending}
              className="h-11 w-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl font-bold transition-all flex items-center justify-center border border-slate-700 active:scale-95"
            >
              −
            </button>
            <div className="w-24 text-center">
              <span className="text-2xl font-black text-white">{partySize}</span>
              <span className="text-xs font-medium text-slate-400 block">
                {partySize === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>
            <button
              type="button"
              onClick={incrementParty}
              disabled={partySize >= maxParty || isPending}
              className="h-11 w-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xl font-bold transition-all flex items-center justify-center border border-slate-700 active:scale-95"
            >
              +
            </button>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Party size limits: {minParty} – {maxParty} guests
          </span>
        </div>

        {/* Customer Name */}
        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Your Name <span className="text-emerald-400">*</span>
          </label>
          <input
            id="customerName"
            type="text"
            name="customerName"
            required
            placeholder="e.g. Rahul Sharma"
            disabled={isPending}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Customer Mobile Number */}
        <div className="space-y-1.5">
          <label htmlFor="customerPhone" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Mobile Phone Number <span className="text-slate-500">(Recommended)</span>
          </label>
          <input
            id="customerPhone"
            type="tel"
            name="customerPhone"
            placeholder="e.g. 98765 43210"
            disabled={isPending}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <span className="text-[10px] text-slate-500 block">
            Used to keep your place in line and prevent duplicate joins.
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Joining Line...
            </>
          ) : (
            'JOIN THE QUEUE'
          )}
        </button>
      </form>
    </div>
  );
}
