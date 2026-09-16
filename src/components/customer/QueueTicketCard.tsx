'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  CheckCircle2,
  Info,
  UtensilsCrossed,
} from 'lucide-react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';
import { CancelQueueDialog } from './CancelQueueDialog';
import { CustomerLateModal } from './CustomerLateModal';
import { formatWaitLabel } from '@/lib/customer-join-ux';
import { chimeEngine } from '@/lib/audio-chime';
import {
  ticketStateMeta,
  formatTicketNumber,
  formatTableNumber,
  operatingNoteForTicket,
} from '@/lib/customer-ticket-ux';

interface QueueTicketCardProps {
  status: PublicQueueStatusResponse;
  token: string;
  restaurantSlug: string;
  restaurantName?: string;
  queueEnabled?: boolean;
  operatingState?: 'OPEN' | 'PAUSED' | 'CLOSING_SOON' | 'CLOSED';
}

export function QueueTicketCard({
  status,
  token,
  restaurantSlug,
  restaurantName,
  queueEnabled = true,
  operatingState = 'OPEN',
}: QueueTicketCardProps) {
  const meta = ticketStateMeta(status.status);
  const ticketNo = formatTicketNumber(status.displayNumber, status.entryId);
  const waitLabel = meta.showWaitInfo ? formatWaitLabel(status.estimatedWaitMins) : null;
  const operatingNote = operatingNoteForTicket(status.status, queueEnabled, operatingState);
  const isCalled = status.status === 'CALLED';
  const isCompleted = !!status.completedAt;
  const isSeated = status.status === 'SEATED';
  const isTerminal =
    status.status === 'CANCELLED' ||
    status.status === 'NO_SHOW' ||
    status.status === 'EXPIRED' ||
    isCompleted;
  const tableDisplay = isSeated ? formatTableNumber(status.tableNumber) : null;

  // Screen-reader announcement only on authoritative state transitions
  const prevStatusRef = useRef(status.status);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [buzzerTested, setBuzzerTested] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== status.status) {
      if (status.status === 'CALLED') {
        chimeEngine.playBuzzerSound();
        setLiveAnnouncement('Your table is being called. Please return to the restaurant now.');
      } else if (status.status === 'NOTIFIED') {
        chimeEngine.playBuzzerSound();
        setLiveAnnouncement('Your table is being prepared. Please start heading to the restaurant.');
      } else if (status.status === 'SEATED') {
        chimeEngine.playSeatChime();
        setLiveAnnouncement(`You are seated. Enjoy your meal.${tableDisplay ? ` ${tableDisplay}.` : ''}`);
      } else {
        setLiveAnnouncement(`${meta.title}. ${meta.guidance}`);
      }
      prevStatusRef.current = status.status;
    }
  }, [status.status, meta.title, meta.guidance, tableDisplay]);

  return (
    <section
      aria-label={`Queue ticket ${ticketNo}`}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 p-5 sm:p-7 shadow-2xl text-center backdrop-blur-xl"
    >
      {/* Screen-reader live announcement */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* 1. HERO QUEUE NUMBER & PARTY IDENTITY */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Queue Ticket
        </span>
        <h1
          aria-label={`Your queue number is ${ticketNo}`}
          className="font-mono text-6xl sm:text-7xl font-black tracking-tight text-white tabular-nums drop-shadow-sm my-1 motion-safe:animate-numberPop"
        >
          {ticketNo}
        </h1>
        {restaurantName && (
          <p className="text-xs font-semibold text-slate-400 truncate max-w-[280px] mx-auto">
            {restaurantName}
          </p>
        )}
        <p className="text-sm font-semibold text-slate-300">
          {status.customerName || 'Guest'} · {status.partySize} {status.partySize === 1 ? 'guest' : 'guests'}
        </p>
      </div>

      {/* 2. STATE PRESENTATION */}

      {/* STATE A: WAITING / NOTIFIED */}
      {!isCalled && !isSeated && !isTerminal && (
        <div className="space-y-5 pt-4">
          {/* Status Badge */}
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              You&apos;re in the queue
            </span>
          </div>

          {/* Key Queue Metrics (Position & Wait Time) */}
          <div className="flex items-center justify-center gap-8 py-2">
            <div>
              <p className="text-3xl font-black font-mono text-white tabular-nums">
                {status.position === 1 ? (
                  <span className="text-emerald-300">Next</span>
                ) : status.peopleAhead !== null && status.peopleAhead >= 0 ? (
                  status.peopleAhead
                ) : (
                  '—'
                )}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                {status.position === 1 ? 'Turn' : 'Parties Ahead'}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-3xl font-black font-mono text-amber-300 tabular-nums">
                {waitLabel ?? '—'}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                Est. Wait
              </p>
            </div>
          </div>

          {/* Clean Linear Queue Progress */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 px-0.5">
              <span className="text-emerald-400 font-extrabold">Waiting</span>
              <span className="text-slate-500">Called</span>
              <span className="text-slate-500">Seated</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full w-1/3 transition-all duration-500" />
            </div>
          </div>

          {/* Contextual Alert: Almost Your Turn (Only when relevant) */}
          {status.isAlmostYourTurn && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-left flex items-start gap-3 motion-safe:animate-fadeIn">
              <span className="text-xl shrink-0" aria-hidden="true">👣</span>
              <div>
                <p className="text-xs font-bold text-amber-200">Almost your turn</p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed mt-0.5">
                  Stay nearby so you don&apos;t miss your table.
                </p>
              </div>
            </div>
          )}

          {/* Live Queue Radar Strip (Compact, non-intrusive) */}
          {(status.nowCallingNumber || status.upNextNumber) && (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>
                Calling: <strong className="text-amber-300">{status.nowCallingNumber ? `Q-${status.nowCallingNumber.replace(/^#+/, '')}` : '—'}</strong>
              </span>
              <span>
                Up next: <strong className="text-cyan-300">{status.position === 1 ? 'YOU' : status.upNextNumber ? `Q-${status.upNextNumber.replace(/^#+/, '')}` : '—'}</strong>
              </span>
            </div>
          )}

          {/* Understated Secondary Actions: Running Late & Leave Queue */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <CustomerLateModal
              token={token}
              restaurantSlug={restaurantSlug}
              customerName={status.customerName}
              lateInfo={status.lateInfo}
              initialMessages={status.chatMessages || []}
            />
            <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
          </div>

          {/* Subtle Chime Test */}
          <div>
            <button
              type="button"
              onClick={() => {
                chimeEngine.playBuzzerSound();
                setBuzzerTested(true);
                setTimeout(() => setBuzzerTested(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <span>{buzzerTested ? '✨' : '🔔'}</span>
              <span>{buzzerTested ? 'Testing sound…' : 'Test notification sound'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE B: CALLED */}
      {isCalled && (
        <div className="space-y-5 pt-4 motion-safe:animate-fadeIn">
          <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-5 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-300">
              <Megaphone className="h-4 w-4 text-sky-300" />
              YOUR TURN IS HERE
            </div>
            <h2 className="text-xl font-black text-white">
              Please return to the restaurant now.
            </h2>
            <p className="text-xs text-sky-100/90 leading-relaxed max-w-[280px] mx-auto">
              Please head to the restaurant entrance now to be seated.
            </p>
          </div>

          {/* Progress: 2/3 filled */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 px-0.5">
              <span className="text-emerald-400 font-extrabold">Waiting ✓</span>
              <span className="text-sky-300 font-extrabold">Called</span>
              <span className="text-slate-500">Seated</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full w-2/3 transition-all duration-500" />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
          </div>
        </div>
      )}

      {/* STATE C: SEATED */}
      {isSeated && (
        <div className="space-y-5 pt-4 motion-safe:animate-fadeIn">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {isCompleted ? 'Dining completed' : "You're seated"}
            </div>
            <h2 className="text-xl font-black text-white">
              {isCompleted ? 'Thank you for dining with us!' : 'Enjoy your meal!'}
            </h2>
            {tableDisplay && !isCompleted && (
              <p className="font-mono text-sm font-bold text-emerald-200">
                Seated at: {tableDisplay}
              </p>
            )}
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              {isCompleted
                ? 'We hope you enjoyed your visit. You have exited the queue.'
                : 'The wait is over — relaxed dining ahead.'}
            </p>
          </div>

          {/* Progress: 100% complete */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 px-0.5">
              <span className="text-emerald-400 font-extrabold">Waiting ✓</span>
              <span className="text-emerald-400 font-extrabold">Called ✓</span>
              <span className="text-emerald-400 font-extrabold">Seated ✓</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full w-full transition-all duration-500" />
            </div>
          </div>

          {/* Primary Action */}
          {isCompleted ? (
            <a
              href={`/q/${restaurantSlug}`}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              Join the queue again
            </a>
          ) : (
            <Link
              href={`/q/${restaurantSlug}/menu?qtoken=${token}`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <UtensilsCrossed className="h-4 w-4" />
              <span>View Menu &amp; Order</span>
            </Link>
          )}
        </div>
      )}

      {/* STATE D: TERMINAL (Left / Expired / No-Show) */}
      {isTerminal && !isSeated && !isCalled && (
        <div className="space-y-4 pt-4 motion-safe:animate-fadeIn">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Info className="h-4 w-4 text-slate-400" />
              {meta.title}
            </div>
            <p className="text-sm font-semibold text-white">{meta.subtitle}</p>
            <p className="text-xs text-slate-400">{meta.guidance}</p>
          </div>

          <a
            href={`/q/${restaurantSlug}`}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Join the queue again
          </a>
        </div>
      )}

      {/* Operating Note if any */}
      {operatingNote && (
        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
          {operatingNote}
        </p>
      )}
    </section>
  );
}

