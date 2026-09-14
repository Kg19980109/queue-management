import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { QueueTicketCard } from '@/components/customer/QueueTicketCard';
import { PublicMobileHeader } from '@/components/customer/PublicMobileHeader';
import { PartyPreferencesCard } from '@/components/customer/PartyPreferencesCard';
import { KitchenPreOrderCard } from '@/components/customer/KitchenPreOrderCard';
import { PublicBottomNav } from '@/components/customer/PublicBottomNav';
import { StatusAutoRefresh } from './StatusAutoRefresh';
import { QueueTicketPersister } from '@/components/customer/QueueTicketPersister';
import { CustomerQueueRealtime } from '@/components/realtime/CustomerQueueRealtime';
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
      <div className="min-h-screen bg-[#0A0E17] text-white flex items-center justify-center p-6">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
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
      <div className="min-h-screen bg-[#0A0E17] text-white flex items-center justify-center p-6">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🎟️</div>
          <h1 className="text-xl font-bold text-white">Ticket Expired / Invalid</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find a valid queue ticket for this token.
          </p>
          <a href={`/q/${slug}`} className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-white text-[#0A0E17] font-bold text-sm mt-2 hover:bg-slate-100">Join Queue Again</a>
        </div>
      </div>
    );
  }

  // 3. TENANT ISOLATION CHECK
  if (status.restaurantId !== restaurant.id) {
    return (
      <div className="min-h-screen bg-[#0A0E17] text-white flex items-center justify-center p-6">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-xl font-bold text-rose-400">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This ticket belongs to a different restaurant.
          </p>
          <a href={`/q/${slug}`} className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-white text-[#0A0E17] font-bold text-sm mt-2">Back to {restaurant.name}</a>
        </div>
      </div>
    );
  }

  const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED', 'COMPLETED'].includes(status.status);
  
  // Use server-calculated ETA (respects restaurant avg_service_time etc), fallback only if null
  const estWaitMins = status.estimatedWaitMins ?? (status.status === 'WAITING' && status.position ? Math.max(5, (status.position - 1) * 7) : null);
  const rawDisplay = status.displayNumber || status.entryId.substring(0, 4).toUpperCase();
  const displayNum = rawDisplay.startsWith('#') ? rawDisplay : `#${rawDisplay}`;

  // Only fetch menu when still queueing (save DB)
  const menuCategories = !isTerminal ? await PublicRestaurantService.getPublicMenuPreview(restaurant.id) : [];

  return (
    <main className="min-h-[100dvh] bg-[#0A0E17] text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <QueueTicketPersister slug={slug} token={token} isTerminal={isTerminal} />
      <CustomerQueueRealtime entryId={status.entryId} isTerminal={isTerminal} />
      <StatusAutoRefresh intervalMs={10000} isTerminal={isTerminal} />

      <div className="w-full max-w-md mx-auto">
        {/* Top Header & Tab Navigation */}
        <PublicMobileHeader 
           restaurantName={restaurant.name} 
           queueNumber={displayNum}
           estWaitMins={estWaitMins}
        />

        {/* Hero Digital Pass */}
        <div className="px-3 sm:px-4">
           <QueueTicketCard status={status} token={token} restaurantSlug={slug} />
        </div>

        {!isTerminal ? (
          <div className="px-3 sm:px-4 space-y-4">
             <PartyPreferencesCard 
               customerName={status.customerName} 
               phone={null}
               partySize={status.partySize}
             />
             <KitchenPreOrderCard queueNumber={displayNum} restaurantSlug={slug} token={token} categories={menuCategories} />
          </div>
        ) : (
          <div className="px-3 sm:px-4 mt-4">
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-white">
                {status.status === 'SEATED' ? 'You are seated — enjoy your meal!' : status.status === 'CANCELLED' ? 'You left the queue. Re-join anytime.' : 'This ticket is no longer active.'}
              </p>
              <a href={`/q/${slug}`} className="inline-flex items-center justify-center mt-3 w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm">Join Again</a>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Nav */}
      {!isTerminal && (
        <PublicBottomNav queueNumber={displayNum} estWaitMins={estWaitMins} restaurantSlug={slug} token={token} />
      )}
    </main>
  );
}
