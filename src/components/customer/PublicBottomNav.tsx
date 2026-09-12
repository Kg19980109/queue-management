'use client';

import React, { useState } from 'react';
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
  const [isHostHelpOpen, setIsHostHelpOpen] = useState(false);
  const [helpSent, setHelpSent] = useState<string | null>(null);

  const handleRequestHelp = (requestType: string) => {
    setHelpSent(requestType);
    setTimeout(() => setHelpSent(null), 3000);
  };

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
              className="flex flex-col items-center gap-1 w-16 text-slate-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              <span className="text-[10px] font-bold">Ticket</span>
            </Link>

            <Link
              href={menuUrl}
              className="flex flex-col items-center gap-1 w-16 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">restaurant_menu</span>
              <span className="text-[10px] font-bold">Menu</span>
            </Link>

            <Link
              href={menuUrl}
              className="flex flex-col items-center gap-1 w-16 text-slate-400 hover:text-white transition-colors relative"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="text-[10px] font-bold">Pre-Order</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsHostHelpOpen(true)}
              className="flex flex-col items-center gap-1 w-16 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">room_service</span>
              <span className="text-[10px] font-bold">Host Desk</span>
            </button>
          </div>
        </div>
      </div>

      {/* Host Assistance Modal Drawer */}
      {isHostHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-[#0A0E17] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 text-white animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[22px]">room_service</span>
                <h3 className="text-base font-bold">Host Desk Assistance</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHostHelpOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {helpSent ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs font-bold text-center space-y-1">
                <div>✓ Request Notified to Host Desk</div>
                <div className="text-[11px] font-normal text-slate-300">
                  Staff has been notified for: {helpSent}.
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-slate-400 mb-2">
                  Need something while waiting in line? Tap any option below:
                </p>

                {[
                  { label: '💧 Request Welcome Water / Drinks', id: 'water' },
                  { label: '👶 Request High Chair for Table', id: 'highchair' },
                  { label: '♿ Wheelchair / Accessibility Seating', id: 'a11y' },
                  { label: '🎉 Special Occasion (Birthday/Anniversary)', id: 'celebration' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRequestHelp(item.label)}
                    className="w-full text-left p-3.5 rounded-2xl bg-[#111827] hover:bg-white/5 border border-white/5 font-bold text-slate-200 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined text-[16px] text-slate-500">chevron_right</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
