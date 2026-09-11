import React from 'react';

export function KitchenPreOrderCard({}: { queueNumber: string }) {
  return (
    <div className="w-full flex flex-col gap-4 mt-8 px-1">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-bold text-white tracking-tight">Kitchen Pre-Order</h3>
        <span className="bg-purple-900/40 border border-purple-500/40 text-purple-400 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
          Express Fire
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 -mt-2">
        <p className="text-xs text-slate-400 leading-relaxed">
          Piped directly to kitchen. Plates land within 3 mins of seating.
        </p>
        <div className="w-8 h-8 rounded-full bg-amber-900/20 border border-amber-500/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[16px] text-amber-500">bolt</span>
        </div>
      </div>

      {/* Cart Staged Items */}
      <div className="bg-[#111827] border border-white/5 rounded-3xl p-4 mt-2 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
             <span className="material-symbols-outlined text-[18px]">restaurant</span>
             <span>2 Starters Staged for Table T4</span>
          </div>
          <span className="text-emerald-400 font-bold">₹600</span>
        </div>

        {/* Item 1 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                <img src="https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=100" alt="Butter Chicken" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Artisanal Butter Chic...</span>
                <span className="text-[10px] text-slate-400">Mild Spice · Extra Cream swirl</span>
             </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
             <span className="font-bold text-slate-300">1 × ₹510</span>
             <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                <img src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=100" alt="Naan" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Tandoori Garlic Naan</span>
                <span className="text-[10px] text-slate-400">Crisp clay oven baked · 2 pcs</span>
             </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
             <span className="font-bold text-slate-300">1 × ₹90</span>
             <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
          </div>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-3 flex items-start gap-2 border border-white/5 mt-2">
           <span className="material-symbols-outlined text-[14px] text-slate-400 mt-0.5">info</span>
           <span className="text-[11px] text-slate-400 leading-snug">
             Payment is deferred until seating or payable now at checkout.
           </span>
        </div>
      </div>

      {/* Upsell Row */}
      <div className="flex items-center justify-between mt-4 mb-2">
        <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Pair with your reservation</span>
        <button className="text-[10px] font-bold text-slate-300 hover:text-white">View 28 More</button>
      </div>

      {/* Upsell Items */}
      <div className="flex flex-col gap-3">
        {/* Upsell 1 */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                <img src="https://images.unsplash.com/photo-1599487405270-b05b1c5cce49?auto=format&fit=crop&q=80&w=120" alt="Paneer Tikka" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                   <span className="text-sm font-bold text-white">Smoked Paneer Tikka</span>
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">Charred cottage cheese, mint...</span>
                <div className="flex items-center gap-2 mt-1">
                   <span className="font-bold text-white text-sm">₹380</span>
                   <span className="text-[8px] bg-purple-900/30 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Chef Special</span>
                </div>
             </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm">
            + Add
          </button>
        </div>

        {/* Upsell 2 */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                <img src="https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&q=80&w=120" alt="Biryani" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                   <span className="text-sm font-bold text-white">Mutton Dum Biryani</span>
                   <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">Aged basmati, slow-steamed...</span>
                <div className="flex items-center gap-2 mt-1">
                   <span className="font-bold text-white text-sm">₹490</span>
                   <span className="text-[8px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Slow Cooked</span>
                </div>
             </div>
          </div>
          <button className="bg-[#111827] hover:bg-white/5 border border-white/10 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition-colors">
            + Add
          </button>
        </div>

        {/* Upsell 3 */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                <img src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=120" alt="Cocktail" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                   <span className="text-sm font-bold text-white">Botanical Smoke Cock...</span>
                   <span className="material-symbols-outlined text-[12px] text-purple-400">local_bar</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">Smoked spiced botanical syrup,...</span>
                <div className="flex items-center gap-2 mt-1">
                   <span className="font-bold text-white text-sm">₹340</span>
                   <span className="text-[8px] bg-blue-900/30 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pre Dinner</span>
                </div>
             </div>
          </div>
          <button className="bg-[#111827] hover:bg-white/5 border border-white/10 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition-colors">
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
