'use client';

import React from 'react';
import Link from 'next/link';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  available?: boolean;
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
    <div className="w-full flex-col gap-4 px-1">
      <div className="flex items-center justify-between">
        <h3 className="qf-keep-dark text-lg font-black tracking-tight text-white sm:text-xl">Hungry already? 😋</h3>
        <Link href={menuUrl} className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 text-xs font-black text-orange-300 transition-colors hover:bg-orange-500/20">
          Full menu <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
      <p className="-mt-1 text-xs leading-relaxed text-slate-300">
        Order now — the kitchen starts the moment you&apos;re seated. Zero extra wait. 🔥
      </p>

      {/* Dynamic items - show up to 5 AVAILABLE items across all categories.
          Phase 4G: never push unavailable dishes in the upsell card. */}
      <div className="qf-card mt-3 space-y-3 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-orange-300">⭐ Popular — tap to order</span>
          <Link href={menuUrl} className="text-xs font-black text-emerald-300 hover:text-emerald-200">View All →</Link>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-3">
            {categories.flatMap(c => c.items).filter((i) => i.available !== false).slice(0, 5).map((item: MenuItem) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 transition-all hover:border-orange-400/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/10 text-2xl">
                      <span aria-hidden="true">🍽️</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-sm font-black text-white">{item.name}</span>
                      <span className="line-clamp-1 text-[11px] text-slate-400">{item.description}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-black text-emerald-300">₹{Number(item.price).toFixed(0)}</span>
                    <Link
                      href={menuUrl}
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-black text-white shadow transition-all hover:brightness-110 active:scale-95"
                    >
                      + Add
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

        <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
          <span className="material-symbols-outlined text-[16px] text-emerald-300 mt-0.5 shrink-0">info</span>
          <span className="text-[11px] leading-snug text-emerald-100/90">
            💡 You&apos;ll pay after seating. Pre-ordering just fires the kitchen faster!
          </span>
        </div>
      </div>
    </div>
  );
}
