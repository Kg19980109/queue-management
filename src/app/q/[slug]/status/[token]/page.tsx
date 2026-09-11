import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { QueueTicketCard } from '@/components/customer/QueueTicketCard';
import { QueueStatusBanner } from '@/components/customer/QueueStatusBanner';
import { CancelQueueDialog } from '@/components/customer/CancelQueueDialog';
import { MenuPreviewSection } from '@/components/customer/MenuPreviewSection';
import { CustomerNotificationBanner } from '@/components/notifications/CustomerNotificationBanner';
import { StatusAutoRefresh } from './StatusAutoRefresh';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return { title: 'Ticket Not Found — QueueFlow' };
  }

  return {
    title: `My Queue Ticket — ${restaurant.name} | QueueFlow`,
    description: `View live queue status and position for ${restaurant.name}.`,
  };
}

export default async function CustomerQueueStatusPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  // 1. Resolve restaurant by slug
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Restaurant Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find an active restaurant for &quot;{slug}&quot;.
          </p>
        </div>
      </div>
    );
  }

  // 2. Resolve queue status by token
  const status = await QueueService.getQueueStatusByToken(token);
  if (!status) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🎟️</div>
          <h1 className="text-xl font-bold text-white">Ticket Expired / Invalid</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find a valid queue ticket for this token. You may join the line again anytime.
          </p>
        </div>
      </div>
    );
  }

  // 3. TENANT ISOLATION CHECK: Verify token belongs to the resolved restaurant
  if (status.restaurantId !== restaurant.id) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-xl font-bold text-rose-400">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This queue ticket belongs to a different restaurant. Cross-tenant access is prohibited.
          </p>
        </div>
      </div>
    );
  }

  const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(status.status);
  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Live Polling Auto-Refresh */}
      <StatusAutoRefresh intervalMs={10000} />

      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Real-time In-App Notification Banner */}
        <CustomerNotificationBanner token={token} />

        {/* Restaurant Header */}
        <RestaurantHeader restaurant={restaurant} />

        {/* Live Status Banner */}
        <QueueStatusBanner status={status} />

        {/* Hero Queue Ticket Card */}
        <QueueTicketCard status={status} />

        {/* Customer Cancel Spot Action */}
        {!isTerminal && (
          <CancelQueueDialog token={token} restaurantSlug={slug} />
        )}

        {/* Order Food CTA */}
        {!isTerminal && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-3xl">🍔</div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Order Food While You Wait</h3>
              <p className="text-xs text-slate-400 mt-1">Skip the ordering line inside. Place your food order now and we&apos;ll prepare it once you&apos;re seated!</p>
            </div>
            <a 
              href={`/q/${slug}/menu?qtoken=${token}`}
              className="inline-block w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all"
            >
              Browse Menu & Order →
            </a>
          </div>
        )}

        {/* Menu Preview Section */}
        <MenuPreviewSection categories={menuCategories} />
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
