'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  ListOrdered,
  BellRing,
  Megaphone,
  CheckCircle2,
  Info,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';
import { CancelQueueDialog } from './CancelQueueDialog';
import { ExitDiningDialog } from './ExitDiningDialog';
import { CustomerLateModal } from './CustomerLateModal';
import { QueueProgressMessage } from './QueueProgressMessage';
import { formatWaitLabel } from '@/lib/customer-join-ux';
import { chimeEngine } from '@/lib/audio-chime';
import {
  ticketStateMeta,
  formatTicketNumber,
  positionLabel,
  partiesAheadLabel,
  formatTableNumber,
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
    ring: 'border-sky-500/40 shadow-[0_0_30px_rgba(56,189,248,0.15)]',
    pill: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
    dot: 'bg-sky-400',
  },
  success: {
    ring: 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    pill: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  muted: {
    ring: 'border-slate-700',
    pill: 'border-slate-700 bg-slate-800 text-slate-300',
    dot: 'bg-slate-500',
  },
};

const STAGE_LABELS = ['Wait', 'Close', 'Called', 'Seated'] as const;

/**
 * Phase 4D — Customer digital ticket with CALLED / SEATED experience.
 *
 * Pure presentation over the authoritative `status` prop (server-rendered
 * from `getQueueStatusByToken`). When CALLED, waiting metrics are removed,
 * and the return-to-restaurant instruction dominates. When SEATED,
 * cancellation is disabled and clean menu handoff is presented.
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
  const posLabel = positionLabel(status.position, status.status);
  const aheadLabel = partiesAheadLabel(status.peopleAhead);
  const waitLabel = meta.showWaitInfo ? formatWaitLabel(status.estimatedWaitMins) : null;
  const operatingNote = operatingNoteForTicket(status.status, queueEnabled, operatingState);
  const isCalled = status.status === 'CALLED';
  const isCompleted = !!status.completedAt;
  const isSeated = status.status === 'SEATED';
  const isTerminal = status.status === 'CANCELLED' || status.status === 'NO_SHOW' || status.status === 'EXPIRED' || isCompleted;
  const tableDisplay = isSeated ? formatTableNumber(status.tableNumber) : null;

  // Accessible live announcement: announce ONLY when status changes between renders,
  // preventing repeated announcements during 10s background polling.
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


  const [activeTab, setActiveTab] = useState<'status' | 'radar' | 'actions'>('status');

  const StateIcon = isCalled
    ? Megaphone
    : isSeated
      ? CheckCircle2
      : status.status === 'NOTIFIED'
        ? BellRing
        : Info;

  return (
    <section
      aria-label={`Queue ticket ${ticketNo}`}
      className={`qf-card animate-fadeUp relative overflow-hidden rounded-3xl p-4 sm:p-7 flex flex-col ${tone.ring} ${
        isCalled ? 'ring-2 ring-sky-400/40' : isSeated ? 'ring-2 ring-emerald-400/30' : ''
      }`}
      style={{ animationDelay: '120ms', minHeight: isTerminal ? 'auto' : '85vh', maxHeight: isTerminal ? 'none' : '90vh' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-emerald-400 to-teal-400"
      />

      {/* Screen-reader announcement only on authoritative state transitions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Hero: queue number (ALWAYS VISIBLE AT TOP) */}
      <div className="text-center shrink-0">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
          🎟️ Your number
        </p>
        <p
          aria-label={`Your queue number is ${ticketNo}`}
          className="qf-display mt-2 font-mono text-6xl sm:text-7xl font-black tabular-nums tracking-tight drop-shadow-[0_4px_24px_rgba(52,211,153,0.35)]"
        >
          {ticketNo}
        </p>
        {restaurantName && (
          <p className="mt-1 truncate text-sm font-black tracking-tight text-white">
            {restaurantName}
          </p>
        )}
        <div className="mt-1 flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300">
            👤 {status.customerName} · {status.partySize} {status.partySize === 1 ? 'guest' : 'guests'}
          </span>
          {!isTerminal && (
            <button
              type="button"
              onClick={() => {
                chimeEngine.playBuzzerSound();
                setBuzzerTested(true);
                setTimeout(() => setBuzzerTested(false), 2500);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Test soothing notification sound and vibration"
            >
              <span>{buzzerTested ? '✨' : '🔔'}</span>
              <span>{buzzerTested ? 'Chiming...' : 'Test Chime'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA FOR TABS */}
      <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar pb-6 hide-scrollbar">
        
        {/* CALLED / SEATED HERO (Overrides tabs if active) */}
        {isCalled && (
          <div
            role="region"
            aria-label="Table called notice"
            className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-center transition-all duration-300 motion-safe:animate-fadeIn"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/15 px-3 py-1 text-xs font-bold text-sky-200">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
              </span>
              <Megaphone aria-hidden="true" className="h-3.5 w-3.5 text-sky-300" />
              YOUR TURN IS HERE
            </div>
            <h2 className="mt-2.5 text-lg font-black tracking-tight text-white sm:text-xl">
              Your table is being called
            </h2>
            <p className="mx-auto mt-1 max-w-[280px] text-sm font-semibold leading-relaxed text-sky-100">
              Please return to the restaurant now.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Please check in with the host at the entrance</span>
            </div>
            
            <div className="mt-6 flex flex-col gap-2">
              <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
            </div>
          </div>
        )}

        {isSeated && (
          <div
            role="region"
            aria-label={isCompleted ? "Dining completed notice" : "Seated notice"}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center transition-all duration-300 motion-safe:animate-fadeIn"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
              {isCompleted ? 'DINING COMPLETED' : 'SEATED'}
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
              {isCompleted ? 'Dining completed · Thank you!' : "You're seated!"}
            </h2>
            <p className="mx-auto mt-1 max-w-[280px] text-sm font-medium leading-relaxed text-emerald-100/90">
              {isCompleted ? 'We hope you enjoyed your meal! You have exited the queue.' : 'The wait is over — enjoy your meal.'}
            </p>
            {tableDisplay && !isCompleted && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-3.5 py-1.5 text-xs font-bold text-emerald-200">
                <span>Seated at:</span>
                <span className="font-mono text-white">{tableDisplay}</span>
              </div>
            )}

            {!isCompleted && (
              <div className="mt-4 pt-3 border-t border-emerald-500/20 text-center">
                <p className="text-[11px] text-emerald-200/80 mb-2">
                  Leaving after dining or planning another visit later today?
                </p>
                <ExitDiningDialog token={token} restaurantSlug={restaurantSlug} />
              </div>
            )}
            
            {isCompleted ? (
              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href={`/q/${restaurantSlug}`}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
                >
                  Join the queue again
                </a>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href={`/q/${restaurantSlug}/menu?qtoken=${token}`}
                  className="qf-cta flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-black text-white shadow-lg shadow-orange-500/30 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <UtensilsCrossed aria-hidden="true" className="h-4 w-4" />
                  <span>View Menu</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )}
        
        {isTerminal && !isSeated && !isCalled && (
          <div className="mt-4 text-center animate-fadeIn">
            <p className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold ${tone.pill}`}>
              <StateIcon aria-hidden="true" className="h-3.5 w-3.5" />
              {meta.title}
            </p>
            <p className="mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300">
              {meta.subtitle}
            </p>
            <p className="mx-auto mt-1 max-w-[300px] text-[12px] leading-relaxed text-slate-400">
              {meta.guidance}
            </p>
            <div className="mt-6">
              <a
                href={`/q/${restaurantSlug}`}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
              >
                Join the queue again
              </a>
            </div>
          </div>
        )}

        {/* TABBED CONTENT FOR WAITING/NOTIFIED STATES */}
        {!isCalled && !isSeated && !isTerminal && (
          <>
            {/* STATUS TAB */}
            <div className={activeTab === 'status' ? 'block animate-fadeIn' : 'hidden'}>
              <div className="text-center">
                <p className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold ${tone.pill}`}>
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full ${tone.dot} opacity-75 motion-safe:animate-ping`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
                  </span>
                  <StateIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  {meta.title}
                </p>
                <p className="mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-slate-300">
                  {meta.subtitle}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-4" role="img" aria-label={`Queue progress: stage ${meta.stage + 1} of 4 (${STAGE_LABELS[meta.stage]})`}>
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
                      <p className={`mt-1 text-[8px] font-bold uppercase tracking-wider ${i <= meta.stage ? 'text-slate-300' : 'text-slate-600'}`}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <QueueProgressMessage
                  status={status.status}
                  peopleAhead={status.peopleAhead}
                  isAlmostYourTurn={status.isAlmostYourTurn}
                />
              </div>

              {meta.showWaitInfo && (
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  <div className="min-w-0 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-2.5 text-center flex flex-col justify-center">
                    <dt className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-violet-300 mb-1">
                      <ListOrdered aria-hidden="true" className="h-3 w-3 shrink-0" />
                      Place
                    </dt>
                    <dd
                      aria-label={posLabel ?? 'Position unavailable'}
                      key={status.position ?? 'none'}
                      className="truncate text-xl font-black tabular-nums text-white motion-safe:animate-numberPop"
                    >
                      {status.position === null || status.position <= 0
                        ? '—'
                        : status.position === 1
                          ? 'Next'
                          : `#${status.position}`}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-2.5 text-center flex flex-col justify-center">
                    <dt className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300 mb-1">
                      <Users aria-hidden="true" className="h-3 w-3 shrink-0" />
                      Ahead
                    </dt>
                    <dd
                      aria-label={aheadLabel ?? 'Parties ahead unavailable'}
                      className="truncate text-xl font-black tabular-nums text-emerald-200"
                    >
                      {status.peopleAhead === null || status.peopleAhead < 0 ? '—' : status.peopleAhead}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-2.5 text-center flex flex-col justify-center">
                    <dt className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-300 mb-1">
                      <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
                      Wait
                    </dt>
                    <dd className="truncate text-xl font-black tabular-nums text-amber-200">
                      {waitLabel}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {/* RADAR TAB */}
            <div className={activeTab === 'radar' ? 'block animate-fadeIn' : 'hidden'}>
              <div className="rounded-2xl border border-white/10 bg-[#0B101B]/80 p-4 flex flex-col gap-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    Live Radar
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {status.peopleAhead === 0 ? (
                      <span className="text-emerald-400 font-black">Front ✨</span>
                    ) : (
                      <span>{status.peopleAhead} ahead</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">📢 Now Calling</span>
                    <span className="font-mono text-lg font-black text-amber-300 truncate">
                      {status.nowCallingNumber ? `Q-${status.nowCallingNumber.replace(/^#+/, '')}` : 'Prep...'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">⏱️ Up Next</span>
                    <span className="font-mono text-lg font-black text-cyan-300 truncate">
                      {status.position === 1 ? 'YOU' : status.upNextNumber ? `Q-${status.upNextNumber.replace(/^#+/, '')}` : 'Next'}
                    </span>
                  </div>
                </div>

                {status.recentlySeatedNumbers && status.recentlySeatedNumbers.length > 0 && (
                  <div className="flex items-center justify-between text-[10px] pt-2 text-slate-400 border-t border-white/5">
                    <span className="flex items-center gap-1 font-semibold text-slate-400">🪑 Seated:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 flex-wrap justify-end">
                      {status.recentlySeatedNumbers.map((num, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                          Q-{num.replace(/^#+/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS TAB */}
            <div className={activeTab === 'actions' ? 'block animate-fadeIn' : 'hidden'}>
              <div className="flex flex-col gap-3">
                <CustomerLateModal
                  token={token}
                  restaurantSlug={restaurantSlug}
                  customerName={status.customerName}
                  lateInfo={status.lateInfo}
                  initialMessages={status.chatMessages || []}
                />
                
                <div className="pt-2 border-t border-white/5">
                  <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
                </div>
              </div>
            </div>
            
            {operatingNote && activeTab === 'actions' && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-[11px] leading-relaxed text-slate-400">
                {operatingNote}
              </p>
            )}
          </>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION TABS (Only for waiting/notified states) */}
      {!isCalled && !isSeated && !isTerminal && (
        <div className="mt-auto pt-4 shrink-0 flex items-center justify-between gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'status' 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Info className="h-5 w-5" />
            <span className="text-[10px] font-bold">Status</span>
          </button>
          
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'radar' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">radar</span>
            <span className="text-[10px] font-bold">Radar</span>
          </button>
          
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'actions' 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            <span className="text-[10px] font-bold">Actions</span>
          </button>
        </div>
      )}
    </section>
  );
}
