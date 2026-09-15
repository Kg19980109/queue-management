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
import { getTicketToken } from '@/lib/customer-ticket-cookie';
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
  let activeTicketToken: string | null = null;
  try {
    const raw = await getTicketToken(slug);
    if (raw) {
      const s = await QueueService.getQueueStatusByToken(raw);
      if (s && s.restaurantId === restaurant.id && ['WAITING', 'NOTIFIED', 'CALLED'].includes(s.status)) {
        activeTicketToken = raw;
      }
    }
  } catch {
    activeTicketToken = null;
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col justify-between overflow-hidden bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-100">
      <LandingAutoRefresh />

      {/* Background glow (decorative) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] bg-gradient-to-b from-emerald-900/20 via-slate-900/5 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-[10%] -top-[10%] -z-0 h-[50%] w-[60%] rounded-full bg-emerald-500/15 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-[10%] top-[15%] -z-0 h-[40%] w-[45%] rounded-full bg-blue-500/12 blur-[100px]" />

      <div className="relative z-10 mx-auto w-full max-w-md space-y-5 px-4 py-6 sm:py-8">
        {/* Resume banner (server cookie, no JS storage) */}
        <TicketResumeBanner slug={slug} />

        <RestaurantHeader restaurant={restaurant} waitingCount={waitingCount} />

        <QueueStatusCard
          state={landingState}
          waitingCount={waitingCount}
          waitLabel={waitingCount === 0 && canJoin ? 'No wait' : waitLabel}
          nextOpening={nextOpening}
          capacity={{ active: activeQueueCount, max: restaurant.maxQueueCapacity }}
        />

        {activeTicketToken ? (
          <section
            aria-label="Already in queue"
            className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center shadow-2xl"
          >
            <p className="text-sm font-black text-white">You&apos;re already in the queue</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Your spot is saved — no need to fill the form again.
            </p>
            <Link
              href={`/q/${slug}/status/${activeTicketToken}`}
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-400 active:scale-[0.98]"
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

        {/* Contact + secondary menu access (only when data exists) */}
        {(restaurant.phone || restaurant.address) && (
          <section aria-label="Restaurant information" className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
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

        <div>
          <MenuPreviewSection categories={menuCategories} />
          <Link
            href={`/q/${slug}/menu`}
            className="mt-2 flex min-h-[44px] items-center justify-center gap-1 rounded-2xl text-[13px] font-semibold text-slate-400 transition-colors hover:text-emerald-300"
          >
            View full menu
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
