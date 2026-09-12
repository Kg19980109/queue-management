'use client';

import React, { useState, useActionState } from 'react';
import { joinQueuePublicAction, JoinQueueState } from '@/app/q/actions';
import type { PublicRestaurantInfo } from '@/lib/services/public-restaurant-service';

interface QueueJoinFormProps {
  restaurant: PublicRestaurantInfo;
  waitingCount?: number;
  avgWaitMins?: number | null;
}

export function QueueJoinForm({ restaurant, waitingCount, avgWaitMins }: QueueJoinFormProps) {
  const minParty = restaurant.minPartySize || 1;
  const maxParty = restaurant.maxPartySize || 20;

  const [partySize, setPartySize] = useState<number>(Math.min(2, maxParty));
  const [state, formAction, isPending] = useActionState<JoinQueueState | null, FormData>(
    joinQueuePublicAction,
    null
  );

  const incrementParty = () => setPartySize((prev) => Math.min(prev + 1, maxParty));
  const decrementParty = () => setPartySize((prev) => Math.max(prev - 1, minParty));
  const estWaitPreview = waitingCount !== undefined ? Math.max(5, waitingCount * 7) : avgWaitMins ?? 15;

  return (
    <div className="relative bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 overflow-hidden">
      {/* Animated top shimmer */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Live queue insight bar */}
      {waitingCount !== undefined && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-white text-[16px]">groups</span>
            </span>
            <div className="text-left">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest leading-none">{waitingCount} parties ahead</div>
              <div className="text-xs font-black text-white leading-tight">~{estWaitPreview} min wait • Live</div>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
      )}

      <div className="text-center space-y-1.5 relative">
        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Join the Line — Save Your Spot</h2>
        <p className="text-[12px] sm:text-xs text-slate-400 leading-relaxed px-2">
          Enter your details, get a live ticket. We&apos;ll buzz you when it&apos;s your turn.
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

        {/* Party Size Stepper - cool, animated */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-white uppercase tracking-widest text-center">
            Party Size
          </label>
          <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <button
              type="button"
              onClick={decrementParty}
              disabled={partySize <= minParty || isPending}
              className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed text-xl font-black transition-all flex items-center justify-center active:scale-90 shadow"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <span key={partySize} className="text-3xl font-black text-white animate-[scaleIn_0.2s_ease]">{partySize}</span>
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">group</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                {partySize === 1 ? '1 Guest' : `${partySize} Guests`} • {partySize >= 6 ? 'Large group' : partySize <= 2 ? 'Cozy' : 'Standard'}
              </span>
            </div>
            <button
              type="button"
              onClick={incrementParty}
              disabled={partySize >= maxParty || isPending}
              className="h-12 w-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed text-white text-xl font-black transition-all flex items-center justify-center active:scale-90 shadow shadow-emerald-500/20"
            >
              +
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold">{minParty}–{maxParty} guests</span>
            {waitingCount !== undefined && <span className="text-[10px] text-emerald-400 font-bold animate-pulse">• Live queue</span>}
          </div>
        </div>

        {/* Customer Name - with icon */}
        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-xs font-black text-white uppercase tracking-widest">
            Your Name <span className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">person</span>
            <input
              id="customerName"
              type="text"
              name="customerName"
              required
              placeholder="Rahul Sharma"
              disabled={isPending}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-white text-[15px] placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        {/* Customer Mobile */}
        <div className="space-y-1.5">
          <label htmlFor="customerPhone" className="block text-xs font-black text-white uppercase tracking-widest">
            Mobile <span className="text-slate-500 normal-case font-semibold">(for SMS alert)</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">call</span>
            <input
              id="customerPhone"
              type="tel"
              name="customerPhone"
              placeholder="98765 43210"
              disabled={isPending}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-10 pr-4 py-3.5 text-white text-[15px] placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        {/* Submit - lucrative gradient with animated shine */}
        <button
          type="submit"
          disabled={isPending}
          className="relative w-full h-[56px] mt-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 active:scale-[0.98] text-white font-black text-[15px] sm:text-base rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
          {isPending ? (
            <>
              <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Securing your spot...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              Join Queue — Get Ticket
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </>
          )}
        </button>
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-400"></span> Free</span>
          <span className="w-px h-3 bg-white/10"></span>
          <span>No app • SMS update</span>
          <span className="w-px h-3 bg-white/10"></span>
          <span>~10 sec</span>
        </div>
      </form>
    </div>
  );
}
