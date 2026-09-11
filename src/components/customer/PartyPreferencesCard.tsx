import React from 'react';

export function PartyPreferencesCard({ customerName, phone }: { customerName: string, phone: string | null }) {
  return (
    <div className="w-full flex flex-col gap-3 mt-8">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xl font-bold text-white tracking-tight">Your Party & Comfort</h3>
        <button className="w-8 h-8 rounded-full bg-[#111827] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[16px]">tune</span>
        </button>
      </div>
      <p className="text-xs text-slate-400 px-1 -mt-3 mb-2">Live preferences shared with Hostess & Kitchen</p>

      {/* User Info */}
      <div className="bg-[#111827] rounded-[24px] p-4 border border-white/5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {customerName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold">{customerName}</span>
              <span className="material-symbols-outlined text-[14px] text-emerald-400">verified</span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5">{phone || '+91 98765-43210'} · SMS alerts...</span>
          </div>
        </div>
        <button className="text-sm font-bold text-slate-300 hover:text-white px-2">Edit</button>
      </div>

      {/* Party Size & Setup */}
      <div className="flex flex-col gap-2 mt-2 px-1">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Party Size & Setup</span>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0">
             <span className="material-symbols-outlined text-[18px] text-blue-400">group</span>
             <span className="text-sm font-bold text-blue-400">2 Adults</span>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0 text-slate-400">
             <span className="material-symbols-outlined text-[18px]">child_care</span>
             <span className="text-sm font-bold">High Chair</span>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0">
             <span className="material-symbols-outlined text-[18px] text-purple-400">celebration</span>
             <span className="text-sm font-bold text-purple-400">Anniversary</span>
          </div>
        </div>
      </div>

      {/* Desired Atmosphere */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <div className="flex items-center justify-between">
           <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Desired Atmosphere</span>
           <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
             <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
             Window Alcove matched
           </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-center">
             <span className="material-symbols-outlined text-[20px] text-blue-400">light_mode</span>
             <span className="text-xs font-bold text-blue-400">Window Alcove</span>
             <span className="text-[9px] font-bold text-blue-300">Ready Soon</span>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-center opacity-60">
             <span className="material-symbols-outlined text-[20px] text-slate-400">local_bar</span>
             <span className="text-xs font-bold text-slate-300">Cocktail Bar</span>
             <span className="text-[9px] text-slate-500">+5m Wait</span>
          </div>
          <div className="bg-[#111827] border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 text-center opacity-60">
             <span className="material-symbols-outlined text-[20px] text-slate-400">park</span>
             <span className="text-xs font-bold text-slate-300">Garden Court</span>
             <span className="text-[9px] text-slate-500">+12m Wait</span>
          </div>
        </div>
      </div>

      {/* Dietary & Chef directives */}
      <div className="flex flex-col gap-2 mt-4 px-1">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Dietary & Chef Directives</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-red-950/30 border border-red-500/30 rounded-full px-4 py-2 flex items-center gap-2">
             <span className="material-symbols-outlined text-[16px] text-red-400">no_meals</span>
             <span className="text-xs font-bold text-red-400">No Peanuts / Nuts</span>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
             <span className="material-symbols-outlined text-[16px] text-emerald-400">eco</span>
             <span className="text-xs font-bold text-emerald-400">Medium Spice Only</span>
          </div>
          <button className="bg-[#111827] border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
             <span className="material-symbols-outlined text-[16px]">add</span>
             <span className="text-xs font-bold">Add Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}
