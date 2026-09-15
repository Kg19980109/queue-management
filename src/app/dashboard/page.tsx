import React from 'react';
import Link from 'next/link';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { QueueService } from '@/lib/services/queue-service';
import { TableService } from '@/lib/services/table-service';
import { OrderService } from '@/lib/services/order-service';
import { NotificationService } from '@/lib/services/notification-service';
import { orderAttentionEntries, isOverdueCalled } from '@/lib/dashboard-attention';
import { logger } from '@/lib/logging/logger';
import {
  updateQueueStatusAction,
  markNoShowAction,
  setQueueOperatingStateFormAction,
  toggleQueueOpenAction,
} from '@/app/dashboard/actions';
import { SeatCustomerModal, SeatableTableItem } from '@/components/dashboard/SeatCustomerModal';
import { AddQueueGuestModal } from '@/components/dashboard/AddQueueGuestModal';
import { ConfirmSubmitButton } from '@/components/dashboard/ConfirmSubmitButton';
import { DashboardHomeRealtime } from '@/components/dashboard/DashboardHomeRealtime';

const HEALTH_TONE: Record<string, { dot: string; ring: string; label: string }> = {
  HEALTHY: { dot: 'bg-emerald-400', ring: 'border-emerald-500/25 bg-emerald-500/10', label: 'Healthy' },
  BUSY: { dot: 'bg-amber-400', ring: 'border-amber-500/25 bg-amber-500/10', label: 'Busy' },
  CRITICAL: { dot: 'bg-rose-500', ring: 'border-rose-500/30 bg-rose-500/10', label: 'Critical' },
  EMPTY: { dot: 'bg-slate-400', ring: 'border-white/10 bg-white/[0.03]', label: 'Empty' },
  PAUSED: { dot: 'bg-amber-400', ring: 'border-amber-500/25 bg-amber-500/10', label: 'Paused' },
  CLOSED: { dot: 'bg-slate-500', ring: 'border-white/10 bg-white/[0.03]', label: 'Closed' },
};

const OPERATING_COPY: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Open · accepting guests', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  PAUSED: { label: 'Paused · existing tickets stay active', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  CLOSING_SOON: { label: 'Closing soon · join while open', cls: 'border-blue-500/30 bg-blue-500/10 text-blue-300' },
  CLOSED: { label: 'Closed · not taking entries', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
};

