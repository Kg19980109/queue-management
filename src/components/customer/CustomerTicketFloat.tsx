'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CustomerTicketFloat({ slug, qtoken }: { slug: string; qtoken?: string | null }) {
  const [token, setToken] = useState<string | null>(qtoken || null);

  useEffect(() => {
    if (qtoken) {
      setToken(qtoken);
      try { localStorage.setItem(`qf_ticket_${slug}`, qtoken); } catch {}
      return;
    }
    try {
      const t = localStorage.getItem(`qf_ticket_${slug}`);
      if (t) setToken(t);
    } catch {}
  }, [slug, qtoken]);

  if (!token) return null;

  return (
    <Link
      href={`/q/${slug}/status/${token}`}
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 h-12 rounded-full bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-all"
    >
      <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
      My Ticket
    </Link>
  );
}
