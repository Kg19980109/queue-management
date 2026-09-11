import React from 'react';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { QueueService } from '@/lib/services/queue-service';
import {
  updateQueueStatusAction,
  toggleQueueOpenAction,
  updateQueueSettingsFormAction,
  updateETASettingsFormAction,
} from '@/app/dashboard/actions';
import { SeatCustomerModal, SeatableTableItem } from '@/components/dashboard/SeatCustomerModal';
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

  const entries = await QueueService.getAllQueueEntries(restaurant.id, statusFilter, searchTerm);
  const activeEntries = await QueueService.getActiveQueue(restaurant.id);

  const waitingCount = activeEntries.filter((e) => e.status === 'WAITING').length;
  const calledCount = activeEntries.filter((e) => e.status === 'CALLED' || e.status === 'NOTIFIED').length;
  const totalGuests = activeEntries.reduce((sum, e) => sum + e.party_size, 0);
  const queueEnabled = restaurant.queue_enabled ?? true;

  // Pre-fetch seatable tables grouped by party size
  const uniquePartySizes = Array.from(new Set(entries.map((e) => e.party_size)));
  const seatableTablesMap = new Map<number, SeatableTableItem[]>();

  await Promise.all(
    uniquePartySizes.map(async (size) => {
      const tables = await QueueService.getSeatableTables(restaurant.id, size);
      seatableTablesMap.set(size, tables as SeatableTableItem[]);
    })
  );

  return (
    <div className="flex flex-col w-full px-space-xl py-space-lg gap-space-lg">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Live Queue Management</h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${queueEnabled ? 'bg-tertiary-container/15 text-tertiary' : 'bg-error-container/15 text-error'}`}>
              <span className={`w-2 h-2 rounded-full ${queueEnabled ? 'bg-tertiary animate-ping' : 'bg-error'}`}></span>
              <span className="font-label-md text-label-md tracking-wider uppercase font-bold">
                {queueEnabled ? `Queue Active • ${activeEntries.length} Groups • ${totalGuests} Guests` : 'Queue Closed'}
              </span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Real-time floor flow, dining pacing engine, and instantaneous guest dispatch.</p>
        </div>
        
        {/* Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <form action={toggleQueueOpenAction.bind(null, restaurant.id, !queueEnabled, userId)}>
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl shadow-sm font-headline-sm text-body-sm transition-colors cursor-pointer ${
                queueEnabled
                  ? 'bg-surface-container-lowest hover:bg-surface-container-high text-on-surface'
                  : 'bg-tertiary text-on-tertiary hover:bg-tertiary-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {queueEnabled ? 'pause_circle' : 'play_circle'}
              </span>
              <span>{queueEnabled ? 'Pause Queue' : 'Open Queue'}</span>
            </button>
          </form>
          <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high text-on-surface shadow-sm font-headline-sm text-body-sm transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[18px] text-primary">person_add</span>
            <span>Manual Add (+)</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Dynamic Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md">
        {/* Metric 1 */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">Total Waiting</span>
            <span className="material-symbols-outlined text-primary text-[20px]">groups</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface">{waitingCount}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">groups</span>
          </div>
        </div>
        
        {/* Metric 2 */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">Currently Called</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">contactless</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-secondary">{calledCount}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">paged to stand</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">Queue Capacity</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">timer</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface">{activeEntries.length}</span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-bold">/ {restaurant.max_queue_capacity ?? 100}</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant tracking-wider font-semibold">Avg Wait Time</span>
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">schedule</span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg text-on-surface">~22<span className="font-body-md text-body-md text-on-surface-variant font-normal">m</span></span>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-bold">Healthy</span>
          </div>
        </div>
      </div>

      {/* Search, Filter Badges, and Views Splitter */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md p-space-sm rounded-2xl bg-surface-container-lowest shadow-sm">
        {/* Filter Chips & Search Bar */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <form method="GET" action="/dashboard/queue" className="relative min-w-[280px] flex-1 max-w-md">
            <input type="hidden" name="status" value={statusFilter} />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input 
              name="search"
              defaultValue={searchTerm}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all" 
              placeholder="Search guest name, phone, or ticket #..." 
              type="text"
            />
          </form>
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {[
              { label: 'Active Queue', value: 'ACTIVE' },
              { label: 'Waiting', value: 'WAITING' },
              { label: 'Called', value: 'CALLED' },
              { label: 'Terminal / History', value: 'TERMINAL' },
              { label: 'All', value: 'ALL' },
            ].map((tab) => (
              <Link
                key={tab.value}
                href={`/dashboard/queue?status=${tab.value}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`}
                className={`px-3 py-1.5 rounded-lg font-headline-sm text-body-sm transition-colors whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workstation Layout: Queue Feed & Forms */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        
        {/* Queue Feed Stream (8 Columns) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {entries.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
              No queue entries found matching your filter criteria.
            </div>
          ) : (
            entries.map((entry) => {
              const isWaiting = entry.status === 'WAITING';
              const isNotified = entry.status === 'NOTIFIED';
              const isCalled = entry.status === 'CALLED';
              const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(entry.status);

              const seatableTables = seatableTablesMap.get(entry.party_size) || [];

              return (
                <div key={entry.id} className="relative p-space-md rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col gap-3 overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isCalled ? 'bg-primary' : isNotified ? 'bg-secondary' : isWaiting ? 'bg-tertiary' : 'bg-outline-variant'
                  }`}></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pl-2">
                    <div className="flex items-start md:items-center gap-4">
                      {/* Ticket Monospace Display */}
                      <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl flex-shrink-0 shadow-sm ${
                        isCalled ? 'bg-primary text-on-primary' : isNotified ? 'bg-secondary text-on-secondary' : isWaiting ? 'bg-surface-container text-on-surface' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        <span className={`font-ticket-display text-ticket-display tracking-tight ${isWaiting ? 'text-tertiary' : ''}`}>
                          {entry.display_number || `Q-${entry.queue_number}`}
                        </span>
                        {isCalled && <span className="font-label-sm text-[9px] uppercase tracking-widest text-on-primary-container font-bold">Called</span>}
                        {isWaiting && <span className="font-label-sm text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Waiting</span>}
                      </div>

                      {/* Guest Profile & Metadata */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{entry.customer_name}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">• {entry.customer_phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap font-body-sm text-body-sm text-on-surface-variant">
                          <span className="flex items-center gap-1 font-semibold text-on-surface">
                            <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                            {entry.party_size} Guests
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            Joined {new Date(entry.joined_at || entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold">
                            Status: {entry.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 shrink-0">
                      {isWaiting && (
                        <>
                          <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)}>
                            <button type="submit" className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary-container hover:text-on-secondary-container text-on-secondary font-headline-sm text-body-sm font-bold shadow-sm flex items-center gap-1 transition-all">
                              <span className="material-symbols-outlined text-[18px]">notifications</span>
                              <span>Notify</span>
                            </button>
                          </form>
                          <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}>
                            <button type="submit" className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary font-headline-sm text-body-sm font-bold shadow-sm flex items-center gap-1 transition-all">
                              <span className="material-symbols-outlined text-[18px]">campaign</span>
                              <span>Call</span>
                            </button>
                          </form>
                        </>
                      )}

                      {isNotified && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}>
                          <button type="submit" className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary font-headline-sm text-body-sm font-bold shadow-sm flex items-center gap-1 transition-all">
                            <span className="material-symbols-outlined text-[18px]">campaign</span>
                            <span>Call Party</span>
                          </button>
                        </form>
                      )}

                      {!isTerminal && (
                        <SeatCustomerModal
                          entryId={entry.id}
                          customerName={entry.customer_name}
                          displayNumber={entry.display_number}
                          partySize={entry.party_size}
                          userId={userId}
                          seatableTables={seatableTables}
                        />
                      )}

                      {isCalled && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'NO_SHOW', userId)}>
                          <button type="submit" className="px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-error-container text-error font-headline-sm text-body-sm transition-colors shadow-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">person_off</span>
                            <span>No-Show</span>
                          </button>
                        </form>
                      )}

                      {!isTerminal && (
                        <form action={updateQueueStatusAction.bind(null, entry.id, 'CANCELLED', userId)}>
                          <button type="submit" className="px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-headline-sm text-body-sm transition-colors shadow-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            <span>Cancel</span>
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

        {/* Configuration Cards (4 Columns) */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Queue Limits</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Configure party boundaries & max capacity.</p>
            </div>

            <form action={updateQueueSettingsFormAction} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <input type="hidden" name="actorUserId" value={userId} />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Max Capacity</label>
                  <input type="number" name="maxQueueCapacity" defaultValue={restaurant.max_queue_capacity ?? 100} min={1} max={1000} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Call Timeout</label>
                  <input type="number" name="callTimeoutMinutes" defaultValue={restaurant.call_timeout_minutes ?? 15} min={1} max={120} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Min Party</label>
                  <input type="number" name="minPartySize" defaultValue={restaurant.min_party_size ?? 1} min={1} max={20} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Max Party</label>
                  <input type="number" name="maxPartySize" defaultValue={restaurant.max_party_size ?? 20} min={1} max={50} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button type="submit" className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-body-sm font-semibold rounded-lg transition-colors shadow-sm">
                  Save Limits
                </button>
              </div>
            </form>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">ETA Settings</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Configure wait estimation formulas.</p>
            </div>

            <form action={updateETASettingsFormAction} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={restaurant.id} />
              <input type="hidden" name="actorUserId" value={userId} />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Avg Service</label>
                  <input type="number" name="avgServiceTimeMins" defaultValue={restaurant.avg_service_time_mins ?? 15} min={1} max={180} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Capacity Units</label>
                  <input type="number" name="serviceCapacityUnits" defaultValue={restaurant.service_capacity_units ?? 3} min={1} max={50} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">ETA Buffer (m)</label>
                  <input type="number" name="etaBufferMins" defaultValue={restaurant.eta_buffer_mins ?? 5} min={0} max={60} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Up Threshold</label>
                  <input type="number" name="almostYourTurnThreshold" defaultValue={restaurant.almost_your_turn_threshold ?? 3} min={1} max={20} required className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-on-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button type="submit" className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline-sm text-body-sm font-semibold rounded-lg transition-colors shadow-sm">
                  Save ETA Settings
                </button>
              </div>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
