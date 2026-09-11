import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { CustomerMenuBrowser } from '@/components/customer/CustomerMenuBrowser';
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        <RestaurantHeader restaurant={restaurant} />

        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Food Menu
            </span>
          </div>
          {qtoken && (
            <a
              href={`/q/${slug}/status/${qtoken}`}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              ← Queue Status
            </a>
          )}
        </div>

        <CustomerMenuBrowser
          categories={menuCategories}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          queueEntryId={queueEntryId}
          tableId={tableId || null}
          currency="USD"
        />
      </div>

      <footer className="w-full max-w-md mx-auto text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
