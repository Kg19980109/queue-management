'use client';

import React from 'react';
import {
  Users,
  Clock,
  ListOrdered,
  BellRing,
  Megaphone,
  PartyPopper,
  Info,
} from 'lucide-react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';
import { CancelQueueDialog } from './CancelQueueDialog';
import { QueueProgressMessage } from './QueueProgressMessage';
import { formatWaitLabel } from '@/lib/customer-join-ux';
import {
  ticketStateMeta,
  formatTicketNumber,
  positionLabel,
  partiesAheadLabel,
  operatingNoteForTicket,
  type TicketTone,
} from '@/lib/customer-ticket-ux';

interface QueueTicketCardProps {
  status: PublicQueueStatusResponse;
  token: string;
  restaurantSlug: string;
  restaurantName?: string;
  queueEnabled?: boolean;
  operatingState?: 'OPEN' | 'PAUSED' | 'CLOSING_SOON' | 'CLOSED';
}

const TONE_STYLES: Record<TicketTone, { ring: string; pill: string; dot: string }> = {
  waiting: {
    ring: 'border-emerald-500/30',
    pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  'getting-close': {
    ring: 'border-amber-500/30',
    pill: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  urgent: {
    ring: 'border-sky-500/40',
    pill: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
    dot: 'bg-sky-400',
  },
  success: {
    ring: 'border-emerald-500/30',
    pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  muted: {
    ring: 'border-slate-700',
    pill: 'border-slate-700 bg-slate-800 text-slate-300',
    dot: 'bg-slate-500',
  },
};

const STAGE_LABELS = ['Wait', 'Called', 'Ready', 'Seated'] as const;

/**
 * Phase 4B — Customer digital ticket.
 *
 * Pure presentation over the authoritative `status` prop (server-rendered
 * from `getQueueStatusByToken` — the same ordering + ETA source the staff
 * dashboard reads). Never fetches, never stores tokens, never invents
 * position/ETA. Realtime/polling revalidates the page; this component
 * simply renders the fresh prop.
 */
export function QueueTicketCard({
  status,
  token,
  restaurantSlug,
  restaurantName,
  queueEnabled = true,
  operatingState = 'OPEN',
}: QueueTicketCardProps) {
  const meta = ticketStateMeta(status.status);
  const tone = TONE_STYLES[meta.tone];
  const ticketNo = formatTicketNumber(status.displayNumber, status.entryId);
  const posLabel = positionLabel(status.position);
  const aheadLabel = partiesAheadLabel(status.peopleAhead);
  const waitLabel = meta.showWaitInfo ? formatWaitLabel(status.estimatedWaitMins) : null;
  const operatingNote = operatingNoteForTicket(status.status, queueEnabled, operatingState);
  const isTerminal = !meta.showWaitInfo;
  const StateIcon =
    status.status === 'CALLED' ? Megaphone : status.status === 'NOTIFIED' ? BellRing : status.status === 'SEATED' ? PartyPopper : Info;

  return (
    <section
      aria-label={`Queue ticket ${ticketNo}`}
      className={`relative overflow-hidden rounded-3xl border bg-slate-900/90 p-5 shadow-2xl backdrop-blur sm:p-7 ${tone.ring} ${
        status.status === 'CALLED' ? 'ring-2 ring-sky-400/30' : ''
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      {/* Hero: queue number */}
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Your number
        </p>
        <p
          aria-label={`Your queue number is ${ticketNo}`}
          className="mt-1 font-mono text-6xl font-black tabular-nums tracking-tight text-white sm:text-7xl"
        >
          {ticketNo}
        </p>
        {restaurantName && (
          <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-400">
            {restaurantName}
          </p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          {status.customerName} · party of {status.partySize}
        </p>
      </div>

      {/* State: announced to assistive tech on refresh-driven change */}
      <div aria-live="polite" aria-atomic="true" className="mt-5 text-center">
        <p
          className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold ${tone.pill}`}
        >
          <span aria-hidden="true" className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full rounded-full ${tone.dot} opacity-75 motion-safe:animate-ping`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
          </span>
          <StateIcon aria-hidden="true" className="h-3.5 w-3.5" />
          {meta.title}
        </p>
        <p className="mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300">
          {meta.subtitle}
        </p>
        <p className="mx-auto mt-1 max-w-[300px] text-[12px] leading-relaxed text-slate-400">
          {meta.guidance}
        </p>
      </div>

      {/* Phase 4C proximity guidance: WAITING urgency levels only. */}
      <QueueProgressMessage
        status={status.status}
        peopleAhead={status.peopleAhead}
        isAlmostYourTurn={status.isAlmostYourTurn}
      />

      {/* Wait facts: position · ahead · ETA (compact values, full text to AT) */}
      {meta.showWaitInfo && (
        <dl className="mt-5 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <ListOrdered aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Place
            </dt>
            <dd
              aria-label={posLabel ?? 'Position unavailable'}
              // Keyed remount pops subtly on position change (4 → 3) with
              // no layout shift; reduced-motion users get a plain swap.
              key={status.position ?? 'none'}
              className="mt-1 truncate text-xl font-black tabular-nums text-white motion-safe:animate-numberPop"
            >
              {status.position === null || status.position <= 0
                ? '—'
                : status.position === 1
                  ? 'Next'
                  : `#${status.position}`}
            </dd>
            <dd className="truncate text-[10px] font-semibold text-slate-500">
              {status.position === 1 ? 'front of line' : 'in line'}
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3 text-center">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Ahead
            </dt>
            <dd
              aria-label={aheadLabel ?? 'Parties ahead unavailable'}
              className="mt-1 truncate text-xl font-black tabular-nums text-emerald-300"
            >
              {status.peopleAhead === null || status.peopleAhead < 0 ? '—' : status.peopleAhead}
            </dd>
            <dd className="truncate text-[10px] font-semibold text-emerald-400/70">
              {status.peopleAhead === 0
                ? 'no one ahead'
                : status.peopleAhead === 1
                  ? '1 party ahead'
                  : 'parties ahead'}
            </dd>
          </div>
          <div className="min-w-0 rounded-2xl border border-blue-500/25 bg-blue-500/[0.07] p-3 text-center">
            <dt className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">
              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Wait
            </dt>
            <dd className="mt-1 truncate text-xl font-black tabular-nums text-blue-200">
              {waitLabel}
            </dd>
            <dd className="truncate text-[10px] font-semibold text-blue-300/70">
              live estimate
            </dd>
          </div>
        </dl>
      )}

      {/* Honest progress: stages, never percentages */}
      {!isTerminal && (
        <div className="mt-5" role="img" aria-label={`Queue progress: stage ${meta.stage + 1} of 4 (${STAGE_LABELS[meta.stage]})`}>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {STAGE_LABELS.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <div
                  className={`h-1.5 rounded-full ${
                    i < meta.stage
                      ? tone.dot
                      : i === meta.stage
                        ? `${tone.dot} motion-safe:animate-pulse`
                        : 'bg-white/10'
                  }`}
                />
                <p className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider ${i <= meta.stage ? 'text-slate-300' : 'text-slate-600'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operating note: paused/closed never cancels an existing ticket */}
      {operatingNote && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] leading-relaxed text-slate-400">
          {operatingNote}
        </p>
      )}

      {/* Actions */}
      <div className="mt-5">
        {!isTerminal ? (
          <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
        ) : (
          <a
            href={`/q/${restaurantSlug}`}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Join the queue again
          </a>
        )}
      </div>
    </section>
  );
}
