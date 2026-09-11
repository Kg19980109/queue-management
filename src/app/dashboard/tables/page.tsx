import React from 'react';
import Link from 'next/link';
import { TableService } from '@/lib/services/table-service';
import { ZoneService } from '@/lib/services/zone-service';
import { VisualTableCard } from '@/components/dashboard/VisualTableCard';
import {
  createTableFormAction,
  bulkCreateTableFormAction,
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
    <div className="relative min-h-[calc(100vh-4rem)] space-y-8 pb-12">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute top-1/3 -left-20 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pt-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">Table Management</h1>
          <p className="text-sm font-medium text-slate-400">Design your floor plan and manage live table states in real-time.</p>
        </div>
        <Link
          href="/dashboard/zones"
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20 hover:scale-105"
        >
          Manage Floor Zones &rarr;
        </Link>
      </div>

      {/* Premium KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-xl backdrop-blur-md transition-colors hover:bg-white/10">
          <div className="text-3xl font-black text-white">{stats.total}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Tables</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center shadow-[0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-md transition-colors hover:bg-emerald-500/15">
          <div className="text-3xl font-black text-emerald-400 drop-shadow-md">{stats.available}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">Available</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-center shadow-[0_0_20px_rgba(59,130,246,0.1)] backdrop-blur-md transition-colors hover:bg-blue-500/15">
          <div className="text-3xl font-black text-blue-400 drop-shadow-md">{stats.occupied}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-400/80">Occupied</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center shadow-[0_0_20px_rgba(245,158,11,0.1)] backdrop-blur-md transition-colors hover:bg-amber-500/15">
          <div className="text-3xl font-black text-amber-400 drop-shadow-md">{stats.cleaning}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-400/80">Cleaning</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 text-center shadow-[0_0_20px_rgba(168,85,247,0.1)] backdrop-blur-md transition-colors hover:bg-purple-500/15">
          <div className="text-3xl font-black text-purple-400 drop-shadow-md">{stats.reserved}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-purple-400/80">Reserved</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-5 text-center shadow-xl backdrop-blur-md transition-colors hover:bg-black/50">
          <div className="text-3xl font-black text-slate-500">{stats.outOfService}</div>
          <div className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Out of Service</div>
        </div>
      </div>

      {/* Creation Sections for Admin */}
      {canCreate && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Single Table Creation */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-4 text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">+</span>
              Add Single Table
            </h3>
            <form action={createTableFormAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Table Number *</label>
                <input
                  type="text"
                  name="tableNumber"
                  required
                  placeholder="e.g. T-12"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Capacity *</label>
                <input
                  type="number"
                  name="capacity"
                  required
                  min="1"
                  max="50"
                  defaultValue="4"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Zone</label>
                <select
                  name="zoneId"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <option value="">Unassigned</option>
                  {zones.map((z: { id: string; name: string }) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3 pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>

          {/* Bulk Table Setup */}
          <div className="relative rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="mb-4 text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">⚡</span>
              Bulk Floor Setup
            </h3>
            <form action={bulkCreateTableFormAction} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Target Zone *</label>
                <select
                  name="zoneId"
                  required
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  {zones.map((z: { id: string; name: string }) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prefix</label>
                <input
                  type="text"
                  name="prefix"
                  placeholder="T-"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start #</label>
                <input
                  type="number"
                  name="startNumber"
                  defaultValue="1"
                  min="1"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Count</label>
                <input
                  type="number"
                  name="count"
                  defaultValue="10"
                  min="1"
                  max="100"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  defaultValue="4"
                  min="1"
                  max="50"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div className="col-span-2 sm:col-span-4 pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                >
                  Generate Floor Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-md">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search tables..."
          className="w-full rounded-xl border-none bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-64"
        />

        <div className="hidden sm:block h-8 w-px bg-white/10" />

        <select
          name="zoneId"
          defaultValue={zoneId}
          className="w-full rounded-xl border-none bg-transparent px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-48 [&>option]:bg-slate-900"
        >
          <option value="">All Zones</option>
          {zones.map((z: { id: string; name: string }) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>

        <div className="hidden sm:block h-8 w-px bg-white/10" />

        <select
          name="status"
          defaultValue={status}
          className="w-full rounded-xl border-none bg-transparent px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 sm:w-44 [&>option]:bg-slate-900"
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
          className="ml-auto w-full sm:w-auto rounded-xl bg-white/10 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Table Cards Grid */}
      <div className="relative min-h-[400px]">
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 backdrop-blur-sm">
            <span className="text-4xl mb-4 opacity-50">🪑</span>
            <div className="text-sm font-medium text-slate-400">
              No active tables found matching the current filters.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.map((table: { id: string; tableNumber: string; capacity: number; zoneName: string; status: TableStatus }) => (
              <VisualTableCard
                key={table.id}
                table={table}
                canManageStatus={canManageStatus}
                canDelete={canDelete}
                canUpdate={canUpdate}
              />
            ))}
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-6 text-sm">
            <span className="font-medium text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/tables?page=${page - 1}&search=${encodeURIComponent(search)}&zoneId=${zoneId}&status=${status}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white transition-colors hover:bg-white/10"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/dashboard/tables?page=${page + 1}&search=${encodeURIComponent(search)}&zoneId=${zoneId}&status=${status}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-bold text-white transition-colors hover:bg-white/10"
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
