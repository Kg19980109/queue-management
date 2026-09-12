import React from 'react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { QueueTicketCard } from '@/components/customer/QueueTicketCard';
import { PublicMobileHeader } from '@/components/customer/PublicMobileHeader';
import { PartyPreferencesCard } from '@/components/customer/PartyPreferencesCard';
import { KitchenPreOrderCard } from '@/components/customer/KitchenPreOrderCard';
import { ComplimentaryPourCard } from '@/components/customer/ComplimentaryPourCard';
import { PublicBottomNav } from '@/components/customer/PublicBottomNav';
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
            We couldn&apos;t find a valid queue ticket for this token. You may join the line again anytime.
          </p>
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
            This queue ticket belongs to a different restaurant. Cross-tenant access is prohibited.
          </p>
        </div>
      </div>
    );
  }

  const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(status.status);
  
  // Calculate wait mins
  const isWaiting = status.status === 'WAITING';
  const estWaitMins = isWaiting && status.position ? Math.max(5, (status.position - 1) * 7) : null;
  const displayNum = status.displayNumber || `A${status.entryId.substring(0, 2).toUpperCase()}`;

  // 4. Fetch menu for pre-orders
  const menuCategories = await PublicRestaurantService.getPublicMenuPreview(restaurant.id);

  return (
    <main className="min-h-screen bg-[#0A0E17] text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-32">
      <StatusAutoRefresh intervalMs={10000} />

      <div className="w-full max-w-md mx-auto">
        {/* Top Header & Tab Navigation */}
        <PublicMobileHeader 
           restaurantName={restaurant.name} 
           queueNumber={displayNum}
           estWaitMins={estWaitMins}
        />

        {/* Hero Digital Pass */}
        <div className="px-3">
           <QueueTicketCard status={status} token={token} restaurantSlug={slug} />
        </div>

        {!isTerminal && (
          <div className="px-3">
             <PartyPreferencesCard 
               customerName={status.customerName} 
               phone={null} 
             />
             <KitchenPreOrderCard queueNumber={displayNum} restaurantSlug={slug} token={token} categories={menuCategories} />
             <ComplimentaryPourCard />
          </div>
        )}
      </div>

      {/* Fixed Bottom Nav & Action Bar */}
      {!isTerminal && (
        <PublicBottomNav queueNumber={displayNum} estWaitMins={estWaitMins} restaurantSlug={slug} token={token} />
      )}
    </main>
  );
}
