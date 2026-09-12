import React from 'react';

export function PublicMobileHeader({ restaurantName, queueNumber, estWaitMins }: { restaurantName: string, queueNumber: string, estWaitMins: number | null }) {
  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4">
      {/* Topmost Nav - Production clean */}
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shrink-0 shadow-md">
             <span className="material-symbols-outlined text-[16px] text-white">restaurant</span>
          </div>
          <div className="flex flex-col min-w-0">
             <span className="text-white font-black tracking-tight text-sm leading-none truncate">{restaurantName}</span>
             <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span> Live Queue Ticket
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-[#111827] border border-white/10 rounded-full px-3 py-1.5 shadow-sm">
             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
             <span className="text-xs font-black text-white font-mono">{queueNumber.startsWith('#') ? queueNumber : `#${queueNumber}`}</span>
             {estWaitMins !== null && estWaitMins !== undefined && (
               <span className="text-[10px] text-slate-300 font-bold">· ~{estWaitMins}m</span>
             )}
          </div>
        </div>
      </div>

      {/* Live indicator - subtle, real */}
      <div className="flex items-center justify-center px-4">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
           Live updates every 10s
        </div>
      </div>
    </div>
  );
}
