import React from 'react';
import { Clock, CirclePause, CircleX, Users, Timer } from 'lucide-react';
import type { QueueLandingState } from '@/lib/customer-join-ux';
import { formatWaitLabel } from '@/lib/customer-join-ux';

export interface NextOpeningInfo {
  dayOffset: number;
  dayLabel: string;
  opensAt12h: string;
}

interface QueueStatusCardProps {
  state: QueueLandingState;
  waitingCount: number;
  waitLabel: string | null;
  nextOpening?: NextOpeningInfo | null;
  capacity?: { active: number; max: number };
}

/**
 * Phase 4A — Live queue status card.
 * Pure presentation of the AUTHORITATIVE backend state passed in as props.
 * Never decides joinability itself; the page does that via resolveJoinability.
 */
export function QueueStatusCard({
  state,
  waitingCount,
  waitLabel,
  nextOpening,
  capacity,
}: QueueStatusCardProps) {
  if (state === 'OPEN' || state === 'CLOSING_SOON') {
    return (
      <section
        aria-label="Live queue status"
        aria-live="polite"
        className="qf-card relative overflow-hidden rounded-3xl p-5 sm:p-6"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-emerald-400 to-teal-400" />
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              {state === 'CLOSING_SOON' ? '⚡ Closing soon — join now' : '● Live · Join now'}
            </p>
            <p className="mt-1 truncate text-base font-black tracking-tight text-white">
              {waitingCount === 0
                ? '✨ No wait — walk right in'
                : `${waitingCount} ${waitingCount === 1 ? 'party' : 'parties'} waiting`}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
            <p className="flex items-center justify-center gap-1 text-2xl font-black tabular-nums tracking-tight text-white">
              <Clock aria-hidden="true" className="h-5 w-5 text-amber-400" />
              {waitLabel ?? formatWaitLabel(null)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">est. wait</p>
          </div>
        </div>
        {state === 'CLOSING_SOON' && (
          <p className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-200">
            ⏰ The queue is nearing closing. Join now while spots are still available.
          </p>
        )}
      </section>
    );
  }

  if (state === 'FULL') {
    const pct = capacity ? Math.min(100, Math.round((capacity.active / Math.max(1, capacity.max)) * 100)) : 100;
    return (
      <section
        aria-label="Queue status: full"
        aria-live="polite"
        className="qf-card relative overflow-hidden rounded-3xl p-6 text-center sm:p-8"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-orange-500/30">
          <Users aria-hidden="true" className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-white">
          House full right now 🔥
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300 sm:text-sm">
          Every table is buzzing! Spots open as guests are seated — hang tight and check again shortly.
        </p>
        {capacity && (
          <div className="mx-auto mt-4 max-w-[280px]">
            <div className="qf-track h-2.5 overflow-hidden rounded-full">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] font-black uppercase tracking-widest text-amber-300">
              {capacity.active} of {capacity.max} spots taken
            </p>
          </div>
        )}
      </section>
    );
  }

  if (state === 'PAUSED') {
    return (
      <section
        aria-label="Queue status: paused"
        aria-live="polite"
        className="qf-card relative overflow-hidden rounded-3xl p-6 text-center sm:p-8"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-500" />
        <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg">
          <CirclePause aria-hidden="true" className="h-8 w-8 text-white" />
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-white">
          Quick breather ⏸️
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300 sm:text-sm">
          The host has briefly paused new entries. Your existing ticket stays active — check back in a bit!
        </p>
      </section>
    );
  }

  // CLOSED (includes disabled queue + outside operating hours)
  return (
    <section
      aria-label="Queue status: closed"
      aria-live="polite"
      className="qf-card relative overflow-hidden rounded-3xl p-6 text-center sm:p-8"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-600 to-slate-500" />
      <div aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 shadow-lg">
        <CircleX aria-hidden="true" className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="mt-3 text-xl font-black tracking-tight text-white">
        We&apos;ll be back soon 🌙
      </h2>
      <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300 sm:text-sm">
        The queue is resting right now. Come back a little later — or ask the host for help.
      </p>
      {nextOpening ? (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[13px] font-black text-emerald-300">
          <Timer aria-hidden="true" className="h-4 w-4" />
          Opens {nextOpening.dayOffset === 0 ? 'today' : nextOpening.dayLabel} at{' '}
          {nextOpening.opensAt12h}
        </p>
      ) : null}
    </section>
  );
}
