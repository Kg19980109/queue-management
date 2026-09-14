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
  updateQueueSettingsFormAction,
  updateETASettingsFormAction,
} from '@/app/dashboard/actions';
import { SeatCustomerModal, SeatableTableItem } from '@/components/dashboard/SeatCustomerModal';
import { AddQueueGuestModal } from '@/components/dashboard/AddQueueGuestModal';
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
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();

  if (!restaurant) {
    return <div className="p-space-xl text-error">No managed restaurant assigned.</div>;
  }

  // Parallelize independent fetches for snappy load
  const [entries, activeEntries, tablesRes] = await Promise.all([
    QueueService.getAllQueueEntries(restaurant.id, statusFilter, searchTerm),
    QueueService.getActiveQueue(restaurant.id),
    TableService.listTables({ restaurantId: restaurant.id }),
  ]);

  const waitingEntries = activeEntries.filter((e) => e.status === 'WAITING');
  const calledEntries = activeEntries.filter((e) => e.status === 'CALLED' || e.status === 'NOTIFIED');
  const waitingCount = waitingEntries.length;
  const calledCount = calledEntries.length;
  const totalGuests = activeEntries.reduce((sum, e) => sum + e.party_size, 0);
  const queueEnabled = restaurant.queue_enabled ?? true;

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
            <form action={updateQueueStatusAction.bind(null, nextUp.id, 'CALLED', userId)} className="flex-1 sm:flex-none">
              <button type="submit" className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95 border border-blue-500" id="call-next-hero-btn">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
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
            <span className="text-xs text-slate-400">groups</span>
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
            { label: `All (${entries.length})`, value: 'ALL' },
            { label: `Waiting ${waitingCount}`, value: 'WAITING' },
            { label: `Called ${calledCount}`, value: 'CALLED' },
            { label: 'History', value: 'TERMINAL' },
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

              return (
                <div key={entry.id} className="relative p-space-md rounded-2xl bg-[#111827] border border-white/5 shadow-md flex flex-col gap-3 overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isSeated ? 'bg-emerald-500' : isNotified ? 'bg-purple-500' : isCalled ? 'bg-blue-500' : hasPreOrder ? 'bg-amber-500' : isNext ? 'bg-blue-400' : 'bg-slate-600'
                  }`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Ticket Monospace Display */}
                      <div className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 shadow-sm ${
                        isSeated ? 'bg-emerald-600 text-white' : isNotified ? 'bg-purple-600 text-white' : isCalled ? 'bg-blue-600 text-white' : isNext ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20' : 'bg-[#1A2333] border border-white/5 text-slate-300'
                      }`}>
                        <span className="font-black text-xl sm:text-2xl tracking-tight font-headline-xl leading-none">
                          {entry.display_number || entry.queue_number}
                        </span>
                        {isSeated && <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Dining</span>}
                        {isNotified && <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Arriving</span>}
                        {isCalled && <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Priority</span>}
                        {isNext && <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Next</span>}
                        {isWaiting && !isNext && <span className="text-[8px] uppercase tracking-widest mt-0.5">#{index + 1}</span>}
                      </div>

                      {/* Guest Profile & Metadata */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[17px] sm:text-xl font-bold text-white truncate">{entry.customer_name}</span>
                          {isVIP && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/30 shrink-0">
                              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                              VIP
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] sm:text-sm text-slate-400 truncate">{entry.customer_phone || 'No phone'} • {entry.party_size} guests {isLargeGroup ? '• Large group' : ''}</span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {new Date(entry.joined_at || entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-widest font-bold shrink-0 ${isSeated ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400' : isNotified ? 'bg-purple-900/30 border-purple-500/30 text-purple-400' : isCalled ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Indicator Pill / Actions Right */}
                    <div className="flex items-center md:flex-col md:items-end justify-between">
                      {isSeated && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-[10px] tracking-widest uppercase font-bold">
                          SEATED
                        </span>
                      )}
                      {isNotified && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-400 text-[10px] tracking-widest uppercase font-bold">
                          NOTIFIED
                        </span>
                      )}
                      {isCalled && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-[10px] tracking-widest uppercase font-bold">
                          CALLED
                        </span>
                      )}
                      {isWaiting && !isCalled && !isNotified && !isSeated && (
                         <span className={`inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] tracking-widest uppercase font-bold border ${isNext ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' : 'bg-transparent border-white/10 text-slate-400'}`}>
                         WAITING
                       </span>
                      )}
                    </div>
                  </div>

                  {/* Action Ribbon per entry - thumb-friendly */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-white/5 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl bg-[#0A0E17]/40">
                    {(isCalled || hasPreOrder || anyEntry.notes) && (
                      <div className="flex items-center gap-2 text-xs">
                        {isCalled && <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ready to be seated</span>}
                        {hasPreOrder && <span className="text-slate-400">Dishes ready</span>}
                        {anyEntry.notes && <span className="text-slate-400 truncate">{anyEntry.notes}</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2 w-full">
                      {isWaiting && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)} className="col-span-2 sm:col-span-1">
                          <button type="submit" className="w-full sm:w-auto px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold shadow-md transition-all active:scale-95">
                            Inform Guest
                          </button>
                        </form>
                      )}
                      
                      {isCalled && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)} className="col-span-2 sm:col-span-1">
                          <button type="submit" className="w-full sm:w-auto px-5 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-sm font-bold shadow-md transition-all active:scale-95">
                            Tell to Come
                          </button>
                        </form>
                      )}

                      {isNotified && (
                        <div className="col-span-2 sm:col-span-1">
                          <SeatCustomerModal
                            entryId={entry.id}
                            customerName={entry.customer_name}
                            displayNumber={entry.display_number}
                            partySize={entry.party_size}
                            userId={userId}
                            seatableTables={seatableTables}
                          />
                        </div>
                      )}
                      
                      {isSeated && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'COMPLETED', userId)} className="col-span-2 sm:col-span-1">
                          <button type="submit" className="w-full sm:w-auto px-5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md active:scale-95">
                            Mark Done
                          </button>
                        </form>
                      )}

                      {(isCalled || isNotified) && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'NO_SHOW', userId)} className="col-span-2 sm:col-span-1">
                          <button type="submit" className="w-full sm:w-auto px-4 h-11 rounded-xl bg-transparent active:bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center justify-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">person_off</span>
                            <span>No-Show</span>
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
                  <form action={updateQueueStatusAction.bind(null, nextUp.id, 'CALLED', userId)}>
                    <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">campaign</span>
                      <span>Notify {bestMatchTable ? `& Prep Table ${bestMatchTable.tableNumber}` : 'Guest'}</span>
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
