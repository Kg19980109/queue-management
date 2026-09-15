import React from 'react';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { QueueService } from '@/lib/services/queue-service';
import { TableService } from '@/lib/services/table-service';

function getWaitTimeMins(joinedAt: string) {
  const diffMs = new Date().getTime() - new Date(joinedAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}
import {
  updateQueueStatusAction,
  toggleQueueOpenAction,
  setQueueOperatingStateFormAction,
  updateQueueSettingsFormAction,
  updateETASettingsFormAction,
  updateQueueScheduleFormAction,
  markNoShowAction,
} from '@/app/dashboard/actions';
import { SeatCustomerModal, SeatableTableItem } from '@/components/dashboard/SeatCustomerModal';
import { AddQueueGuestModal } from '@/components/dashboard/AddQueueGuestModal';
import { ConfirmSubmitButton } from '@/components/dashboard/ConfirmSubmitButton';
import { CollapsibleQueueSchedule } from '@/components/dashboard/CollapsibleQueueSchedule';
import { CollapsibleQueueHealth } from '@/components/dashboard/CollapsibleQueueHealth';
import { logger } from '@/lib/logging/logger';
import Link from 'next/link';

export default async function QueueManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; updated?: string; toggled?: string; settingsUpdated?: string; etaUpdated?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || 'ACTIVE';
  const searchTerm = params.search || '';

  const { userId, restaurantId } = await RestaurantAdminService.getAuthorizedRestaurantContext();
  const supabase = createAdminClient();
  // maybeSingle (not single): a missing row must render the fallback UI,
  // never throw a 500.
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle();

  if (!restaurant) {
    return <div className="p-space-xl text-error">No managed restaurant assigned.</div>;
  }

  // Parallelize independent fetches for snappy load.
  // Each section degrades independently: a transient DB failure in one fetch
  // renders that section empty instead of 500ing the entire page.
  const [entries, activeEntries, tablesRes, scheduleInfo] = await Promise.all([
    QueueService.getAllQueueEntries(restaurant.id, statusFilter, searchTerm).catch((err) => {
      logger.warn('Queue page: entries fetch failed, degrading to empty', {
        operation: 'dashboard_queue_page',
        metadata: { section: 'entries', error: err instanceof Error ? err.message : String(err) },
      });
      return [];
    }),
    QueueService.getActiveQueue(restaurant.id).catch((err) => {
      logger.warn('Queue page: active queue fetch failed, degrading to empty', {
        operation: 'dashboard_queue_page',
        metadata: { section: 'activeEntries', error: err instanceof Error ? err.message : String(err) },
      });
      return [];
    }),
    TableService.listTables({ restaurantId: restaurant.id }).catch((err) => {
      logger.warn('Queue page: tables fetch failed, degrading to empty', {
        operation: 'dashboard_queue_page',
        metadata: { section: 'tables', error: err instanceof Error ? err.message : String(err) },
      });
      return TableService.emptyTablesResult();
    }),
    (async () => {
      try {
        const { QueueScheduleService } = await import('@/lib/services/queue-schedule-service');
        const schedule = await QueueScheduleService.getSchedule(restaurant.id, userId);
        const availability = await QueueScheduleService.evaluateAvailability(restaurant.id);
        return { schedule, availability };
      } catch { return null; }
    })(),
  ]);

  // Queue health must never crash the page — fall back to locally computed health
  let queueHealth: Awaited<ReturnType<typeof QueueService.getQueueHealth>>;
  try {
    queueHealth = await QueueService.getQueueHealth(restaurant.id, userId);
  } catch {
    queueHealth = QueueService.buildFallbackQueueHealth({
      restaurant,
      activeEntries,
      tables: tablesRes.tables,
    });
  }

  const waitingEntries = activeEntries.filter((e) => e.status === 'WAITING');
  const calledEntries = activeEntries.filter((e) => e.status === 'CALLED' || e.status === 'NOTIFIED');
  const waitingCount = waitingEntries.length;
  const calledCount = calledEntries.length;
  const totalGuests = activeEntries.reduce((sum, e) => sum + e.party_size, 0);
  const queueEnabled = restaurant.queue_enabled ?? true;
  const operatingState = (restaurant as unknown as { queue_operating_state: string }).queue_operating_state || 'OPEN';
  const isFull = activeEntries.filter(e => ['WAITING','NOTIFIED','CALLED'].includes(e.status)).length >= (restaurant.max_queue_capacity ?? 100);

  // Best next guest logic (first waiting)
  const nextUp = waitingEntries.length > 0 ? waitingEntries[0] : null;

  // Build seatable map by filtering local available tables (avoids N RPC calls)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableTables = tablesRes.tables.filter((t: any) => t.status === 'AVAILABLE' && !t.is_archived) as unknown as SeatableTableItem[];
  const uniquePartySizes = Array.from(new Set(entries.map((e) => e.party_size)));
  const seatableTablesMap = new Map<number, SeatableTableItem[]>();
  for (const size of uniquePartySizes) {
    seatableTablesMap.set(
      size,
      availableTables.filter((t) => (t.capacity ?? 0) >= size).sort((a, b) => (a.capacity ?? 0) - (b.capacity ?? 0))
    );
  }
  const tablesTotal = tablesRes.stats.total;
  const tablesReady = tablesRes.stats.available;
  const tablesOccupied = tablesRes.stats.occupied;
  const tablesCleaning = tablesRes.tables.filter(t => t.status === 'CLEANING').length;
  const tablesReserved = tablesRes.tables.filter(t => t.status === 'RESERVED').length;

  const occupiedPct = tablesTotal > 0 ? (tablesOccupied / tablesTotal) * 100 : 0;
  const cleaningPct = tablesTotal > 0 ? (tablesCleaning / tablesTotal) * 100 : 0;
  const reservedPct = tablesTotal > 0 ? (tablesReserved / tablesTotal) * 100 : 0;
  const readyPct = tablesTotal > 0 ? (tablesReady / tablesTotal) * 100 : 0;

  let avgWaitTime = 0;
  if (activeEntries.length > 0) {
    const totalWait = activeEntries.reduce((acc, q) => acc + getWaitTimeMins(q.joined_at), 0);
    avgWaitTime = Math.floor(totalWait / activeEntries.length);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEntries = entries.filter(e => new Date(e.created_at) >= todayStart);
  const seatedToday = todayEntries.filter(e => e.status === 'SEATED').length;
  // Guests actually arrived (seat-time headcount) vs expected party size.
  // Falls back to party_size for rows seated before the migration.
  const guestsSeatedToday = todayEntries
    .filter(e => e.status === 'SEATED')
    .reduce((s, e) => s + ((e as unknown as { actual_guests?: number }).actual_guests ?? e.party_size ?? 0), 0);
  const guestsExpectedToday = todayEntries
    .filter(e => e.status === 'SEATED')
    .reduce((s, e) => s + (e.party_size ?? 0), 0);
  const noShowsToday = todayEntries.filter(e => e.status === 'NO_SHOW').length;
  const totalResolvedToday = seatedToday + noShowsToday + todayEntries.filter(e => e.status === 'CANCELLED').length;
  const noShowRate = totalResolvedToday > 0 ? ((noShowsToday / totalResolvedToday) * 100).toFixed(1) : '0.0';

  let bestMatchTable = null;
  if (nextUp) {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const candidates = tablesRes.tables.filter((t: any) => t.status === 'AVAILABLE' && t.capacity >= nextUp.party_size);
     if (candidates.length > 0) {
        candidates.sort((a, b) => a.capacity - b.capacity);
        bestMatchTable = candidates[0];
     }
  }

  return (
    <div className="flex flex-col w-full px-4 sm:px-6 md:px-space-xl py-4 sm:py-space-lg gap-5 sm:gap-space-lg bg-[#0A0E17] min-h-screen font-body-md text-white antialiased relative z-10">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-[22px] sm:text-3xl lg:text-4xl font-black text-white tracking-tight font-headline-xl leading-tight">Live Queue</h1>
            <div className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs shrink-0 self-start sm:self-auto ${queueEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${queueEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="tracking-widest uppercase font-bold leading-none">
                {queueEnabled ? `${activeEntries.length} Groups • ${totalGuests} Guests` : 'Queue Closed'}
              </span>
            </div>
          </div>
          <p className="text-[13px] sm:text-sm text-slate-400 leading-relaxed">Real-time floor flow and instantaneous guest dispatch.</p>
        </div>
        
        {/* Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {nextUp && (
            <form action={updateQueueStatusAction.bind(null, nextUp.id, 'NOTIFIED', userId)} className="flex-1 sm:flex-none">
              <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 border border-blue-500" id="call-next-hero-btn">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                <span>Notify {nextUp.display_number || nextUp.queue_number}</span>
              </button>
            </form>
          )}

          <form action={toggleQueueOpenAction.bind(null, restaurant.id, !queueEnabled, userId)} className="shrink-0">
            <button
              type="submit"
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 h-11 rounded-xl text-sm font-bold transition-colors border active:scale-95 ${
                queueEnabled
                  ? 'bg-[#111827] hover:bg-white/5 border-white/10 text-slate-300'
                  : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-lg'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {queueEnabled ? 'pause_circle' : 'play_circle'}
              </span>
              <span className="hidden xs:inline">{queueEnabled ? 'Pause' : 'Open'}</span>
            </button>
          </form>
          <div className="shrink-0">
            <AddQueueGuestModal />
          </div>
        </div>
      </div>

      {/* Queue Operating Controls */}
      <div className="p-4 rounded-2xl bg-[#111827] border border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">tune</span>
            Queue Intake Control
          </h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${operatingState === 'OPEN' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : operatingState === 'PAUSED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : operatingState === 'CLOSING_SOON' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            {operatingState} {isFull && operatingState === 'OPEN' ? '• FULL' : ''}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['OPEN','PAUSED','CLOSING_SOON','CLOSED'] as const).map((state) => (
            <form key={state} action={setQueueOperatingStateFormAction}>
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <input type="hidden" name="newState" value={state} />
              <input type="hidden" name="actorUserId" value={userId} />
              <button type="submit" className={`w-full h-11 rounded-xl text-xs font-black border transition-all active:scale-95 ${operatingState === state ? 'bg-white text-slate-900 border-white shadow-md' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                {state.replace('_',' ')}
              </button>
            </form>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          <b className="text-slate-400">OPEN:</b> joins allowed • <b className="text-amber-400">PAUSED</b> new joins blocked (existing intact) • <b className="text-blue-400">CLOSING_SOON</b> warning but still allows joins • <b className="text-rose-400">CLOSED</b> joins blocked • <b className="text-slate-400">FULL</b> auto when {activeEntries.filter(e=>['WAITING','NOTIFIED','CALLED'].includes(e.status)).length}/{restaurant.max_queue_capacity} active
        </p>
      </div>

      {/* Queue Schedule - weekly operating hours (Collapsible & default collapsed) */}
      <CollapsibleQueueSchedule
        scheduleInfo={scheduleInfo}
        updateAction={updateQueueScheduleFormAction}
        timezone={(restaurant as unknown as { timezone?: string }).timezone || 'Asia/Kolkata'}
      />

      {/* Queue Health - server-side aggregation (Collapsible & default collapsed) */}
      <CollapsibleQueueHealth
        queueHealth={queueHealth}
        maxQueueCapacity={restaurant.max_queue_capacity || 100}
        callTimeoutMinutes={restaurant.call_timeout_minutes || 15}
      />

      {/* Needs Attention - operational view */}
      {(() => {
        const needsAttention = [...entries]
          .filter(e => ['CALLED','NOTIFIED','WAITING'].includes(e.status))
          .sort((a,b) => {
            const order: Record<string, number> = { CALLED: 0, NOTIFIED: 1, WAITING: 2 };
            const ao = order[a.status] ?? 9;
            const bo = order[b.status] ?? 9;
            if (ao !== bo) return ao - bo;
            // overdue first
            const aOverdue = a.status === 'CALLED' && a.called_at && (Date.now() - new Date(a.called_at).getTime()) > (restaurant.call_timeout_minutes*60*1000) ? 0 : 1;
            const bOverdue = b.status === 'CALLED' && b.called_at && (Date.now() - new Date(b.called_at).getTime()) > (restaurant.call_timeout_minutes*60*1000) ? 0 : 1;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;
            return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
          })
          .slice(0, 5);
        if (needsAttention.length === 0) return null;
        return (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              Needs Attention — {needsAttention.length}
            </h3>
            <div className="space-y-2">
              {needsAttention.map(entry => {
                const isOverdue = entry.status === 'CALLED' && entry.called_at && (Date.now() - new Date(entry.called_at).getTime()) > (restaurant.call_timeout_minutes*60*1000);
                const calledAgeMins = entry.called_at ? Math.floor((Date.now() - new Date(entry.called_at).getTime())/60000) : null;
                const timeoutIn = calledAgeMins !== null ? restaurant.call_timeout_minutes - calledAgeMins : null;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111827] border border-white/5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${entry.status==='CALLED' ? 'bg-blue-600 text-white' : entry.status==='NOTIFIED' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'}`}>{entry.display_number || entry.queue_number}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{entry.customer_name} • {entry.party_size} guests</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${entry.status==='CALLED' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : entry.status==='NOTIFIED' ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/10 text-slate-300'}`}>{entry.status}</span>
                          {entry.status==='CALLED' && calledAgeMins !== null && (
                            <span className={`text-[11px] ${isOverdue ? 'text-rose-400 font-bold' : timeoutIn !== null && timeoutIn <= 2 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                              {isOverdue ? `Overdue by ${Math.abs(timeoutIn!)}m` : timeoutIn !== null ? `Timeout in ${timeoutIn}m` : `Called ${calledAgeMins}m ago`}
                            </span>
                          )}
                          {entry.status==='CALLED' && isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {entry.status==='CALLED' && <form action={updateQueueStatusAction.bind(null, entry.id, 'NO_SHOW', userId, 'STAFF_MARKED_NO_SHOW')}><ConfirmSubmitButton idleLabel="No-Show" armedLabel="Confirm?" className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold transition-colors hover:bg-rose-500/20 active:scale-95" /></form>}
                      {entry.status==='CALLED' && <div className="scale-75 origin-right"><SeatCustomerModal entryId={entry.id} customerName={entry.customer_name} displayNumber={entry.display_number} partySize={entry.party_size} userId={userId} seatableTables={seatableTablesMap.get(entry.party_size) || []} /></div>}
                      {entry.status==='NOTIFIED' && <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}><button type="submit" className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold">Call</button></form>}
                      {entry.status==='WAITING' && <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)}><button type="submit" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Notify</button></form>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Real-time KPI Dynamic Ribbon - horizontal scroll on mobile, grid on desktop */}
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 md:grid md:grid-cols-3">
        {/* Metric 1 */}
        <div className="min-w-[220px] snap-center shrink-0 md:min-w-0 md:shrink md:snap-none p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase text-slate-400 tracking-widest font-bold">Total Waiting</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <span className="material-symbols-outlined text-blue-400 text-[18px]">groups</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{waitingCount}</span>
            <span className="text-xs text-slate-400">groups</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> Steady flow
            </span>
            <svg className="w-16 h-5 text-emerald-400/50" fill="none" viewBox="0 0 64 20">
              <path d="M0 16 L12 12 L24 14 L36 8 L48 10 L64 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
        </div>
        
        {/* Metric 2 */}
        <div className="min-w-[220px] snap-center shrink-0 md:min-w-0 md:shrink md:snap-none p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase text-slate-400 tracking-widest font-bold">Currently Called</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">contactless</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{calledCount}</span>
            <span className="text-xs text-slate-400">paged to stand</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span>Tables Pending</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="min-w-[220px] snap-center shrink-0 md:min-w-0 md:shrink md:snap-none p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase text-slate-400 tracking-widest font-bold">Avg Wait Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">timer</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">~{avgWaitTime}<span className="text-sm text-amber-400/50 font-normal">m</span></span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${avgWaitTime <= (restaurant.avg_service_time_mins ?? 25) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>{avgWaitTime <= (restaurant.avg_service_time_mins ?? 25) ? 'Healthy' : 'High'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold tracking-wide">
            <span>Target: &lt; {restaurant.avg_service_time_mins ?? 25} mins</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="min-w-[220px] snap-center shrink-0 md:min-w-0 md:shrink md:snap-none p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase text-slate-400 tracking-widest font-bold">Seated Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">table_bar</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{seatedToday}</span>
            <span className="text-xs text-slate-400">groups · {guestsSeatedToday} guests{guestsSeatedToday !== guestsExpectedToday ? ` (exp. ${guestsExpectedToday})` : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
            <span className="material-symbols-outlined text-[14px]">north_east</span>
            <span>Active Service</span>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="min-w-[220px] snap-center shrink-0 md:min-w-0 md:shrink md:snap-none p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] uppercase text-slate-400 tracking-widest font-bold">No-Show Rate</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">person_cancel</span>
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{noShowRate}%</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${parseFloat(noShowRate) < 5 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>{parseFloat(noShowRate) < 5 ? 'Low' : 'High'}</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div className={`h-full rounded-full ${parseFloat(noShowRate) < 5 ? 'bg-cyan-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(parseFloat(noShowRate), 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Search, Filter Badges, and Views Splitter */}
      <div className="flex flex-col gap-3 p-3 sm:p-4 rounded-2xl bg-[#111827] border border-white/5 shadow-sm">
        <form method="GET" action="/dashboard/queue" className="relative w-full">
          <input type="hidden" name="status" value={statusFilter} />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input 
            name="search"
            defaultValue={searchTerm}
            className="w-full pl-9 pr-4 h-11 rounded-xl bg-[#0A0E17] border border-white/10 text-white placeholder:text-slate-500 text-[15px] sm:text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" 
            placeholder="Search guest, phone, ticket #..." 
            type="text"
            enterKeyHint="search"
          />
        </form>
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
          {[
            { label: `Active (${activeEntries.length})`, value: 'ACTIVE' },
            { label: `Waiting ${waitingCount}`, value: 'WAITING' },
            { label: `Called ${calledCount}`, value: 'CALLED' },
            { label: 'History', value: 'TERMINAL' },
            { label: 'All Records', value: 'ALL' },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/dashboard/queue?status=${tab.value}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`}
              className={`px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors whitespace-nowrap shrink-0 border ${
                statusFilter === tab.value
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white/[0.04] border-white/10 text-slate-300 active:bg-white/10'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Workstation Layout: Queue Feed & Forms */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        
        {/* Queue Feed Stream (8 Columns) */}
        <div className="xl:col-span-8 flex flex-col gap-4 mt-2">
          {entries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-[#111827] border border-white/5 rounded-2xl shadow-sm">
              No queue entries found matching your filter criteria.
            </div>
          ) : (
            entries.map((entry, index) => {
              const isWaiting = entry.status === 'WAITING';
              const isCalled = entry.status === 'CALLED';
              const isNotified = entry.status === 'NOTIFIED';
              const isSeated = entry.status === 'SEATED';

              const seatableTables = seatableTablesMap.get(entry.party_size) || [];

              // Derived mock attributes for styling based on Stitch design (falling back to the real DB fields if added via SQL)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const anyEntry = entry as any;
              const isVIP = anyEntry.is_vip || false;
              const hasPreOrder = anyEntry.pre_order_amount && anyEntry.pre_order_amount > 0;
              const isLargeGroup = entry.party_size >= 6;
              const isNext = isWaiting && index === 0;

              const cleanNum = (entry.display_number || entry.queue_number || '').toString().replace(/^#+/, '');
              const waitMins = Math.max(0, Math.floor((Date.now() - new Date(entry.joined_at || entry.created_at).getTime()) / 60000));

              // High-impact status theme tokens
              const cardTheme = isSeated
                ? {
                    border: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
                    badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
                    box: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-emerald-900/40',
                  }
                : isCalled
                ? {
                    border: 'border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/30',
                    badge: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
                    box: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-blue-900/40',
                  }
                : isNotified
                ? {
                    border: 'border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
                    badge: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
                    box: 'bg-gradient-to-br from-purple-600 to-pink-700 text-white shadow-purple-900/40',
                  }
                : isNext
                ? {
                    border: 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.12)]',
                    badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
                    box: 'bg-gradient-to-br from-slate-800 to-cyan-950 border border-cyan-500/40 text-cyan-300',
                  }
                : {
                    border: 'border-white/10 hover:border-white/20',
                    badge: 'bg-white/5 border-white/10 text-slate-400',
                    box: 'bg-[#151D2A] border border-white/10 text-slate-300',
                  };

              return (
                <div
                  key={entry.id}
                  className={`relative p-4 sm:p-5 rounded-2xl bg-[#0E1526]/90 backdrop-blur-md border ${cardTheme.border} transition-all duration-200 flex flex-col gap-3.5 overflow-hidden group`}
                >
                  {/* Left glowing accent line */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isSeated
                        ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                        : isCalled
                        ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'
                        : isNotified
                        ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]'
                        : isNext
                        ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                        : 'bg-slate-700'
                    }`}
                  />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* High-Contrast Ticket Monospace Display */}
                      <div
                        className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex-shrink-0 shadow-lg ${cardTheme.box}`}
                      >
                        <span className="font-mono font-black text-xl sm:text-2xl tracking-tight leading-none">
                          {cleanNum}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest font-black mt-1 px-1 rounded">
                          {isSeated
                            ? 'DINING'
                            : isCalled
                            ? 'PRIORITY'
                            : isNotified
                            ? 'ARRIVING'
                            : isNext
                            ? 'UP NEXT'
                            : `#${index + 1} IN LINE`}
                        </span>
                      </div>

                      {/* Guest Profile & Metadata */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                            {entry.customer_name}
                          </span>
                          {isVIP && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black border border-amber-500/30 shrink-0">
                              <span>⭐</span> VIP
                            </span>
                          )}
                          {isLargeGroup && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-black border border-orange-500/30 shrink-0">
                              <span>🔥</span> Large Group
                            </span>
                          )}
                        </div>

                        {/* Contact & Party details */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs sm:text-[13px] text-slate-300 flex-wrap">
                          <span className="font-semibold text-slate-200">
                            👥 {entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}
                          </span>
                          <span className="text-slate-600">•</span>
                          {entry.customer_phone ? (
                            <a
                              href={`tel:${entry.customer_phone}`}
                              className="font-mono text-xs text-slate-400 hover:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>📞</span> {entry.customer_phone}
                            </a>
                          ) : (
                            <span className="text-slate-500 text-xs">No phone</span>
                          )}
                        </div>

                        {/* Time & State Pills */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/5 text-[11px] text-slate-400 font-medium">
                            <span>⏳</span> Waited {waitMins}m
                          </span>

                          {isCalled && entry.called_at && (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${(() => {
                                const age = Date.now() - new Date(entry.called_at).getTime();
                                const timeoutMs = (restaurant.call_timeout_minutes || 15) * 60 * 1000;
                                const remaining = timeoutMs - age;
                                if (remaining <= 0) return 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse';
                                if (remaining <= 2 * 60 * 1000)
                                  return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
                                return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
                              })()}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                              {(() => {
                                const ageMins = Math.floor((Date.now() - new Date(entry.called_at).getTime()) / 60000);
                                const remaining = (restaurant.call_timeout_minutes || 15) - ageMins;
                                if (remaining <= 0) return `Overdue by ${Math.abs(remaining)}m`;
                                if (remaining <= 2) return `Timeout in ${remaining}m!`;
                                return `Called ${ageMins}m ago (${remaining}m left)`;
                              })()}
                            </span>
                          )}

                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-widest font-black shrink-0 ${cardTheme.badge}`}
                          >
                            {entry.status}
                          </span>

                          {entry.status === 'NO_SHOW' && (entry as unknown as { no_show_reason?: string }).no_show_reason && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
                              {(entry as unknown as { no_show_reason: string }).no_show_reason}
                            </span>
                          )}
                        </div>

                        {/* Customer Late Alert Banner */}
                        {anyEntry.lateInfo?.isLate && (
                          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                            <span className="material-symbols-outlined text-[15px] text-amber-400">schedule</span>
                            <span className="font-bold">Running Late (+{anyEntry.lateInfo.delayMinutes || 10}m)</span>
                            {anyEntry.lateInfo.note && (
                              <span className="text-[11px] text-amber-200/90 truncate">
                                · &ldquo;{anyEntry.lateInfo.note}&rdquo;
                              </span>
                            )}
                            {anyEntry.lateInfo.tablePassedToNext && (
                              <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40 shrink-0">
                                Table Passed · Spot Held
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Highlight on Right */}
                    <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0">
                      {isNotified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] tracking-widest uppercase font-black shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          NOTIFIED
                        </span>
                      )}
                      {isCalled && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] tracking-widest uppercase font-black shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                          CALLED · READY
                        </span>
                      )}
                      {isWaiting && (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] tracking-widest uppercase font-bold border ${
                            isNext
                              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-black'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          {isNext ? '⚡ NEXT TO CALL' : 'WAITING'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION RIBBON: High-Visibility, Tactile Staff Action Bar */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl bg-[#080D1A]/60">
                    {(isCalled || hasPreOrder || anyEntry.notes) && (
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        {isCalled && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ready to be seated
                          </span>
                        )}
                        {hasPreOrder && (
                          <span className="text-amber-300 font-semibold flex items-center gap-1">
                            <span>🍽️</span> Dishes Pre-Ordered
                          </span>
                        )}
                        {anyEntry.notes && (
                          <span className="text-slate-400 truncate">Note: {anyEntry.notes}</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2 w-full items-center">
                      {/* Step 1: WAITING -> Notify */}
                      {isWaiting && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)} className="col-span-2 sm:col-span-1">
                          <button
                            type="submit"
                            className="w-full sm:w-auto px-5 h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-95 text-white text-sm font-black shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>🔔</span>
                            <span>Notify Guest</span>
                          </button>
                        </form>
                      )}
                      
                      {/* Step 2: NOTIFIED -> Call */}
                      {isNotified && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)} className="col-span-2 sm:col-span-1">
                          <button
                            type="submit"
                            className="w-full sm:w-auto px-5 h-11 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:brightness-110 active:scale-95 text-white text-sm font-black shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>📢</span>
                            <span>Call — Table Ready</span>
                          </button>
                        </form>
                      )}

                      {/* Step 3: CALLED -> Seat with AI recommendations & multi-table combine */}
                      {isCalled && (
                        <div className="col-span-2 sm:col-span-1">
                          <SeatCustomerModal
                            entryId={entry.id}
                            customerName={entry.customer_name}
                            displayNumber={entry.display_number}
                            partySize={entry.party_size}
                            userId={userId}
                            seatableTables={seatableTables}
                            allAvailableTables={(tablesRes.tables as Array<{ id: string; table_number: string; capacity: number; status: string }> || []).filter((t) => t.status === 'AVAILABLE')}
                          />
                        </div>
                      )}

                      {/* Step 3: CALLED -> No-Show */}
                      {isCalled && (
                        <form action={markNoShowAction} className="col-span-2 sm:col-span-1 flex gap-1 items-center">
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="actorUserId" value={userId} />
                          <select
                            name="reason"
                            defaultValue="STAFF_MARKED_NO_SHOW"
                            className="flex-1 min-w-0 h-11 rounded-xl bg-[#1A2333] border border-white/10 text-slate-200 text-xs font-bold px-2"
                          >
                            <option value="STAFF_MARKED_NO_SHOW">Staff marked</option>
                            <option value="CUSTOMER_DID_NOT_RETURN">Did not return</option>
                            <option value="CUSTOMER_DID_NOT_RESPOND">No response</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <ConfirmSubmitButton
                            idleLabel="No-Show"
                            armedLabel="Sure?"
                            className="shrink-0 px-3 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
                          />
                        </form>
                      )}

                      {/* Cancel Entry Button */}
                      {(isWaiting || isNotified || isCalled) && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'CANCELLED', userId)} className="shrink-0 flex items-center">
                          <button
                            type="submit"
                            title="Cancel Entry"
                            className="h-11 w-11 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT DISPATCH & SMART TABLE ASSIGNMENT PANEL (4 Columns) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md mt-2">
          {/* Active Callout Module (Sticky Staff Assistant) */}
          <div className="p-space-lg rounded-2xl bg-[#111827] border border-white/5 shadow-md flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[22px]">smart_toy</span>
                <h3 className="text-lg font-bold text-white">Smart Assignment</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-widest border border-blue-500/20">Auto-Optimized</span>
            </div>
            
            {nextUp ? (
              <>
                {/* Target Guest Preview */}
                <div className="p-space-md rounded-xl bg-[#0A0E17] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                      {nextUp.display_number || nextUp.queue_number}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{nextUp.customer_name}</span>
                      <span className="text-sm text-slate-400">{nextUp.party_size} Guests • Waiting</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
                </div>
                
                {/* Recommended Tables */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Best Matching Tables</span>
                  {bestMatchTable ? (
                    <div className="p-space-md rounded-xl bg-blue-900/20 hover:bg-blue-900/30 border border-blue-500/30 transition-colors cursor-pointer flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">Table {bestMatchTable.tableNumber}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] uppercase font-bold tracking-widest">Available Now</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Perfect Match</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-space-md rounded-xl bg-slate-800/50 text-slate-400 text-sm flex items-center justify-center border border-white/5">
                      No exact match table available right now.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <form action={updateQueueStatusAction.bind(null, nextUp.id, 'NOTIFIED', userId)}>
                    <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                      <span>Notify Next — Almost Ready</span>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="p-space-md text-center text-slate-400 bg-[#0A0E17] border border-white/5 rounded-xl text-sm">
                No waiting guests at the moment.
              </div>
            )}
          </div>

          {/* Floor Capacity & Snapshot Card */}
          <div className="p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">Floor Saturation</span>
              <span className="text-sm font-bold text-blue-400">{Math.round(occupiedPct)}% Full</span>
            </div>
            
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="bg-blue-500 h-full" style={{ width: `${occupiedPct}%` }} title={`Occupied: ${tablesOccupied}`}></div>
              <div className="bg-rose-500 h-full" style={{ width: `${cleaningPct}%` }} title={`Cleaning: ${tablesCleaning}`}></div>
              <div className="bg-amber-500 h-full" style={{ width: `${reservedPct}%` }} title={`Reserved: ${tablesReserved}`}></div>
              <div className="bg-slate-600 h-full" style={{ width: `${readyPct}%` }} title={`Open: ${tablesReady}`}></div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                <span className="text-slate-400">Occupied: {tablesOccupied}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-600"></span>
                <span className="text-slate-400">Open Now: {tablesReady}</span>
              </div>
            </div>

            <div className="relative mt-2 rounded-xl overflow-hidden h-20 bg-gradient-to-br from-[#1A2333] to-[#0A0E17] border border-white/5 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                <span className="text-sm font-bold text-white">{restaurant.name}</span>
                <span className="text-xs bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">{tablesReady} ready</span>
              </div>
            </div>
          </div>
          
          {/* Legacy Configuration Cards - Moved Below */}
          <div className="mt-8 border-t border-white/10 pt-8">
            <h2 className="text-xl font-bold text-white mb-4">Queue Configuration</h2>
            <div className="bg-[#111827] border border-white/5 rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Queue Limits</h3>
                <p className="text-sm text-slate-400 mt-1">Configure party boundaries & max capacity.</p>
              </div>

              <form action={updateQueueSettingsFormAction} className="flex flex-col gap-4">
                <input type="hidden" name="restaurantId" value={restaurant.id} />
                <input type="hidden" name="actorUserId" value={userId} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Max Capacity</label>
                    <input type="number" name="maxQueueCapacity" defaultValue={restaurant.max_queue_capacity ?? 100} min={1} max={1000} required className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Call Timeout</label>
                    <input type="number" name="callTimeoutMinutes" defaultValue={restaurant.call_timeout_minutes ?? 15} min={1} max={120} required className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                    Save Limits
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-[#111827] border border-white/5 rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md">
              <div>
                <h3 className="text-lg font-bold text-white">ETA Settings</h3>
                <p className="text-sm text-slate-400 mt-1">Configure wait estimation formulas.</p>
              </div>

              <form action={updateETASettingsFormAction} className="flex flex-col gap-4">
                <input type="hidden" name="restaurantId" value={restaurant.id} />
                <input type="hidden" name="actorUserId" value={userId} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Avg Service</label>
                    <input type="number" name="avgServiceTimeMins" defaultValue={restaurant.avg_service_time_mins ?? 15} min={1} max={180} required className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Capacity Units</label>
                    <input type="number" name="serviceCapacityUnits" defaultValue={restaurant.service_capacity_units ?? 3} min={1} max={50} required className="w-full bg-[#0A0E17] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                    Save ETA Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* Keyboard Shortcut Listener Script */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('keydown', (e) => {
          if ((e.code === 'Space' || e.code === 'Enter') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            const heroBtn = document.getElementById('call-next-hero-btn');
            if (heroBtn) {
              e.preventDefault();
              heroBtn.click();
              heroBtn.classList.add('scale-95', 'ring-4', 'ring-primary/20');
              setTimeout(() => heroBtn.classList.remove('scale-95', 'ring-4', 'ring-primary/20'), 150);
            }
          }
        });
      `}} />
    </div>
  );
}
