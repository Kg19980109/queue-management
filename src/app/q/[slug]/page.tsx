import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { QueueJoinForm } from '@/components/customer/QueueJoinForm';
import { MenuPreviewSection } from '@/components/customer/MenuPreviewSection';
import { QueueResumeBanner } from '@/components/customer/QueueResumeBanner';
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
  const activeQueueCount = activeEntries.filter((e) => ['WAITING','NOTIFIED','CALLED'].includes(e.status)).length;
  const isFull = activeQueueCount >= restaurant.maxQueueCapacity;
  const operatingState = restaurant.queueOperatingState || 'OPEN';
  const queueEnabled = restaurant.queueEnabled;
  const avgWaitMins = 15;
  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);

  const canJoin = queueEnabled && operatingState === 'OPEN' && !isFull || operatingState === 'CLOSING_SOON' && queueEnabled && !isFull;

  return (
    <main className="min-h-[100dvh] relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-100">
      
      {/* Background glow - animated wow */}
      <div className="absolute top-0 inset-x-0 h-[420px] bg-gradient-to-b from-emerald-900/20 via-slate-900/5 to-transparent pointer-events-none -z-10" />
      <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none -z-10 animate-float" />
      <div className="absolute top-[15%] -right-[10%] w-[45%] h-[40%] rounded-full bg-blue-500/12 blur-[100px] pointer-events-none -z-10 animate-float" style={{animationDelay:'1.5s'}} />
      <div className="absolute bottom-[20%] left-[20%] w-[30%] h-[20%] rounded-full bg-purple-500/8 blur-[80px] pointer-events-none -z-10 animate-float" style={{animationDelay:'3s'}} />

      <div className="w-full max-w-md mx-auto space-y-5 sm:space-y-6 px-4 py-6 sm:py-8 z-10 relative">
        {/* Resume banner - prevents queue loss on back */}
        <QueueResumeBanner slug={slug} />

        {/* Header */}
        <div className="animate-fade-in-up stagger-1">
          <RestaurantHeader restaurant={restaurant} waitingCount={waitingCount} />
        </div>

        {/* Queue Operating State Content */}
        <div className="animate-fade-in-up stagger-2">
          {canJoin ? (
            <>
              {operatingState === 'CLOSING_SOON' && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Closing soon — join now while you can!
                </div>
              )}
              <QueueJoinForm restaurant={restaurant} waitingCount={waitingCount} avgWaitMins={avgWaitMins} />
            </>
          ) : (
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 text-center space-y-3 backdrop-blur">
              <div className="text-4xl sm:text-5xl mb-2">
                {!queueEnabled || operatingState === 'CLOSED' ? '🛑' : isFull ? '👥' : operatingState === 'PAUSED' ? '⏸️' : '🛑'}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {!queueEnabled || operatingState === 'CLOSED' ? 'Queue Currently Closed' : isFull ? 'Queue Currently Full' : operatingState === 'PAUSED' ? 'Queue Temporarily Paused' : 'Queue Not Available'}
              </h2>
              <p className="text-[13px] sm:text-sm text-slate-400 leading-relaxed max-w-[280px] mx-auto">
                {!queueEnabled || operatingState === 'CLOSED'
                  ? `${restaurant.name} is not accepting new entries right now. Please check back later or ask the host.`
                  : isFull
                  ? `The queue is at capacity (${activeQueueCount}/${restaurant.maxQueueCapacity}). Please check back shortly — spots open as guests are seated.`
                  : operatingState === 'PAUSED'
                  ? 'The queue is temporarily paused. Please check back shortly.'
                  : 'Queue not available at the moment.'}
              </p>
              {isFull && <p className="text-[11px] text-emerald-400 font-bold">We’ll notify you here when spots open</p>}
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
