'use client';

import React, { useState, useTransition } from 'react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';
import { CancelQueueDialog } from './CancelQueueDialog';
import { delayQueuePublicAction } from '@/app/q/actions';

interface QueueTicketCardProps {
  status: PublicQueueStatusResponse;
  token: string;
  restaurantSlug: string;
}

export function QueueTicketCard({ status, token, restaurantSlug }: QueueTicketCardProps) {
  const [isDelayPending, startDelayTransition] = useTransition();
  const [delayRequested, setDelayRequested] = useState(false);
  const isWaiting = status.status === 'WAITING';

  // Calculate rough wait estimate based on position (e.g. ~5-8 mins per waiting party)
  const estWaitMins = isWaiting && status.position ? Math.max(5, (status.position - 1) * 7) : null;
  
  const displayNum = status.displayNumber || `#${status.entryId.substring(0, 4).toUpperCase()}`;

  return (
    <div className="w-full px-1">
      <div className="relative bg-[#111827] border border-white/5 rounded-[32px] p-6 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Central Circular Pass */}
        <div className="relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center border border-white/10 mt-2 mb-6">
           <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-emerald-500/5"></div>
           <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
             <circle cx="96" cy="96" r="94" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
             <circle cx="96" cy="96" r="94" fill="none" stroke="url(#gradient)" strokeWidth="4" strokeDasharray="590" strokeDashoffset="150" strokeLinecap="round" />
             <defs>
               <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#3B82F6" />
                 <stop offset="100%" stopColor="#10B981" />
               </linearGradient>
             </defs>
           </svg>
           
           <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-2">Your Pass</span>
           <span className="text-5xl font-black text-white tracking-tighter my-1">#{displayNum}</span>
           <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/30 rounded-full px-2.5 py-0.5 mt-1">
             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
             <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">VIP Guest</span>
           </div>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-black text-white tracking-tight relative z-10 mb-2">
          {status.peopleAhead !== null && status.peopleAhead > 0 ? `${status.peopleAhead} Groups Ahead` : "You're Next!"}
        </h2>
        <p className="text-xs text-slate-400 text-center leading-relaxed max-w-[280px] relative z-10 mb-6">
          You are next in sequence for premium seating. Table T4 is undergoing luxury setup.
        </p>

        {/* Time / Table Status Row */}
        <div className="flex items-center gap-3 relative z-10 w-full justify-center mb-8">
           <div className="bg-[#1A2234] border border-white/5 rounded-full px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
              <span className="text-xs font-bold text-slate-300">~{estWaitMins || '?'} mins wait</span>
           </div>
           <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400">Table T4 Prepping</span>
           </div>
        </div>

        {/* Queue Progression */}
        <div className="w-full relative z-10 mb-6">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Queue Progression</span>
             <span className="text-[10px] text-slate-500 font-bold">Stage 3 of 4</span>
           </div>
           
           {/* Progress Bars */}
           <div className="grid grid-cols-4 gap-1.5 mb-2">
             <div className="h-1.5 rounded-full bg-blue-500"></div>
             <div className="h-1.5 rounded-full bg-blue-500"></div>
             <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
             <div className="h-1.5 rounded-full bg-white/10"></div>
           </div>
           
           {/* Labels */}
           <div className="grid grid-cols-4 gap-1.5">
             <span className="text-[9px] font-bold text-slate-300">Checked In</span>
             <span className="text-[9px] font-bold text-slate-300">Assigned #{displayNum}</span>
             <span className="text-[9px] font-bold text-purple-400">Setting T4</span>
             <span className="text-[9px] font-bold text-slate-600">Host Call</span>
           </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 w-full relative z-10">
           <button 
             onClick={() => {
               if (delayRequested) return;
               startDelayTransition(async () => {
                 await delayQueuePublicAction(token, restaurantSlug);
                 setDelayRequested(true);
               });
             }}
             disabled={isDelayPending || delayRequested}
             className="bg-[#1A2234] hover:bg-[#232D42] disabled:opacity-50 border border-white/5 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                {delayRequested ? 'check' : 'update'}
              </span>
              <span className="text-sm font-bold text-slate-300">
                {isDelayPending ? 'Sending...' : delayRequested ? 'Requested' : '+10m Delay'}
              </span>
           </button>
           <div className="w-full">
             <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
           </div>
        </div>

      </div>
    </div>
  );
}
