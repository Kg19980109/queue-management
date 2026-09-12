'use client';

import React from 'react';
import Link from 'next/link';

interface PublicBottomNavProps {
  queueNumber: string;
  estWaitMins: number | null;
  restaurantSlug: string;
  token?: string;
}

export function PublicBottomNav({
  queueNumber,
  estWaitMins,
  restaurantSlug,
  token,
}: PublicBottomNavProps) {

  const statusUrl = token ? `/q/${restaurantSlug}/status/${token}` : `/q/${restaurantSlug}`;
  const menuUrl = token ? `/q/${restaurantSlug}/menu?qtoken=${token}` : `/q/${restaurantSlug}/menu`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto px-3 safe-pb" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-[#0A0E17]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 shadow-2xl shadow-black flex items-center justify-between mx-auto max-w-sm">
        
        {/* Left: Queue Status */}
        <Link href={statusUrl} className="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all flex-1 min-w-0">
          <div className="relative shrink-0">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse absolute -top-1 -right-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="material-symbols-outlined text-[20px] text-emerald-400">confirmation_number</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-white leading-none truncate">{queueNumber.startsWith('#') ? queueNumber : `#${queueNumber}`}</span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">
              {estWaitMins !== null && estWaitMins !== undefined ? `~${estWaitMins}m wait` : 'Live ticket'}
            </span>
          </div>
        </Link>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-1 shrink-0"></div>

        {/* Right: Distinct actions */}
        <div className="flex items-center gap-1 pr-1 shrink-0">
          <Link
            href={menuUrl}
            className="w-[56px] h-12 flex flex-col items-center justify-center gap-0.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            <span className="text-[8px] font-bold uppercase tracking-wider">Menu</span>
          </Link>
          <Link
            href={statusUrl}
            className="w-[56px] h-12 flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-white text-[#0A0E17] hover:bg-slate-100 active:scale-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-[8px] font-black uppercase tracking-wider">Ticket</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
