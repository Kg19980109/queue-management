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
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        {/* Floating Action Bar */}
        <div className="px-4 pb-3 pointer-events-auto">
          <div className="bg-[#111827] border border-white/10 rounded-full p-2 flex items-center justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent"></div>

            <div className="flex items-center gap-3 pl-3 relative z-10">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">#{queueNumber}</span>
                  <span className="text-xs font-bold text-emerald-400">
                    · ~{estWaitMins || '?'}m left
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  Queue Active
                </span>
              </div>
            </div>

            <Link
              href={menuUrl}
              className="bg-blue-600 text-white rounded-full px-5 py-2.5 flex items-center gap-2 font-bold text-xs shadow-[0_0_15px_rgba(37,99,235,0.4)] relative z-10 hover:bg-blue-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
              Explore Menu
            </Link>
          </div>
        </div>

        {/* Bottom Navigation Tabs */}
        <div className="bg-[#0A0E17]/95 backdrop-blur-xl border-t border-white/5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 pointer-events-auto">
          <div className="flex items-center justify-around px-2">
            <Link
              href={statusUrl}
              className="flex flex-col items-center gap-1 w-24 text-slate-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              <span className="text-[10px] font-bold">Ticket</span>
            </Link>

            <Link
              href={menuUrl}
              className="flex flex-col items-center gap-1 w-24 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">restaurant_menu</span>
              <span className="text-[10px] font-bold">Menu</span>
            </Link>

            <Link
              href={menuUrl}
              className="flex flex-col items-center gap-1 w-24 text-slate-400 hover:text-white transition-colors relative"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="text-[10px] font-bold">Pre-Order</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
