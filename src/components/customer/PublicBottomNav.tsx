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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 pointer-events-auto">
      <div className="bg-[#0A0E17]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 shadow-2xl shadow-black flex items-center justify-between">
        
        {/* Left: Queue Status Mini */}
        <Link href={statusUrl} className="flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all flex-1">
          <div className="relative">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse absolute -top-1 -right-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            <span className="material-symbols-outlined text-[20px] text-emerald-400">confirmation_number</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-white leading-none">#{queueNumber}</span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
              {estWaitMins ? `~${estWaitMins}m wait` : 'Waiting'}
            </span>
          </div>
        </Link>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 pr-1">
          <Link
            href={menuUrl}
            className="w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            <span className="text-[8px] font-bold uppercase tracking-wider">Menu</span>
          </Link>
          <Link
            href={menuUrl}
            className="w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all relative"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            <span className="text-[8px] font-bold uppercase tracking-wider">Order</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
