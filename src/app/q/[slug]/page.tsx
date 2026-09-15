import React from 'react';
import Link from 'next/link';
import { ChevronRight, Phone } from 'lucide-react';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { ETAService } from '@/lib/services/eta-service';
import { QueueScheduleService } from '@/lib/services/queue-schedule-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { QueueStatusCard } from '@/components/customer/QueueStatusCard';
import { QueueJoinForm } from '@/components/customer/QueueJoinForm';
import { MenuPreviewSection } from '@/components/customer/MenuPreviewSection';
import { TicketResumeBanner } from '@/components/customer/TicketResumeBanner';
import { LandingAutoRefresh } from '@/components/customer/LandingAutoRefresh';
import { CustomerErrorState } from '@/components/customer/CustomerErrorState';
import { resolveJoinability, formatWaitLabel } from '@/lib/customer-join-ux';
import { getTicketToken, clearTicketCookie } from '@/lib/customer-ticket-cookie';
import { logger } from '@/lib/logging/logger';
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

/**
 * Phase 4A — Customer QR landing page (server-rendered).
 *
 * Data: restaurant (cached 5 min) + active queue + schedule availability
 * load in parallel; menu preview streams below. All joinability comes
 * from `resolveJoinability` over authoritative backend state — the page
 * never invents its own rules. Join authorization stays server-side in
 * `join_queue_atomic`. ETA uses the restaurant's own tuning via the
 * authoritative `ETAService` formula (no client-side guesswork).
 */
