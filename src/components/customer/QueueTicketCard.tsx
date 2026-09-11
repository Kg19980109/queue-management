import React from 'react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';

interface QueueTicketCardProps {
  status: PublicQueueStatusResponse;
}

export function QueueTicketCard({ status }: QueueTicketCardProps) {
  const isWaiting = status.status === 'WAITING';

  // Calculate rough wait estimate based on position (e.g. ~5-8 mins per waiting party)
  const estWaitMins = isWaiting && status.position ? Math.max(5, (status.position - 1) * 7) : null;

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
      {/* Decorative Ticket Accents */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-950 border border-slate-800" />

      {/* Ticket Header */}
      <div className="text-center space-y-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
          Official Digital Ticket
        </span>
        <h2 className="text-lg font-bold text-white tracking-tight">
          {status.restaurantName}
        </h2>
      </div>

      {/* Prominent Queue Display Number */}
      <div className="text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl py-6 px-4 space-y-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Your Queue Number
        </span>
        <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight font-mono">
          {status.displayNumber || `Q-${status.entryId.substring(0, 4).toUpperCase()}`}
        </div>
      </div>

      {/* Position & Stats Grid */}
      {isWaiting && status.position !== null && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-2xl space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Position
            </span>
            <div className="text-2xl font-black text-amber-400">#{status.position}</div>
            <span className="text-[10px] text-slate-500 block">in line</span>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/60 p-3.5 rounded-2xl space-y-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              People Ahead
            </span>
            <div className="text-2xl font-black text-white">{status.peopleAhead ?? 0}</div>
            <span className="text-[10px] text-slate-500 block">
              {status.peopleAhead === 1 ? 'party' : 'parties'} ahead
            </span>
          </div>
        </div>
      )}

      {/* Customer Information Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400 px-1">
        <div>
          <span className="font-semibold text-white">{status.customerName}</span>
          <span className="text-slate-500 block">
            Party of {status.partySize} ({status.partySize === 1 ? 'guest' : 'guests'})
          </span>
        </div>

        {estWaitMins && (
          <div className="text-right">
            <span className="text-amber-400 font-bold">~{estWaitMins} mins</span>
            <span className="text-slate-500 block">Est. Wait Time</span>
          </div>
        )}
      </div>
    </div>
  );
}
