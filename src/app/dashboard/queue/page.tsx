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
    return <div className="p-8 text-rose-400">No managed restaurant assigned.</div>;
  }

  const entries = await QueueService.getAllQueueEntries(restaurant.id, statusFilter, searchTerm);
  const activeEntries = await QueueService.getActiveQueue(restaurant.id);

  const waitingCount = activeEntries.filter((e) => e.status === 'WAITING').length;
  const calledCount = activeEntries.filter((e) => e.status === 'CALLED' || e.status === 'NOTIFIED').length;
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Status Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Queue Operations & Seating</h1>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                queueEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {queueEnabled ? 'QUEUE OPEN' : 'QUEUE CLOSED'}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Manage live waiting line, call customers, estimate wait times, and seat parties at available tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <form action={toggleQueueOpenAction.bind(null, restaurant.id, !queueEnabled, userId)}>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors shadow-lg ${
                queueEnabled
                  ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold'
              }`}
            >
              {queueEnabled ? 'Close Queue' : 'Open Queue'}
            </button>
          </form>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Active Waiting
            </span>
            <div className="text-3xl font-extrabold text-white mt-1">{waitingCount}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
            ⏳
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Called / Notified
            </span>
            <div className="text-3xl font-extrabold text-blue-400 mt-1">{calledCount}</div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xl">
            📢
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Queue Capacity
            </span>
            <div className="text-3xl font-extrabold text-slate-200 mt-1">
              {waitingCount + calledCount} / {restaurant.max_queue_capacity ?? 100}
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xl">
            📊
          </div>
        </div>
      </div>

      {/* Queue Filter Bar & Search Input */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { label: 'Active Queue', value: 'ACTIVE' },
            { label: 'Waiting', value: 'WAITING' },
            { label: 'Notified', value: 'NOTIFIED' },
            { label: 'Called', value: 'CALLED' },
            { label: 'Seated', value: 'SEATED' },
            { label: 'Terminal / History', value: 'TERMINAL' },
            { label: 'All Entries', value: 'ALL' },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/dashboard/queue?status=${tab.value}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}`}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Search Bar */}
        <form method="GET" action="/dashboard/queue" className="w-full sm:w-auto">
          <input type="hidden" name="status" value={statusFilter} />
          <input
            type="text"
            name="search"
            defaultValue={searchTerm}
            placeholder="Search Q-#, name, phone..."
            className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </form>
      </div>

      {/* Queue Entries Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <h2 className="font-bold text-white text-base">Queue Entries ({entries.length})</h2>
        </div>

        {entries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No queue entries found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4"># / Display</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Party Size</th>
                  <th className="py-3.5 px-4">Joined At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {entries.map((entry) => {
                  const isWaiting = entry.status === 'WAITING';
                  const isNotified = entry.status === 'NOTIFIED';
                  const isCalled = entry.status === 'CALLED';
                  const isSeated = entry.status === 'SEATED';
                  const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(entry.status);

                  const seatableTables = seatableTablesMap.get(entry.party_size) || [];

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        {entry.display_number || `Q-${entry.queue_number}`}
                      </td>
                      <td className="py-4 px-4 font-medium text-white">
                        {entry.customer_name}
                        {entry.customer_phone && (
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {entry.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          👥 {entry.party_size} {entry.party_size === 1 ? 'person' : 'people'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs font-mono">
                        {new Date(entry.joined_at || entry.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isWaiting
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : isNotified
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                              : isCalled
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : isSeated
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isWaiting && (
                            <>
                              <form action={updateQueueStatusAction.bind(null, entry.id, 'NOTIFIED', userId)}>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                                >
                                  Notify
                                </button>
                              </form>
                              <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                  Call
                                </button>
                              </form>
                            </>
                          )}

                          {isNotified && (
                            <form action={updateQueueStatusAction.bind(null, entry.id, 'CALLED', userId)}>
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                              >
                                Call Party
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
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                No-Show
                              </button>
                            </form>
                          )}

                          {!isTerminal && (
                            <form action={updateQueueStatusAction.bind(null, entry.id, 'CANCELLED', userId)}>
                              <button
                                type="submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Configuration Cards: Queue Operating & ETA Engine Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Queue Settings Form */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Queue Operating Limits</h3>
            <p className="text-xs text-slate-400">Configure party boundaries & max queue capacity.</p>
          </div>

          <form action={updateQueueSettingsFormAction} className="space-y-4">
            <input type="hidden" name="restaurantId" value={restaurant.id} />
            <input type="hidden" name="actorUserId" value={userId} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Max Queue Capacity
                </label>
                <input
                  type="number"
                  name="maxQueueCapacity"
                  defaultValue={restaurant.max_queue_capacity ?? 100}
                  min={1}
                  max={1000}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Call Timeout (mins)
                </label>
                <input
                  type="number"
                  name="callTimeoutMinutes"
                  defaultValue={restaurant.call_timeout_minutes ?? 15}
                  min={1}
                  max={120}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Min Party Size
                </label>
                <input
                  type="number"
                  name="minPartySize"
                  defaultValue={restaurant.min_party_size ?? 1}
                  min={1}
                  max={20}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Max Party Size
                </label>
                <input
                  type="number"
                  name="maxPartySize"
                  defaultValue={restaurant.max_party_size ?? 20}
                  min={1}
                  max={50}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors border border-slate-700"
              >
                Save Queue Limits
              </button>
            </div>
          </form>
        </div>

        {/* ETA Engine Configuration Form */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">ETA Engine Parameters</h3>
            <p className="text-xs text-slate-400">Configure deterministic formulas for customer wait estimates.</p>
          </div>

          <form action={updateETASettingsFormAction} className="space-y-4">
            <input type="hidden" name="restaurantId" value={restaurant.id} />
            <input type="hidden" name="actorUserId" value={userId} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Avg Service Time (mins)
                </label>
                <input
                  type="number"
                  name="avgServiceTimeMins"
                  defaultValue={restaurant.avg_service_time_mins ?? 15}
                  min={1}
                  max={180}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Service Capacity Units
                </label>
                <input
                  type="number"
                  name="serviceCapacityUnits"
                  defaultValue={restaurant.service_capacity_units ?? 3}
                  min={1}
                  max={50}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  ETA Safety Buffer (mins)
                </label>
                <input
                  type="number"
                  name="etaBufferMins"
                  defaultValue={restaurant.eta_buffer_mins ?? 5}
                  min={0}
                  max={60}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Almost Up Threshold (Parties)
                </label>
                <input
                  type="number"
                  name="almostYourTurnThreshold"
                  defaultValue={restaurant.almost_your_turn_threshold ?? 3}
                  min={1}
                  max={20}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Save ETA Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
