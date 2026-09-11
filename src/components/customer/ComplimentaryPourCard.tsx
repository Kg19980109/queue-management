import React from 'react';

export function ComplimentaryPourCard() {
  return (
    <div className="w-full mt-8 px-1">
      <div className="bg-[#111827] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col gap-2 relative z-10 max-w-[70%]">
          <h3 className="text-sm font-bold text-white tracking-tight">Complimentary Welcome Pour</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Present this pass to Host Desk for spiced kokum welcome drinks while you wait.
          </p>
        </div>
        
        <div className="w-14 h-14 rounded-2xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center shrink-0 relative z-10">
          <span className="material-symbols-outlined text-[24px] text-purple-400">liquor</span>
        </div>
      </div>
    </div>
  );
}
