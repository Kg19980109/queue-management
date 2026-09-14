import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { CustomerMenuBrowser } from '@/components/customer/CustomerMenuBrowser';
import { CustomerTicketFloat } from '@/components/customer/CustomerTicketFloat';
import { TicketCookieSync } from '@/components/customer/TicketCookieSync';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return { title: 'Menu Not Found — QueueFlow' };
  }

  return {
    title: `Menu — ${restaurant.name} | QueueFlow`,
    description: `Browse menu items and order online for ${restaurant.name}.`,
  };
}

export default async function CustomerMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qtoken?: string; tableId?: string }>;
}) {
  const { slug } = await params;
  const { tableId, qtoken } = await searchParams;

  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Restaurant Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find an active menu for &quot;{slug}&quot;.
          </p>
        </div>
      </div>
    );
  }

  // Optional: Resolve queueEntryId if a valid queue token was provided
  let queueEntryId = null;
  if (qtoken) {
    const { QueueService } = await import('@/lib/services/queue-service');
    const status = await QueueService.getQueueStatusByToken(qtoken);
    if (status && status.restaurantId === restaurant.id) {
      queueEntryId = status.entryId;
    }
  }

  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);
  const currency = (restaurant as unknown as { currency?: string })?.currency || 'INR';

  return (
    <main className="min-h-[100dvh] bg-slate-950 text-slate-100 px-4 py-6 sm:py-8 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {qtoken && <TicketCookieSync slug={slug} token={qtoken} isTerminal={false} />}
      <CustomerTicketFloat slug={slug} qtoken={qtoken} />
      <div className="w-full max-w-md mx-auto space-y-5 sm:space-y-6">
        <RestaurantHeader restaurant={restaurant} />

        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/80 border border-slate-700/50 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
          <div className="flex items-center gap-2 relative">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow"><span className="material-symbols-outlined text-white text-[18px]">restaurant_menu</span></span>
            <span className="text-xs font-black text-white uppercase tracking-widest">
              Food Menu
            </span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500 text-white font-black shadow">{menuCategories.flatMap(c=>c.items).length} items • Live</span>
          </div>
          {qtoken ? (
            <a
              href={`/q/${slug}/status/${qtoken}`}
              className="relative text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-full flex items-center gap-1 shadow transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">confirmation_number</span> Ticket
            </a>
          ) : (
            <span className="text-[11px] font-bold text-slate-500">Browse & order</span>
          )}
        </div>

        <CustomerMenuBrowser
          categories={menuCategories}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          queueEntryId={queueEntryId}
          tableId={tableId || null}
          currency={currency}
          queueToken={qtoken || null}
        />
      </div>

      <footer className="w-full max-w-md mx-auto text-center pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
