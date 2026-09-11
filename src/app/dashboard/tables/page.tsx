import React from 'react';
import Link from 'next/link';
import { TableService, VALID_TABLE_TRANSITIONS } from '@/lib/services/table-service';
import { ZoneService } from '@/lib/services/zone-service';
import {
  createTableFormAction,
  bulkCreateTableFormAction,
  updateTableStatusAction,
  archiveTableAction,
} from '../actions';
import { can } from '@/lib/auth/ui-permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { TableStatus } from '@/types/database.types';

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; zoneId?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const zoneId = params.zoneId || '';
  const status = (params.status || '') as TableStatus | '';

  const { tables, stats, totalPages } = await TableService.listTables({
    page,
    limit: 50,
    search,
    zoneId: zoneId || undefined,
    status: status || undefined,
  });

  const { zones } = await ZoneService.listZones({ status: 'ACTIVE' });

  const canCreate = await can(PERMISSIONS.TABLES_CREATE);
  const canUpdate = await can(PERMISSIONS.TABLES_UPDATE);
  const canManageStatus = await can(PERMISSIONS.TABLES_MANAGE_STATUS);
  const canDelete = await can(PERMISSIONS.TABLES_DELETE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Table Management</h1>
          <p className="text-sm text-slate-400">Physical dining room layout, table capacities, and live table readiness</p>
        </div>
        <Link
          href="/dashboard/zones"
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
        >
          Manage Zones &rarr;
        </Link>
      </div>

      {/* Overview Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <div className="text-2xl font-extrabold text-white">{stats.total}</div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Tables</div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-400">{stats.available}</div>
          <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mt-1">Available</div>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center">
          <div className="text-2xl font-extrabold text-blue-400">{stats.occupied}</div>
          <div className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-wider mt-1">Occupied</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
          <div className="text-2xl font-extrabold text-amber-400">{stats.cleaning}</div>
          <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mt-1">Cleaning</div>
        </div>
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 text-center">
          <div className="text-2xl font-extrabold text-purple-400">{stats.reserved}</div>
          <div className="text-[11px] font-semibold text-purple-400/80 uppercase tracking-wider mt-1">Reserved</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center">
          <div className="text-2xl font-extrabold text-slate-400">{stats.outOfService}</div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Out of Service</div>
        </div>
      </div>

      {/* Creation Sections for Admin */}
      {canCreate && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Single Table Creation */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Add Single Table</h3>
            <form action={createTableFormAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Table Number *</label>
                <input
                  type="text"
                  name="tableNumber"
                  required
                  placeholder="e.g. T-12"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Capacity *</label>
                <input
                  type="number"
                  name="capacity"
                  required
                  min="1"
                  max="50"
                  defaultValue="4"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Zone</label>
                <select
                  name="zoneId"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {zones.map((z: { id: string; name: string }) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
                >
                  + Add Table
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Table Setup */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Bulk Table Setup (Batch Limit: 100)</h3>
            <form action={bulkCreateTableFormAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400">Target Zone *</label>
                <select
                  name="zoneId"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {zones.map((z: { id: string; name: string }) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Prefix</label>
                <input
                  type="text"
                  name="prefix"
                  placeholder="T-"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Start #</label>
                <input
                  type="number"
                  name="startNumber"
                  defaultValue="1"
                  min="1"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Count (Max 100)</label>
                <input
                  type="number"
                  name="count"
                  defaultValue="10"
                  min="1"
                  max="100"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  defaultValue="4"
                  min="1"
                  max="50"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2 sm:col-span-4">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500"
                >
                  ⚡ Run Bulk Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search table number..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none sm:w-64"
        />

        <select
          name="zoneId"
          defaultValue={zoneId}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none sm:w-48"
        >
          <option value="">All Zones</option>
          {zones.map((z: { id: string; name: string }) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="OCCUPIED">OCCUPIED</option>
          <option value="CLEANING">CLEANING</option>
          <option value="RESERVED">RESERVED</option>
          <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
        </select>

        <button
          type="submit"
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          Filter
        </button>
      </form>

      {/* Table Cards Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        {tables.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No active tables found matching the current search filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {tables.map((table: { id: string; tableNumber: string; capacity: number; zoneName: string; status: TableStatus }) => {
              const allowedTransitions = VALID_TABLE_TRANSITIONS[table.status as TableStatus] || [];

              const statusColor =
                table.status === 'AVAILABLE'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : table.status === 'OCCUPIED'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                  : table.status === 'CLEANING'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : table.status === 'RESERVED'
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-400'
                  : 'border-slate-700 bg-slate-800/40 text-slate-400';

              return (
                <div
                  key={table.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-lg">{table.tableNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusColor}`}>
                        {table.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                        Cap: {table.capacity}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">{table.zoneName}</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-slate-900 space-y-2">
                    {/* Status Transitions */}
                    {canManageStatus && allowedTransitions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {allowedTransitions.map((target: TableStatus) => {
                          const transitionAction = updateTableStatusAction.bind(null, table.id, target, table.status);
                          const btnColor =
                            target === 'AVAILABLE'
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : target === 'OCCUPIED'
                              ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                              : target === 'CLEANING'
                              ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : target === 'RESERVED'
                              ? 'border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                              : 'border-slate-700 text-slate-400 hover:bg-slate-800';

                          return (
                            <form key={target} action={transitionAction} className="inline-block">
                              <button
                                type="submit"
                                className={`rounded border bg-slate-900 px-2 py-0.5 text-[10px] font-semibold transition-colors ${btnColor}`}
                              >
                                &rarr; {target}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    )}

                    {/* Archive Table */}
                    {(canDelete || canUpdate) && (
                      <div className="text-right pt-1">
                        <form action={archiveTableAction.bind(null, table.id)} className="inline-block">
                          <button
                            type="submit"
                            className="text-[10px] font-semibold text-red-400/80 hover:text-red-400 hover:underline"
                          >
                            Archive Table
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/tables?page=${page - 1}&search=${encodeURIComponent(search)}&zoneId=${zoneId}&status=${status}`}
                  className="rounded border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300 hover:bg-slate-800"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/dashboard/tables?page=${page + 1}&search=${encodeURIComponent(search)}&search=${encodeURIComponent(search)}&zoneId=${zoneId}&status=${status}`}
                  className="rounded border border-slate-800 bg-slate-900 px-3 py-1 text-slate-300 hover:bg-slate-800"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
