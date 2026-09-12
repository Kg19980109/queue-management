import React from 'react';

export function PartyPreferencesCard({ customerName, phone, partySize }: { customerName: string, phone: string | null, partySize: number }) {
  return (
    <div className="w-full flex flex-col gap-3 mt-8">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-xl font-bold text-white tracking-tight">Your Party</h3>
      </div>

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
            <span className="text-xs text-slate-400 mt-0.5">{phone || 'Phone hidden'} · SMS alerts...</span>
          </div>
        </div>
      </div>

      {/* Party Size & Setup */}
      <div className="flex flex-col gap-2 mt-2 px-1">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Party Size & Setup</span>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0">
             <span className="material-symbols-outlined text-[18px] text-blue-400">group</span>
             <span className="text-sm font-bold text-blue-400">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
