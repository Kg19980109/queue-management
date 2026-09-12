'use client';

import React from 'react';
import Link from 'next/link';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface KitchenPreOrderCardProps {
  queueNumber: string;
  restaurantSlug: string;
  token?: string;
  categories?: MenuCategory[];
}

export function KitchenPreOrderCard({
  restaurantSlug,
  token,
  categories = [],
}: KitchenPreOrderCardProps) {
  const menuUrl = token ? `/q/${restaurantSlug}/menu?qtoken=${token}` : `/q/${restaurantSlug}/menu`;

  return (
    <div className="w-full flex flex-col gap-4 mt-6 sm:mt-8 px-1">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">Pre-Order Food</h3>
        <Link href={menuUrl} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          Browse Menu <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed -mt-2">
        Order now — kitchen starts right after you&apos;re seated. No extra wait.
      </p>

      {/* Dynamic items - show up to 5 across all categories, no hardcoded slices */}
      <div className="bg-[#111827] border border-white/5 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Popular — tap to order</span>
          <Link href={menuUrl} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">View All →</Link>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.flatMap(c => c.items).slice(0, 5).map((item: MenuItem) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">restaurant_menu</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-white truncate">{item.name}</span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{item.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-white text-sm">₹{Number(item.price).toFixed(0)}</span>
                    <Link
                      href={menuUrl}
                      className="bg-white text-[#0A0E17] hover:bg-slate-100 font-black text-xs px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Add
                    </Link>
                  </div>
                </div>
            ))}
            {categories.flatMap(c => c.items).length > 5 && (
              <Link href={menuUrl} className="block text-center text-xs font-bold text-slate-400 hover:text-white py-2 border-t border-white/5 mt-2">
                + {categories.flatMap(c => c.items).length - 5} more items →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-bold text-slate-300">Menu not published yet</p>
            <p className="text-xs text-slate-500">Ask host for today&apos;s specials</p>
          </div>
        )}

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-emerald-400 mt-0.5 shrink-0">info</span>
          <span className="text-[11px] text-emerald-200/80 leading-snug">
            You&apos;ll pay after seating. Pre-order just fires the kitchen faster.
          </span>
        </div>
      </div>
    </div>
  );
}
