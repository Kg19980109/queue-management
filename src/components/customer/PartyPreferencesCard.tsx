import React from 'react';

export function PartyPreferencesCard({ customerName, phone, partySize }: { customerName: string, phone: string | null, partySize: number }) {
  const initials = (customerName && customerName.trim().length >= 2) ? customerName.trim().substring(0, 2).toUpperCase() : (customerName?.trim().substring(0,1).toUpperCase() || 'G');
  const maskedPhone = phone ? `${phone.slice(0,2)}****${phone.slice(-4)}` : null;
  return (
    <div className="w-full flex flex-col gap-3 mt-6 sm:mt-8">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">Your Party</h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 rounded-full px-2 py-1 bg-white/5">Confirmed</span>
      </div>

      {/* User Info - production clean */}
      <div className="bg-[#111827] rounded-2xl p-4 border border-white/5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-bold text-sm truncate">{customerName || 'Guest'}</span>
            <span className="text-xs text-slate-400 mt-0.5 truncate">{maskedPhone ? `${maskedPhone} · SMS updates` : 'No phone · keep this ticket open'}</span>
          </div>
        </div>
      </div>

      {/* Party Size */}
      <div className="flex flex-col gap-2 px-1">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Party Size</span>
        <div className="inline-flex items-center gap-2 self-start bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
           <span className="material-symbols-outlined text-[18px] text-blue-400">group</span>
           <span className="text-sm font-black text-white">{partySize} {partySize === 1 ? 'Guest' : 'Guests'}</span>
        </div>
      </div>
    </div>
  );
}
