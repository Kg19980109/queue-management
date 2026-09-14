import Link from 'next/link';
import { getTicketToken } from '@/lib/customer-ticket-cookie';
import { QueueService } from '@/lib/services/queue-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';

/**
 * Phase 3D — server-rendered "active ticket" resume banner.
 *
 * Reads the server-managed HttpOnly ticket cookie (never localStorage,
 * never a JS-readable cookie), validates it (hash lookup + tenant match),
 * and only renders for live (non-terminal) tickets. The token appears in
 * this authorized user's own page link — required for navigation — but is
 * never persisted in browser JS storage, history-independent resume works
 * without it, and Referrer-Policy + no third-party leaks contain it.
 */
export async function TicketResumeBanner({ slug }: { slug: string }) {
  let token: string | null = null;
  try {
    const raw = await getTicketToken(slug);
    if (raw) {
      const status = await QueueService.getQueueStatusByToken(raw);
      const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);
      if (
        status &&
        restaurant &&
        restaurant.id === status.restaurantId &&
        ['WAITING', 'NOTIFIED', 'CALLED'].includes(status.status)
      ) {
        token = raw;
      }
    }
  } catch {
    token = null;
  }

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
        </div>
      </div>
    </div>
  );
}
