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

export function MenuPreviewSection({ categories, currency = 'USD' }: MenuPreviewSectionProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
      <div className="text-center space-y-1">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          While You Wait
        </span>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Browse Menu Preview
        </h3>
        <p className="text-xs text-slate-500">
          Check out popular dishes while you wait for your table.
        </p>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              {cat.name}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between gap-2"
                >
                  <div>
                    <h5 className="font-semibold text-white text-sm">{item.name}</h5>
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
