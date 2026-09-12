'use client';

import React from 'react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';
import { CancelQueueDialog } from './CancelQueueDialog';

interface QueueTicketCardProps {
  status: PublicQueueStatusResponse;
  token: string;
  restaurantSlug: string;
}

export function QueueTicketCard({ status, token, restaurantSlug }: QueueTicketCardProps) {
  const isWaiting = status.status === 'WAITING';
  const isCalled = status.status === 'CALLED';
  const isNotified = status.status === 'NOTIFIED';
  const isSeated = status.status === 'SEATED';
  const isCancelled = status.status === 'CANCELLED';
  const isExpired = status.status === 'EXPIRED';
  const isNoShow = status.status === 'NO_SHOW';
  const isCompleted = status.status === 'COMPLETED';
  const isTerminal = ['SEATED','CANCELLED','EXPIRED','NO_SHOW','COMPLETED'].includes(status.status);

  // Use server-calculated wait (respects restaurant ETA settings), fallback only if null
  const estWaitMins = status.estimatedWaitMins ?? (isWaiting && status.position ? Math.max(5, (status.position - 1) * 7) : null);
  
  const rawDisplay = status.displayNumber || status.entryId.substring(0, 4).toUpperCase();
  const displayNum = rawDisplay.startsWith('#') ? rawDisplay : `#${rawDisplay}`;

  // Dynamic content based on status
  let glowColors = 'bg-blue-600/20';
  let gradientColors = 'from-blue-500/10 to-emerald-500/5';
  let svgGradient = (
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3B82F6" />
      <stop offset="100%" stopColor="#10B981" />
    </linearGradient>
  );
  let statusTitle = "You're Next!";
  let statusSubtitle = "You are next in sequence for seating.";
  
  if (isWaiting) {
    statusTitle = status.peopleAhead !== null && status.peopleAhead > 0 ? `${status.peopleAhead} Groups Ahead` : "You're Next!";
    statusSubtitle = "Relax, your spot is secured. We will notify you when it's time.";
  } else if (isCalled) {
    glowColors = 'bg-blue-500/30';
    gradientColors = 'from-blue-500/30 to-blue-400/10';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
    );
    statusTitle = "Preparing Your Table";
    statusSubtitle = "We're almost ready for you! Please stay close to the host stand.";
  } else if (isNotified) {
    glowColors = 'bg-purple-500/30';
    gradientColors = 'from-purple-500/30 to-purple-400/10';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#C084FC" />
      </linearGradient>
    );
    statusTitle = "Your Table is Ready!";
    statusSubtitle = "Please come to the host stand now to be seated.";
  } else if (isSeated) {
    glowColors = 'bg-emerald-500/30';
    gradientColors = 'from-emerald-500/30 to-emerald-400/10';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
    );
    statusTitle = "Welcome!";
    statusSubtitle = "Enjoy your meal. Let us know if you need anything.";
  } else if (isCancelled) {
    glowColors = 'bg-slate-500/20';
    gradientColors = 'from-slate-600/20 to-slate-500/5';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#64748B" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
    );
    statusTitle = "Queue Cancelled";
    statusSubtitle = "Your spot has been cancelled. You can re-join anytime.";
  } else if (isExpired || isNoShow) {
    glowColors = 'bg-amber-500/20';
    gradientColors = 'from-amber-600/20 to-orange-500/5';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    );
    statusTitle = isNoShow ? "Marked as No-Show" : "Queue Expired";
    statusSubtitle = "Your ticket is no longer active. Please join again at the host stand.";
  } else if (isCompleted) {
    glowColors = 'bg-emerald-500/20';
    gradientColors = 'from-emerald-600/20 to-emerald-500/5';
    svgGradient = (
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
    );
    statusTitle = "Visit Completed";
    statusSubtitle = "Thanks for dining with us! We hope to see you again.";
  }

  return (
    <div className="w-full px-1">
      <div className="relative bg-[#111827] border border-white/5 rounded-[32px] p-6 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
        
        {/* Glow Effects */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 ${glowColors} rounded-full blur-3xl pointer-events-none transition-colors duration-700`}></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Central Circular Pass */}
        <div className="relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center border border-white/10 mt-2 mb-6">
           <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradientColors} transition-colors duration-700`}></div>
           <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
             <circle cx="96" cy="96" r="94" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
             <circle cx="96" cy="96" r="94" fill="none" stroke="url(#gradient)" strokeWidth="4" strokeDasharray="590" strokeDashoffset={isWaiting ? '295' : isCalled ? '150' : isNotified ? '50' : '0'} strokeLinecap="round" className="transition-all duration-1000" />
             <defs>
               {svgGradient}
             </defs>
           </svg>
           
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mt-2">Your Pass</span>
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter my-1 truncate max-w-[150px] text-center">{displayNum}</span>
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 mt-1 border ${isTerminal ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isTerminal ? 'bg-slate-400' : 'bg-emerald-400'}`}></span>
              <span className="text-[9px] font-bold uppercase tracking-widest">{isTerminal ? status.status : 'Confirmed'}</span>
            </div>
        </div>

        {/* Status Text */}
        <h2 className="text-2xl font-black text-white tracking-tight relative z-10 mb-2">
          {statusTitle}
        </h2>
        <p className="text-xs text-slate-400 text-center leading-relaxed max-w-[280px] relative z-10 mb-6 h-8">
          {statusSubtitle}
        </p>

        {/* Time / Table Status Row */}
        <div className="flex items-center gap-3 relative z-10 w-full justify-center mb-8 h-8">
           {isWaiting ? (
             <div className="bg-[#1A2234] border border-white/5 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                <span className="text-xs font-bold text-slate-300">~{estWaitMins || '?'} mins wait</span>
             </div>
           ) : isCalled ? (
             <div className="bg-blue-950/30 border border-blue-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-blue-400">Prepping Table</span>
             </div>
           ) : isNotified ? (
             <div className="bg-purple-950/30 border border-purple-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-purple-400">Come to Host</span>
             </div>
           ) : isSeated ? (
             <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                <span className="text-xs font-bold text-emerald-400">Seated</span>
             </div>
           ) : null}
        </div>

        {/* Queue Progression */}
        <div className="w-full relative z-10 mb-6">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Queue Progression</span>
             <span className="text-[10px] text-slate-500 font-bold">
               Stage {isWaiting ? '1' : isCalled ? '2' : isNotified ? '3' : '4'} of 4
             </span>
           </div>
           
           {/* Progress Bars */}
           <div className="grid grid-cols-4 gap-1.5 mb-2">
             <div className="h-1.5 rounded-full bg-blue-500"></div>
             <div className={`h-1.5 rounded-full ${!isWaiting ? 'bg-blue-500' : 'bg-white/10'}`}></div>
             <div className={`h-1.5 rounded-full ${(isNotified || isSeated) ? 'bg-purple-500' : isCalled ? 'bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse' : 'bg-white/10'}`}></div>
             <div className={`h-1.5 rounded-full ${isSeated ? 'bg-emerald-500' : isNotified ? 'bg-gradient-to-r from-purple-500 to-emerald-500 animate-pulse' : 'bg-white/10'}`}></div>
           </div>
           
           {/* Labels */}
           <div className="grid grid-cols-4 gap-1.5">
             <span className="text-[9px] font-bold text-slate-300 truncate">Wait</span>
             <span className={`text-[9px] font-bold truncate ${!isWaiting ? 'text-slate-300' : 'text-slate-600'}`}>Prep</span>
             <span className={`text-[9px] font-bold truncate ${(isNotified || isSeated) ? 'text-purple-400' : isCalled ? 'text-purple-400' : 'text-slate-600'}`}>Ready</span>
             <span className={`text-[9px] font-bold truncate ${isSeated ? 'text-emerald-400' : isNotified ? 'text-emerald-400' : 'text-slate-600'}`}>Seated</span>
           </div>
        </div>

        {/* Actions */}
        {!isTerminal && (
          <div className="flex w-full relative z-10">
             <div className="w-full">
               <CancelQueueDialog token={token} restaurantSlug={restaurantSlug} />
             </div>
          </div>
        )}
        {isTerminal && (
          <div className="flex w-full relative z-10">
            <a href={`/q/${restaurantSlug}`} className="w-full h-11 rounded-xl bg-white text-[#0A0E17] font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Join Queue Again
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
