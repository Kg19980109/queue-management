import React from 'react';

export interface MenuPreviewCategory {
  id: string;
  name: string;
  description: string | null;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    available: boolean;
  }>;
}

interface MenuPreviewSectionProps {
  categories: MenuPreviewCategory[];
  currency?: string;
}

export function MenuPreviewSection({ categories, currency = 'INR' }: MenuPreviewSectionProps) {
  if (!categories || categories.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
        <span className="material-symbols-outlined text-slate-500 text-[28px]">restaurant_menu</span>
        <p className="text-sm font-bold text-slate-300 mt-2">Menu updating</p>
        <p className="text-xs text-slate-500 mt-1">Ask host for today&apos;s specials</p>
      </div>
    );
  }

  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency || 'INR',
        maximumFractionDigits: 2,
      }).format(price);
    } catch { return `₹${price.toFixed(2)}`; }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="text-center space-y-1">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> While You Wait
        </span>
        <h3 className="text-lg font-black text-white tracking-tight">
          Menu Preview
        </h3>
        <p className="text-xs text-slate-500">
          Popular dishes — full menu after joining
        </p>
      </div>

      <div className="space-y-5">
        {categories.slice(0,3).map((cat) => (
          <div key={cat.id} className="space-y-2.5">
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>{cat.name}</span>
              <span className="font-mono font-bold text-slate-500">{cat.items.length}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cat.items.slice(0,4).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex justify-between gap-3 hover:border-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-white text-[13px] truncate">{item.name}</h5>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-black text-white shrink-0">
                    {formatPrice(item.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
