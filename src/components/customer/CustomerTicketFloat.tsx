'use client';

import Link from 'next/link';

/**
 * Phase 3D — floating "my ticket" shortcut.
 * Prop-only: renders solely from the token supplied by the hosting page
 * (which received it via URL). Never reads or writes browser storage —
 * raw tokens must not persist in localStorage / sessionStorage / cookies.
 */
export function CustomerTicketFloat({ slug, qtoken }: { slug: string; qtoken?: string | null }) {
  if (!qtoken) return null;
  const token = qtoken;

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
