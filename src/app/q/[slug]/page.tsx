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
  const avgWaitMins = 15;
  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);

  return (
    <main className="min-h-[100dvh] relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-100">
      
      {/* Background glow effects */}
      <div className="absolute top-0 inset-x-0 h-[420px] bg-gradient-to-b from-emerald-900/20 via-slate-900/5 to-transparent pointer-events-none -z-10" />
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none -z-10" />

      <div className="w-full max-w-md mx-auto space-y-5 sm:space-y-6 px-4 py-6 sm:py-8 z-10 relative">
        {/* Header */}
        <div className="animate-fade-in-up stagger-1">
          <RestaurantHeader restaurant={restaurant} waitingCount={waitingCount} />
        </div>

        {/* Queue Open vs Closed Content */}
        <div className="animate-fade-in-up stagger-2">
          {restaurant.queueEnabled ? (
            <QueueJoinForm restaurant={restaurant} waitingCount={waitingCount} avgWaitMins={avgWaitMins} />
          ) : (
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 text-center space-y-3 backdrop-blur">
              <div className="text-4xl sm:text-5xl mb-2">🛑</div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Queue Currently Closed</h2>
              <p className="text-[13px] sm:text-sm text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                {restaurant.name} is not accepting new entries right now. Please check back later or ask the host.
              </p>
            </div>
          )}
        </div>

        {/* Secondary Menu Preview */}
        <div className="animate-fade-in-up stagger-3">
          <MenuPreviewSection categories={menuCategories} />
        </div>
      </div>

      {/* Powered by QueueFlow Footer */}
      <footer className="w-full max-w-md mx-auto text-center pt-8 pb-6 animate-fade-in-up stagger-3">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight glow-text">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
