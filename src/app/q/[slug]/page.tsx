import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { QueueJoinForm } from '@/components/customer/QueueJoinForm';
import { MenuPreviewSection } from '@/components/customer/MenuPreviewSection';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return { title: 'Restaurant Not Found — QueueFlow' };
  }

  return {
    title: `${restaurant.name} — Join Digital Queue | QueueFlow`,
    description: `Join the digital waiting line for ${restaurant.name}. Save your spot without standing in line.`,
  };
}

export default async function PublicRestaurantQueuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Restaurant Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find an active restaurant queue for &quot;{slug}&quot;. Please verify the QR code or link.
          </p>
        </div>
      </div>
    );
  }

  const activeEntries = await QueueService.getActiveQueue(restaurant.id);
  const waitingCount = activeEntries.filter((e) => e.status === 'WAITING').length;
  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header */}
        <RestaurantHeader restaurant={restaurant} waitingCount={waitingCount} />

        {/* Queue Open vs Closed Content */}
        {restaurant.queueEnabled ? (
          <QueueJoinForm restaurant={restaurant} />
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-3 shadow-2xl">
            <div className="text-4xl">🛑</div>
            <h2 className="text-lg font-bold text-white">Queue is Currently Closed</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {restaurant.name} is not accepting new queue entries right now. Please check back later or ask the host stand.
            </p>
          </div>
        )}

        {/* Secondary Menu Preview */}
        <MenuPreviewSection categories={menuCategories} />
      </div>

      {/* Powered by QueueFlow Footer */}
      <footer className="w-full max-w-md mx-auto text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
