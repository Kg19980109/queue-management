import React from 'react';

export function PublicMobileHeader({ restaurantName, queueNumber, estWaitMins }: { restaurantName: string, queueNumber: string, estWaitMins: number | null }) {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Topmost Nav */}
      <div className="flex items-center justify-between px-4 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center">
             <span className="material-symbols-outlined text-[16px] text-white">restaurant</span>
          </div>
          <div className="flex flex-col">
             <span className="text-white font-black tracking-tight text-sm leading-none">{restaurantName}</span>
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Pre-Order</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111827] border border-white/5 rounded-full px-3 py-1.5 shadow-sm">
             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
             <span className="text-xs font-bold text-white">#{queueNumber}</span>
             <span className="text-[10px] text-slate-400 font-bold">~{estWaitMins || '?'}m</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors shadow-sm">
             <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-slate-400">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
           LIVE SYNC ACTIVE · HOST DESK A2
        </div>
        <div className="flex items-center gap-1.5 bg-[#111827] border border-white/5 rounded-full px-2 py-1 text-[10px] font-bold text-slate-400">
           <span className="material-symbols-outlined text-[12px] text-emerald-400">sync</span>
           LiveWeb Synced
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 pb-2">
        <div className="flex items-center bg-[#111827] p-1 rounded-2xl border border-white/5 shadow-sm">
           <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-2.5 shadow-md">
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span className="text-sm font-bold">Queue</span>
           </button>
           <button className="flex-1 flex items-center justify-center gap-2 text-slate-400 rounded-xl py-2.5 hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[16px]">feed</span>
              <span className="text-sm font-bold">Details</span>
           </button>
           <button className="flex-1 flex items-center justify-center gap-2 text-slate-400 rounded-xl py-2.5 hover:bg-white/5 transition-colors relative">
              <span className="material-symbols-outlined text-[16px]">room_service</span>
              <span className="text-sm font-bold">Pre-Order</span>
              <span className="absolute top-1.5 right-2 w-4 h-4 bg-purple-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-sm">2</span>
           </button>
        </div>
      </div>
    </div>
  );
}
