import React from 'react';

export function PublicBottomNav({ queueNumber, estWaitMins }: { queueNumber: string, estWaitMins: number | null }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      
      {/* Floating Action Bar */}
      <div className="px-4 pb-4 pointer-events-auto">
        <div className="bg-[#111827] border border-white/10 rounded-full p-2 flex items-center justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl">
           <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent"></div>
           
           <div className="flex items-center gap-3 pl-3 relative z-10">
             <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
             <div className="flex flex-col">
               <div className="flex items-center gap-1.5">
                 <span className="text-sm font-black text-white">#{queueNumber}</span>
                 <span className="text-xs font-bold text-emerald-400">· ~{estWaitMins || '?'}m left</span>
               </div>
               <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Table T4 Prepping</span>
             </div>
           </div>

           <button className="bg-blue-600 text-white rounded-full px-5 py-3 flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)] relative z-10 hover:bg-blue-500 transition-colors">
             <span className="material-symbols-outlined text-[18px]">check_circle</span>
             Send 2 Items (₹600)
           </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#0A0E17]/90 backdrop-blur-xl border-t border-white/5 pb-safe pt-2 pointer-events-auto">
        <div className="flex items-center justify-around px-2 pb-2">
          <button className="flex flex-col items-center gap-1 w-16 group relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-1.5 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">A12</div>
            <span className="material-symbols-outlined text-[24px] text-slate-300">confirmation_number</span>
            <span className="text-[10px] font-bold text-slate-300">Queue</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 w-16 group">
            <span className="material-symbols-outlined text-[24px] text-slate-500 group-hover:text-slate-300 transition-colors">restaurant_menu</span>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Menu</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 w-16 group relative">
            <div className="absolute -top-1.5 right-2 w-4 h-4 bg-purple-500 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-sm">2</div>
            <span className="material-symbols-outlined text-[24px] text-white">shopping_bag</span>
            <span className="text-[10px] font-bold text-white">Pre-Order</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 w-16 group">
            <span className="material-symbols-outlined text-[24px] text-slate-500 group-hover:text-slate-300 transition-colors">room_service</span>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">Host Desk</span>
          </button>
        </div>
      </div>

    </div>
  );
}
