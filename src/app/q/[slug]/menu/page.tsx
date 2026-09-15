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
    <main className="qf-bg flex min-h-[100dvh] flex-col px-4 py-6 text-slate-100 selection:bg-orange-500 selection:text-white sm:py-8">
      {qtoken && <TicketCookieSync slug={slug} token={qtoken} isTerminal={false} />}
      <CustomerTicketFloat slug={slug} qtoken={qtoken} />
      <div className="mx-auto w-full max-w-md space-y-5 sm:space-y-6">
        <RestaurantHeader restaurant={restaurant} />

        <div className="qf-card animate-fadeUp relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl p-4">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
          <div className="relative flex items-center gap-2.5">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-xl shadow">🍽️</span>
            <span className="text-sm font-black uppercase tracking-widest text-white">
              Food Menu
            </span>
            <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow">{menuCategories.flatMap(c=>c.items).length} items • Live</span>
          </div>
          {qtoken ? (
            <a
              href={`/q/${slug}/status/${qtoken}`}
              className="relative inline-flex min-h-[44px] items-center gap-1 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-200 transition-colors hover:bg-emerald-500/25"
            >
              <span className="material-symbols-outlined text-[16px]">confirmation_number</span> My Ticket
            </a>
          ) : (
            <span className="text-[11px] font-bold text-slate-400">Browse & order 👇</span>
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
