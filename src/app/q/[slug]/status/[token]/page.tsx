import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { NotificationService } from '@/lib/services/notification-service';
import { QueueTicketCard } from '@/components/customer/QueueTicketCard';
import { TicketNotificationBanner, type TicketNotification } from '@/components/customer/TicketNotificationBanner';
import { PartyPreferencesCard } from '@/components/customer/PartyPreferencesCard';
import { KitchenPreOrderCard } from '@/components/customer/KitchenPreOrderCard';
import { CustomerOrdersCard } from '@/components/customer/CustomerOrdersCard';
import { OrderService } from '@/lib/services/order-service';
import { TicketCookieSync } from '@/components/customer/TicketCookieSync';
import { CustomerQueueRealtime } from '@/components/realtime/CustomerQueueRealtime';
import { CustomerErrorState } from '@/components/customer/CustomerErrorState';
import { shouldShowNotificationBanner } from '@/lib/customer-ticket-ux';
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

/**
 * Phase 4B — Customer digital ticket (server-rendered).
 *
 * Identity ALWAYS derives from `hash(rawToken)` → row → actual
 * restaurant/entry (never from client-provided ids). The slug is only
 * cross-checked with a GENERIC 404 — including for tenant mismatches,
 * which must not reveal cross-restaurant information.
 *
 * Position/ETA come from `getQueueStatusByToken` — the same canonical
 * ordering (`joined_at + id` over WAITING/NOTIFIED/CALLED) and the same
 * ETAService config the staff dashboard reads, so both sides stay in
 * sync. Staff mutations broadcast on the narrow entry channel and the
 * ticket revalidates; a 10s visible-tab fallback covers disconnects.
 * A single refresh timer exists (inside the realtime hook) — no doubles.
 */
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
      <CustomerErrorState
        variant="not-found"
        title="Restaurant not found"
        body={`We couldn't find an active restaurant for "${slug}". Please check the QR code or link and try again.`}
      />
    );
  }

  // 2. Resolve queue status by token (authoritative)
  const status = await QueueService.getQueueStatusByToken(token);
  if (!status) {
    return (
      <CustomerErrorState
        variant="not-found"
        title="Ticket not found"
        body="We couldn't find a valid queue ticket for this link. It may have expired — you can join the queue again."
      />
    );
  }

  // 3. Tenant isolation — generic message (never reveal cross-tenant info).
  if (status.restaurantId !== restaurant.id) {
    return (
      <CustomerErrorState
        variant="not-found"
        title="Ticket not found"
        body="We couldn't find a valid queue ticket for this link. It may have expired — you can join the queue again."
      />
    );
  }

  const isTerminal = QueueService.isTerminalStatus(status.status);

  // Phase 4C/4D: surface ONE relevant persisted notification, deduplicating against
  // authoritative CALLED / SEATED hero messaging to avoid repetitive copy.
  let ticketNotification: TicketNotification | null = null;
  if (!isTerminal) {
    try {
      const rows = await NotificationService.getCustomerNotificationsByQueueId(
        status.entryId,
        status.restaurantId
      );
      const latest = rows?.[0] as unknown as {
        id?: string;
        notification_type?: string;
        message?: string;
        metadata?: { title?: string } | null;
      } | undefined;
      if (latest?.id && latest?.message) {
        const candidate = {
          id: latest.id,
          title:
            latest.metadata?.title ||
            (latest.notification_type || 'Update').replace(/_/g, ' '),
          message: latest.message,
        };
        if (shouldShowNotificationBanner(status.status, candidate)) {
          ticketNotification = candidate;
        }
      }
    } catch {
      ticketNotification = null;
    }
  }

  // Only fetch menu while still queueing (save DB on terminal tickets).
  const menuCategories = !isTerminal ? await PublicRestaurantService.getPublicMenuPreview(restaurant.id) : [];
  // My Orders: every pre-order linked to this queue entry so customers
  // never think their order vanished after navigating back to the ticket.
  let myOrders: Awaited<ReturnType<typeof OrderService.listCustomerOrdersByQueueEntry>> = [];
  try {
    myOrders = await OrderService.listCustomerOrdersByQueueEntry(status.entryId, status.restaurantId);
  } catch {
    myOrders = [];
  }
  const menuUrl = `/q/${slug}/menu?qtoken=${token}`;

  return (
    <main className="qf-bg relative flex min-h-[100dvh] flex-col text-slate-100 selection:bg-orange-500/30 selection:text-orange-100">
      {/* Phase 4E: the cookie is retained for SEATED (menu handoff stays
          reachable from the landing resume banner) and cleared only for dead
          states (CANCELLED / NO_SHOW / EXPIRED). */}
      <TicketCookieSync slug={slug} token={token} isTerminal={isTerminal && status.status !== 'SEATED'} />
      <CustomerQueueRealtime entryId={status.entryId} isTerminal={isTerminal} />

      {/* Warm ambient glow (decorative) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-gradient-to-b from-orange-600/12 via-emerald-900/10 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-6 sm:py-8">
        {/* Slim top bar: restaurant + live context + menu. No app shell. */}
        <header className="animate-fadeUp flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 text-base font-black text-white shadow-lg shadow-orange-500/30">
              {restaurant.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-tight text-white">
                {restaurant.name}
              </p>
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live ticket
              </p>
            </div>
          </div>
          {!isTerminal && (
            <Link
              href={menuUrl}
              className="qf-cta inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-[13px] font-black text-white shadow-lg shadow-orange-500/30 transition-all hover:brightness-110 active:scale-95"
            >
              <UtensilsCrossed aria-hidden="true" className="h-4 w-4" />
              Menu
            </Link>
          )}
        </header>

        {/* Journey steps: Ticket → Order → Seated */}
        {!isTerminal && (
          <ol aria-label="Your journey" className="animate-fadeUp flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3" style={{ animationDelay: '60ms' }}>
            {[
              { label: 'Ticket', icon: '🎟️', done: true, now: status.status === 'WAITING' },
              { label: 'Order', icon: '🍽️', done: myOrders.length > 0, now: false },
              { label: 'Seated', icon: '🪑', done: false, now: ['NOTIFIED', 'CALLED'].includes(status.status) },
            ].map((s, i, arr) => (
              <li key={s.label} className="flex min-w-0 flex-1 items-center gap-0.5">
                <span className={`flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-xl px-1.5 py-2 text-[10px] font-black whitespace-nowrap ${s.done ? 'bg-emerald-500/15 text-emerald-300' : s.now ? 'bg-orange-500/15 text-orange-300' : 'text-slate-500'}`}>
                  <span aria-hidden="true" className="shrink-0 text-xs">{s.icon}</span>
                  <span className="truncate">{s.done ? '✓ ' : ''}{s.label}</span>
                </span>
                {i < arr.length - 1 && <span aria-hidden="true" className="shrink-0 px-0.5 text-slate-600">›</span>}
              </li>
            ))}
          </ol>
        )}

        {/* Hero ticket */}
        <TicketNotificationBanner notification={ticketNotification} />
        <QueueTicketCard
          status={status}
          token={token}
          restaurantSlug={slug}
          restaurantName={restaurant.name}
          queueEnabled={restaurant.queueEnabled}
          operatingState={restaurant.queueOperatingState || 'OPEN'}
        />

        {!isTerminal && (
          <div className="space-y-4">
            <CustomerOrdersCard
              orders={myOrders}
              restaurantSlug={slug}
              queueToken={token}
            />
            {/* Phase 4G: the pre-order upsell stays for WAITING/NOTIFIED but
                steps aside when CALLED — the return-to-restaurant hero owns
                that moment. The top-bar Menu link remains as neutral nav. */}
            {status.status !== 'CALLED' && (
              <KitchenPreOrderCard
                queueNumber={status.displayNumber || ''}
                restaurantSlug={slug}
                token={token}
                categories={menuCategories}
              />
            )}
            <PartyPreferencesCard
              customerName={status.customerName}
              phone={null}
              partySize={status.partySize}
            />
          </div>
        )}
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-md px-4 pb-6 pt-4 text-center">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Powered by</span>
          <span className="font-bold tracking-tight text-emerald-400">QueueFlow</span>
        </p>
      </footer>
    </main>
  );
}