export default async function PublicRestaurantQueuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return (
      <CustomerErrorState
        variant="not-found"
        title="Restaurant not found"
        body={`We couldn't find an active restaurant queue for "${slug}". Please check the QR code or link and try again.`}
      />
    );
  }

  // A transient queue fetch failure degrades (empty counts, join still
  // possible via authoritative RPC) instead of 500ing the customer page.
  let waitingCount = 0;
  let activeQueueCount = 0;
  try {
    const activeEntries = await QueueService.getActiveQueue(restaurant.id);
    waitingCount = activeEntries.filter((e) => e.status === 'WAITING').length;
    activeQueueCount = activeEntries.filter((e) =>
      ['WAITING', 'NOTIFIED', 'CALLED'].includes(e.status)
    ).length;
  } catch (err) {
    logger.warn('Customer queue page: active queue fetch failed, degrading to empty', {
      operation: 'public_queue_page',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  const [menuCategories, availability] = await Promise.all([
    PublicRestaurantService.getPublicMenuPreview(restaurant.id),
    // Effective availability: lifecycle > queue_enabled > manual PAUSED/CLOSED > schedule
    (async () => {
      try {
        return await QueueScheduleService.evaluateAvailability(restaurant.id);
      } catch {
        return null;
      }
    })(),
  ]);

  const isFull = activeQueueCount >= restaurant.maxQueueCapacity;
  const { canJoin, state: landingState } = resolveJoinability({
    queueEnabled: restaurant.queueEnabled,
    operatingState: restaurant.queueOperatingState || 'OPEN',
    isFull,
    scheduledOpen: availability ? availability.scheduledOpen : true,
  });
  const nextOpening = availability?.nextOpening || null;

  // Authoritative ETA: restaurant's own tuning + live queue depth.
  // A newcomer lands behind `waitingCount` parties (position waitingCount+1).
  const eta =
    canJoin && waitingCount > 0
      ? ETAService.calculateETA(waitingCount + 1, {
          avgServiceTimeMins: restaurant.avgServiceTimeMins,
          serviceCapacityUnits: restaurant.serviceCapacityUnits,
          etaBufferMins: restaurant.etaBufferMins,
          almostYourTurnThreshold: 3,
        })
      : null;
  const waitLabel =
    !canJoin || waitingCount === 0 ? null : formatWaitLabel(eta?.estimatedWaitMins);

  // If this browser already holds a live ticket (HttpOnly cookie), don't
  // push the join form again — going "back" to the info page after joining
  // was the top customer complaint. Show resume instead of a duplicate form.
  // Phase 4E: SEATED tickets are retained (cookie survives seating) so the
  // resume copy reflects the current state — waiting, called, or seated.
  // Dead states (CANCELLED / NO_SHOW / EXPIRED) have their cookies cleared
  // on visit and always land on the join form.
  let activeTicketToken: string | null = null;
  type ActiveTicketState = 'WAITING' | 'NOTIFIED' | 'CALLED' | 'SEATED';
  let activeTicketState: ActiveTicketState = 'WAITING';
  try {
    const raw = await getTicketToken(slug);
    if (raw) {
      const s = await QueueService.getQueueStatusByToken(raw);
      if (s && s.restaurantId === restaurant.id && ['WAITING', 'NOTIFIED', 'CALLED', 'SEATED'].includes(s.status) && !s.completedAt) {
        activeTicketToken = raw;
        activeTicketState = s.status as ActiveTicketState;
      } else if (s?.completedAt) {
        await clearTicketCookie(slug);
      }
    }
  } catch {
    activeTicketToken = null;
  }

  return (
    <main className="qf-bg relative flex min-h-[100dvh] flex-col justify-between overflow-hidden text-slate-100 selection:bg-orange-500/30 selection:text-orange-100">
      <LandingAutoRefresh />

      {/* Warm ambient glows (decorative) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[460px] bg-gradient-to-b from-orange-600/15 via-emerald-900/10 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[10%] -top-[10%] -z-0 h-[50%] w-[60%] rounded-full bg-orange-500/12 blur-[110px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[10%] top-[15%] -z-0 h-[40%] w-[45%] rounded-full bg-emerald-500/12 blur-[110px]" />

      <div className="relative z-10 mx-auto w-full max-w-md space-y-5 px-4 py-6 sm:py-8">
        {/* Resume banner (server cookie, no JS storage) */}
        <TicketResumeBanner slug={slug} />

        <div className="animate-fadeUp">
          <RestaurantHeader restaurant={restaurant} waitingCount={waitingCount} />
        </div>

        {/* How it works — 3 glanceable steps for first-time guests */}
        <ol className="animate-fadeUp grid grid-cols-3 gap-2" style={{ animationDelay: '80ms' }} aria-label="How it works">
          {[
            { n: '1', icon: '🎟️', label: 'Join queue' },
            { n: '2', icon: '🍽️', label: 'Pre-order food' },
            { n: '3', icon: '🔔', label: 'Get seated' },
          ].map((s) => (
            <li
              key={s.n}
              className="qf-card flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-2xl px-1 py-3 text-center"
            >
              <span aria-hidden="true" className="text-xl leading-none">{s.icon}</span>
              <span className="w-full truncate text-[10px] font-black tracking-tight text-white">{s.label}</span>
              <span className="text-[10px] font-bold text-slate-500">Step {s.n}</span>
            </li>
          ))}
        </ol>

        <div className="animate-fadeUp" style={{ animationDelay: '140ms' }}>
        <QueueStatusCard
          state={landingState}
          waitingCount={waitingCount}
          waitLabel={waitingCount === 0 && canJoin ? 'No wait' : waitLabel}
          nextOpening={nextOpening}
          capacity={{ active: activeQueueCount, max: restaurant.maxQueueCapacity }}
        />
        </div>

        <div className="animate-fadeUp" style={{ animationDelay: '200ms' }}>
        {activeTicketToken ? (
          <section
            aria-label="Already in queue"
            className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-slate-900/90 to-teal-500/10 p-5 text-center shadow-2xl shadow-emerald-500/10"
          >
            <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Spot saved
            </p>
            <p className="mt-2 text-base font-black tracking-tight text-white">
              {activeTicketState === 'SEATED'
                ? "You're seated — enjoy your meal 🎉"
                : activeTicketState === 'CALLED'
                  ? 'Your turn is being called 📢'
                  : "You're already in the queue 🎉"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {activeTicketState === 'SEATED'
                ? 'Your table is ready — your ticket is live below.'
                : activeTicketState === 'CALLED'
                  ? 'Please return to the restaurant now — your ticket is live below.'
                  : 'No need to fill the form again — your ticket is live below.'}
            </p>
            <Link
              href={`/q/${slug}/status/${activeTicketToken}`}
              className="qf-cta mt-3 flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-500/30 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              View My Ticket →
            </Link>
            <p className="mt-2 text-[11px] text-slate-400">
              Different guest? Ask the host to cancel this ticket first.
            </p>
          </section>
        ) : canJoin ? (
          <QueueJoinForm restaurant={restaurant} />
        ) : (
          <p className="px-2 text-center text-[11px] text-slate-500">
            {landingState === 'FULL'
              ? 'This page updates automatically — no need to refresh.'
              : 'Ask the host if you need help.'}
          </p>
        )}
        </div>

        {/* Contact + secondary menu access (only when data exists) */}
        {(restaurant.phone || restaurant.address) && (
          <section aria-label="Restaurant information" className="qf-card space-y-2 rounded-2xl p-4">
            {restaurant.address && (
              <p className="text-center text-[13px] text-slate-300">
                {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
              </p>
            )}
            {restaurant.phone && (
              <p className="text-center">
                <a
                  href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  {restaurant.phone}
                </a>
              </p>
            )}
          </section>
        )}

        <div className="animate-fadeUp" style={{ animationDelay: '260ms' }}>
          <MenuPreviewSection categories={menuCategories} />
          <Link
            href={`/q/${slug}/menu`}
            className="qf-card mt-2 flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl text-[13px] font-black text-orange-300 transition-all hover:border-orange-500/30 hover:text-orange-200 active:scale-[0.99]"
          >
            🍽️ View full menu
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-md px-4 pb-6 pt-8 text-center">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Powered by</span>
          <span className="font-bold tracking-tight text-emerald-400">QueueFlow</span>
        </p>
      </footer>
    </main>
  );
}