export default async function RestaurantDashboardHomePage() {
  const { userId, restaurantId } = await RestaurantAdminService.getAuthorizedRestaurantContext();

  // Independent sections degrade separately — one failing query never blanks home.
  const degrade = async <T,>(fn: () => Promise<T>, fallback: T, section: string): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      logger.warn('Dashboard home: section degraded', {
        operation: 'dashboard_home',
        metadata: { section, error: err instanceof Error ? err.message : String(err) },
      });
      return fallback;
    }
  };

  const [ctx, health, activeEntries, tablesRes, kitchenOrders, today, alerts, canManageQueue, canSeat, canViewTables, canViewKitchen] =
    await Promise.all([
      degrade(() => RestaurantAdminService.getRestaurantDashboardStats(), null, 'context'),
      degrade(() => QueueService.getQueueHealth(restaurantId, userId), null, 'health'),
      degrade(() => QueueService.getActiveQueue(restaurantId), [], 'activeQueue'),
      degrade(() => TableService.listTables({ restaurantId }), null, 'tables'),
      degrade(() => OrderService.listKitchenOrders(restaurantId), [], 'orders'),
      degrade(() => QueueService.getTodayQueueSummary(restaurantId), { seatedGroups: 0, seatedGuests: 0, noShows: 0, cancelled: 0 }, 'today'),
      degrade(() => NotificationService.getStaffNotifications(restaurantId, 5), [], 'alerts'),
      degrade(() => AuthorizationService.hasPermission({ userId, restaurantId, permission: PERMISSIONS.QUEUE_MANAGE }), false, 'perm-manage'),
      degrade(() => AuthorizationService.hasPermission({ userId, restaurantId, permission: PERMISSIONS.QUEUE_SEAT }), false, 'perm-seat'),
      degrade(() => AuthorizationService.hasPermission({ userId, restaurantId, permission: PERMISSIONS.TABLES_VIEW }), false, 'perm-tables'),
      degrade(() => AuthorizationService.hasPermission({ userId, restaurantId, permission: PERMISSIONS.KITCHEN_VIEW }), false, 'perm-kitchen'),
    ]);

  if (!ctx) {
    throw new Error('Dashboard unavailable right now.');
  }
  const restaurant = ctx.restaurant as unknown as {
    name: string;
    queue_enabled?: boolean;
    queue_operating_state?: string;
    max_queue_capacity?: number;
    call_timeout_minutes?: number;
    status?: string;
  };
  const operatingState = restaurant.queue_operating_state || 'OPEN';
  const queueEnabled = restaurant.queue_enabled ?? true;
  const maxCapacity = restaurant.max_queue_capacity ?? 100;
  const callTimeout = restaurant.call_timeout_minutes ?? 15;
  const opCopy = OPERATING_COPY[operatingState] ?? OPERATING_COPY.OPEN ?? { label: 'Open · accepting guests', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };

  const h = health;
  const tone = (h && HEALTH_TONE[h.health]) || HEALTH_TONE.HEALTHY || { dot: 'bg-emerald-400', ring: 'border-emerald-500/25 bg-emerald-500/10', label: 'Healthy' };
  const activeCount = h?.activeCount ?? activeEntries.filter((e) => ['WAITING', 'NOTIFIED', 'CALLED'].includes(e.status)).length;
  const waitingCount = h?.waitingCount ?? activeEntries.filter((e) => e.status === 'WAITING').length;
  const calledOnly = h?.calledCount ?? activeEntries.filter((e) => e.status === 'CALLED').length;
  const notifiedOnly = h?.notifiedCount ?? activeEntries.filter((e) => e.status === 'NOTIFIED').length;
  const overdueCount = h?.overdueCount ?? 0;
  const capacityPct = maxCapacity > 0 ? Math.min(100, Math.round((activeCount / maxCapacity) * 100)) : 0;

  // Needs attention — canonical ordering, max 5.
  const attention = orderAttentionEntries(
    activeEntries as Array<{ id: string; status: string; customer_name?: string | null; party_size?: number | null; display_number?: string | null; queue_number?: number | null; joined_at?: string | null; created_at?: string | null; called_at?: string | null }>,
    callTimeout,
    5
  );

  const tables = tablesRes?.tables || [];
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE' && !t.isArchived);
  const countTables = (s: string) => tables.filter((t) => t.status === s).length;
  const seatableFor = (partySize: number): SeatableTableItem[] =>
    (availableTables as unknown as SeatableTableItem[])
      .filter((t) => (t.capacity ?? 0) >= partySize)
      .sort((a, b) => (a.capacity ?? 0) - (b.capacity ?? 0));

  const preparingCount = kitchenOrders.filter((o) => ['PLACED', 'CONFIRMED', 'PREPARING'].includes(o.status)).length;
  const readyCount = kitchenOrders.filter((o) => o.status === 'READY').length;

  return (
    <div className="flex w-full flex-col gap-5 bg-[#0A0E17] px-4 py-4 font-body-md text-white antialiased sm:gap-6 sm:px-6 sm:py-6">
      <DashboardHomeRealtime restaurantId={restaurantId} />

      {/* 1. Restaurant header: name + operating state + primary action */}
      <section aria-label="Restaurant status" className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Live operations</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{restaurant.name}</h1>
          <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${opCopy.cls}`}>
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {opCopy.label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/queue"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">groups</span>
            Open Queue
          </Link>
          <AddQueueGuestModal />
        </div>
      </section>

      {/* 2. Live queue hero — authoritative health */}
      <section aria-label="Live queue" aria-live="polite" className={`rounded-3xl border p-5 sm:p-6 ${tone.ring}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
            Live queue · {tone.label}
          </h2>
          <span className="text-xs font-semibold text-slate-400">{h?.healthReason || 'Starting up…'}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Waiting', value: waitingCount, sub: `${activeCount} active groups` },
            { label: 'Called', value: calledOnly, sub: overdueCount > 0 ? `${overdueCount} overdue` : notifiedOnly > 0 ? `${notifiedOnly} notified` : 'all on time' },
            { label: 'Oldest wait', value: h?.oldestWaitingAgeMins != null ? `${h.oldestWaitingAgeMins}m` : '—', sub: h?.avgWaitMins != null ? `avg ~${h.avgWaitMins}m` : 'no queue' },
            { label: 'Capacity', value: `${capacityPct}%`, sub: `${activeCount} / ${maxCapacity} spots` },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center">
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{k.label}</dt>
              <dd className="mt-1 truncate text-3xl font-black tabular-nums text-white">{k.value}</dd>
              <dd className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{k.sub}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4" role="img" aria-label={`Queue capacity ${capacityPct} percent`}>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${capacityPct >= 90 ? 'bg-rose-500' : capacityPct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {!queueEnabled
            ? 'Queue intake is disabled — enable it in queue settings to accept guests.'
            : operatingState === 'CLOSED'
              ? 'New entries are closed — existing tickets stay active and are never cancelled by this control.'
              : operatingState === 'PAUSED'
                ? 'New entries are paused — existing tickets stay active and are never cancelled by this control.'
                : h && !h.scheduledOpen && h.nextOpening
                  ? `Scheduled hours: reopens ${h.nextOpening.dayOffset === 0 ? 'today' : h.nextOpening.dayLabel} at ${h.nextOpening.opensAt12h}.`
                  : h && !h.scheduledOpen
                    ? 'Outside scheduled queue hours — existing tickets stay active.'
                    : 'Queue is accepting guests per current operating state.'}
        </p>
      </section>

      {/* 3. Needs attention — max 5, direct actions where permitted */}
      <section aria-label="Needs attention" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
            <span className="material-symbols-outlined text-[16px] text-amber-400" aria-hidden="true">priority_high</span>
            Needs attention{attention.length > 0 ? ` — ${attention.length}` : ''}
          </h2>
          <Link href="/dashboard/queue" className="text-xs font-bold text-blue-400 hover:text-blue-300">
            View Queue →
          </Link>
        </div>
        {attention.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-5 text-center text-[13px] font-semibold text-emerald-300">
            ✓ All clear — nothing needs you right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {attention.map((entry) => {
              const overdue = isOverdueCalled(entry, callTimeout);
              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${overdue ? 'bg-rose-600 text-white' : entry.status === 'CALLED' ? 'bg-blue-600 text-white' : entry.status === 'NOTIFIED' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'}`}>
                      {entry.display_number || entry.queue_number || '•'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {entry.customer_name || 'Guest'} · {entry.party_size ?? '?'} {entry.party_size === 1 ? 'guest' : 'guests'}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {entry.status}
                        {overdue && <span className="ml-1.5 text-rose-400">· overdue</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {entry.status === 'WAITING' && canManageQueue && (
                      <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)}>
                        <button type="submit" className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition-all hover:bg-blue-500 active:scale-95">
                          Notify
                        </button>
                      </form>
                    )}
                    {entry.status === 'NOTIFIED' && canManageQueue && (
                      <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}>
                        <button type="submit" className="h-10 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white transition-all hover:bg-purple-500 active:scale-95">
                          Call
                        </button>
                      </form>
                    )}
                    {entry.status === 'CALLED' && (
                      <>
                        {canSeat && (
                          <SeatCustomerModal
                            entryId={entry.id}
                            customerName={entry.customer_name || 'Guest'}
                            displayNumber={entry.display_number || null}
                            partySize={entry.party_size || 1}
                            userId={userId}
                            seatableTables={seatableFor(entry.party_size || 1)}
                          />
                        )}
                        {canManageQueue && (
                          <form action={markNoShowAction}>
                            <input type="hidden" name="entryId" value={entry.id} />
                            <input type="hidden" name="actorUserId" value={userId} />
                            <input type="hidden" name="reason" value="STAFF_MARKED_NO_SHOW" />
                            <button type="submit" className="h-10 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20">
                              No-show
                            </button>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 4. Operating controls — permission gated, confirm on pause/close */}
      <section aria-label="Queue intake control" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-white">Queue intake</h2>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${opCopy.cls}`}>{operatingState}</span>
        </div>
        {!canManageQueue ? (
          <p className="mt-3 text-[13px] text-slate-500">You can view operations. Queue intake controls need the queue.manage permission.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['OPEN', 'PAUSED', 'CLOSING_SOON', 'CLOSED'] as const).map((state) => {
              const active = operatingState === state;
              const dangerous = state === 'PAUSED' || state === 'CLOSED';
              const labels: Record<string, [string, string]> = {
                OPEN: ['Open', 'Reopen queue'],
                PAUSED: ['Pause', 'Pause new guests?'],
                CLOSING_SOON: ['Closing soon', 'Warn closing?'],
                CLOSED: ['Close', 'Close new entries?'],
              };
              const [idle, armed] = labels[state] || [state, state];
              return (
                <form key={state} action={setQueueOperatingStateFormAction}>
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="newState" value={state} />
                  <input type="hidden" name="actorUserId" value={userId} />
                  {active ? (
                    <span aria-current="true" className="flex h-11 w-full items-center justify-center rounded-xl border border-white bg-white text-xs font-black text-slate-900">
                      ✓ {idle}
                    </span>
                  ) : dangerous ? (
                    <ConfirmSubmitButton
                      idleLabel={idle}
                      armedLabel={armed}
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-xs font-black text-slate-200 transition-all hover:bg-white/10 active:scale-95"
                    />
                  ) : (
                    <button type="submit" className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-xs font-black text-slate-200 transition-all hover:bg-white/10 active:scale-95">
                      {idle}
                    </button>
                  )}
                </form>
              );
            })}
          </div>
        )}
        <p className="mt-2.5 text-[11px] leading-relaxed text-slate-500">
          Pausing or closing blocks <b>new</b> joins only — existing tickets stay active and are never cancelled by this control.
        </p>
        {canManageQueue && (
          <form action={toggleQueueOpenAction.bind(null, restaurantId, !queueEnabled, userId)} className="mt-2">
            <button type="submit" className="text-[11px] font-bold text-slate-400 underline-offset-2 hover:text-white hover:underline">
              {queueEnabled ? 'Disable queue intake entirely' : 'Re-enable queue intake'}
            </button>
          </form>
        )}
      </section>

      {/* 5+6. Tables + orders summaries */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <section aria-label="Tables summary" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-white">Tables</h2>
            {canViewTables ? (
              <Link href="/dashboard/tables" className="text-xs font-bold text-blue-400 hover:text-blue-300">Manage Tables →</Link>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: 'Available', value: h?.availableTables ?? countTables('AVAILABLE'), accent: 'text-emerald-300' },
              { label: 'Occupied', value: h?.occupiedTables ?? countTables('OCCUPIED'), accent: 'text-white' },
              { label: 'Cleaning', value: h?.cleaningTables ?? countTables('CLEANING'), accent: 'text-amber-300' },
              { label: 'Reserved', value: h?.reservedTables ?? countTables('RESERVED'), accent: 'text-blue-300' },
              { label: 'Out of service', value: h?.outOfServiceTables ?? 0, accent: 'text-slate-400' },
              { label: 'Total', value: h?.totalTables ?? tables.length, accent: 'text-slate-300' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</dt>
                <dd className={`mt-0.5 truncate text-2xl font-black tabular-nums ${s.accent}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Orders summary" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-white">Orders</h2>
            {canViewKitchen ? (
              <Link href="/dashboard/kitchen" className="text-xs font-bold text-blue-400 hover:text-blue-300">Open Kitchen →</Link>
            ) : null}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Active', value: kitchenOrders.length, accent: 'text-white' },
              { label: 'Preparing', value: preparingCount, accent: 'text-amber-300' },
              { label: 'Ready', value: readyCount, accent: 'text-emerald-300' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</dt>
                <dd className={`mt-0.5 truncate text-2xl font-black tabular-nums ${s.accent}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-slate-500">Kitchen queue only — billing lives in Payments.</p>
        </section>
      </div>

      {/* 7. Today + alerts (secondary) */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <section aria-label="Today" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Today · seated & resolved</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Groups seated', value: today.seatedGroups },
              { label: 'Guests seated', value: today.seatedGuests },
              { label: 'No-shows', value: today.noShows },
              { label: 'Cancelled', value: today.cancelled },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-black/30 p-3 text-center">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</dt>
                <dd className="mt-0.5 text-xl font-black tabular-nums text-white">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Recent alerts" className="rounded-3xl border border-white/10 bg-[#111827] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent alerts</h2>
            <Link href="/dashboard/queue" className="text-xs font-bold text-blue-400 hover:text-blue-300">View Queue →</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="mt-3 text-[13px] text-slate-500">No recent staff alerts.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(alerts as Array<{ id: string; notification_type?: string | null; message?: string | null }>).slice(0, 4).map((a) => (
                <li key={a.id} className="truncate rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  <span className="font-bold text-slate-400">{(a.notification_type || 'update').replace(/_/g, ' ')}</span>
                  {' — '}{a.message || ''}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
