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
        className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/25"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              {state === 'CLOSING_SOON' ? 'Closing soon — join now' : 'Queue open · Live'}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-white">
              {waitingCount === 0
                ? 'No wait — join right in'
                : `${waitingCount} ${waitingCount === 1 ? 'party' : 'parties'} waiting`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 text-2xl font-black tracking-tight text-white">
              <Clock aria-hidden="true" className="h-5 w-5 text-emerald-400" />
              {waitLabel ?? formatWaitLabel(null)}
            </p>
            <p className="text-[11px] font-medium text-slate-400">estimated wait</p>
          </div>
        </div>
        {state === 'CLOSING_SOON' && (
          <p className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-center text-xs font-semibold text-amber-300">
            The queue is nearing closing. Join now while spots are still available.
          </p>
        )}
      </section>
    );
  }

  if (state === 'FULL') {
    return (
      <section
        aria-label="Queue status: full"
        aria-live="polite"
        className="rounded-3xl bg-slate-900/90 border border-amber-500/25 p-6 sm:p-8 text-center shadow-2xl backdrop-blur"
      >
        <Users aria-hidden="true" className="mx-auto h-10 w-10 text-amber-400" />
        <h2 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-white">
          Queue is full
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] sm:text-sm leading-relaxed text-slate-400">
          The restaurant has reached its current queue capacity. Spots open as
          guests are seated — please check again shortly.
        </p>
        {capacity && (
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-amber-400/80">
            {capacity.active} of {capacity.max} spots taken
          </p>
        )}
      </section>
    );
  }

  if (state === 'PAUSED') {
    return (
      <section
        aria-label="Queue status: paused"
        aria-live="polite"
        className="rounded-3xl bg-slate-900/90 border border-amber-500/25 p-6 sm:p-8 text-center shadow-2xl backdrop-blur"
      >
        <CirclePause aria-hidden="true" className="mx-auto h-10 w-10 text-amber-400" />
        <h2 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-white">
          Queue temporarily paused
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] sm:text-sm leading-relaxed text-slate-400">
          The restaurant has temporarily paused new entries. Existing tickets
          are still active — please check back shortly.
        </p>
      </section>
    );
  }

  // CLOSED (includes disabled queue + outside operating hours)
  return (
    <section
      aria-label="Queue status: closed"
      aria-live="polite"
      className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 text-center shadow-2xl backdrop-blur"
    >
      <CircleX aria-hidden="true" className="mx-auto h-10 w-10 text-slate-500" />
      <h2 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-white">
        Queue currently closed
      </h2>
      <p className="mx-auto mt-1.5 max-w-[300px] text-[13px] sm:text-sm leading-relaxed text-slate-400">
        The restaurant is not accepting new queue entries right now. Please
        check back later or ask the host.
      </p>
      {nextOpening ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-4 py-1.5 text-[13px] font-bold text-emerald-400">
          <Timer aria-hidden="true" className="h-4 w-4" />
          Opens {nextOpening.dayOffset === 0 ? 'today' : nextOpening.dayLabel} at{' '}
          {nextOpening.opensAt12h}
        </p>
      ) : null}
    </section>
  );
}
