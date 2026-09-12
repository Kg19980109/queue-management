'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function QueueResumeBanner({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(`qf_ticket_${slug}`);
      if (t) setToken(t);
      else {
        const m = document.cookie.match(new RegExp(`(?:^|; )qf_ticket_${String(slug)}=([^;]*)`));
        if (m) setToken(decodeURIComponent(m[1] as string));
      }
    } catch {}
  }, [slug]);

  const clear = () => {
    try {
      localStorage.removeItem(`qf_ticket_${slug}`);
      document.cookie = `qf_ticket_${slug}=; Path=/; Max-Age=0; SameSite=Lax`;
      setToken(null);
    } catch {}
  };

  if (!token) return null;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-[1.5px] shadow-lg shadow-emerald-500/20 animate-[fadeIn_0.4s_ease]">
      <div className="rounded-2xl bg-slate-900 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 animate-pulse">
            <span className="material-symbols-outlined text-white text-[20px]">confirmation_number</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-white leading-tight">You have an active ticket</div>
            <div className="text-xs text-emerald-300 font-medium truncate">Tap to view your queue • not lost</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/q/${slug}/status/${token}`}
            className="px-4 h-10 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center gap-1.5 hover:bg-slate-100 active:scale-95 transition-all shadow"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            View
          </Link>
          <button
            onClick={clear}
            aria-label="Dismiss"
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
