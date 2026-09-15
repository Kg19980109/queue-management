'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AddTableModal } from './AddTableModal';
import { updateTableStatusAction, exitSeatedGuestAction } from '@/app/dashboard/actions';
import { chimeEngine } from '@/lib/audio-chime';
import { SeatCustomerModal, SeatableTableItem } from './SeatCustomerModal';

function formatDiningDuration(seatedAt: string | null | undefined): string {
  if (!seatedAt) return '';
  const diffMs = Date.now() - new Date(seatedAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

interface FloorManagerClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tables: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zones: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any;
  restaurantName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queueEntries?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  seatedEntries?: any[];
  userId?: string;
}

export function FloorManagerClient({
  tables,
  zones,
  stats,
  restaurantName,
  queueEntries = [],
  seatedEntries = [],
  userId = '',
}: FloorManagerClientProps) {
  const router = useRouter();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tables.length > 0 ? tables[0].id : null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Periodic polling sync to keep floor manager strictly synchronized with live queue
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);

  const handleStatusChange = (tableId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        const table = tables.find((t) => t.id === tableId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await updateTableStatusAction(tableId, newStatus as any, table?.status as any);
        if (result && !result.success) {
          alert(result.error || 'Failed to update table status');
        } else {
          router.refresh();
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        alert(err.message || 'Failed to update table status');
      }
    });
  };

  const handleExitCustomer = (entryId: string, tableId: string) => {
    startTransition(async () => {
      try {
        chimeEngine.playSeatChime();
        const result = await exitSeatedGuestAction(entryId, tableId);
        if (result && !result.success) {
          alert(result.error || 'Failed to exit seated customer');
        } else {
          router.refresh();
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        alert(err.message || 'Failed to exit seated customer');
      }
    });
  };

  // Build lookup map for currently seated guest per table.
  // CRITICAL: Only map entries with status 'SEATED'
  const seatedMap = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    (seatedEntries || []).forEach((entry: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (entry.seated_table_id && entry.status === 'SEATED') {
        map.set(entry.seated_table_id, entry);
      }
    });
    return map;
  }, [seatedEntries]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  // CRITICAL BUG FIX: Only show seated guest if the table is actually OCCUPIED.
  // Never show a past or orphaned guest on an AVAILABLE or CLEANING table.
  const selectedSeatedGuest =
    selectedTable && selectedTable.status === 'OCCUPIED' ? seatedMap.get(selectedTable.id) : null;

  // Filter tables by zone
  const filteredTables = activeZone ? tables.filter((t) => t.zoneId === activeZone) : tables;

  // Group by zone for the blueprint view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedTables = filteredTables.reduce<Record<string, any[]>>((acc, table) => {
    const zoneName = table.zoneName || 'Unassigned';
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  // Compute stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleaningCount = tables.filter((t: any) => t.status === 'CLEANING').length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waitingGuests = (queueEntries as any[]).filter((e: any) =>
    ['WAITING', 'CALLED', 'NOTIFIED'].includes(e.status)
  );
  const totalFloorSeats = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);

  // Available tables list for SeatCustomerModal
  const availableTablesList = useMemo(() => {
    return tables.filter((t) => t.status === 'AVAILABLE') as unknown as SeatableTableItem[];
  }, [tables]);

  // Recommended next guest in line for selected available table
  const nextMatchingGuest = useMemo(() => {
    if (!selectedTable || selectedTable.status !== 'AVAILABLE') return null;
    return waitingGuests.find((e: { party_size?: number }) => (e.party_size || 1) <= selectedTable.capacity) || null;
  }, [selectedTable, waitingGuests]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-[calc(100vh-64px)] bg-[#0A0E17] text-white">
      {/* Top Bar / Actions */}
      <div className="p-4 sm:p-6 pb-2 shrink-0 flex flex-col gap-4">
        {/* KPI Ribbon - 4 high-contrast cards with generous padding */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Active Tables */}
          <div className="bg-[#111827] rounded-2xl border border-white/10 p-4 sm:p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Tables
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.occupied}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-400">/ {stats.total}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                {stats.available} Ready for Seating
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-emerald-400 font-black text-base">
                {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Needs Cleaning */}
          <div className="bg-[#111827] rounded-2xl border border-white/10 p-4 sm:p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                Needs Cleaning
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">{cleaningCount}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-400">Tables</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {cleaningCount > 0 ? 'Requires staff sanitization' : 'All tables sanitized'}
              </span>
            </div>
            <div className={`w-13 h-13 rounded-2xl border-2 flex items-center justify-center shrink-0 ${
              cleaningCount > 0
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-400 animate-pulse'
                : 'border-white/10 bg-white/5 text-slate-400'
            }`}>
              <span className="material-symbols-outlined text-[24px]">sanitizer</span>
            </div>
          </div>

          {/* Queued Guests */}
          <div className="bg-[#111827] rounded-2xl border border-white/10 p-4 sm:p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">groups</span>
                Queued Guests
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{waitingGuests.length}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-400">Parties</span>
              </div>
              <span className="text-[10px] text-blue-300 font-medium">
                {waitingGuests.reduce((s: number, e: { party_size?: number }) => s + (e.party_size || 0), 0)} Total Headcount
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl border-2 border-blue-500/30 bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-400">
              <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
            </div>
          </div>

          {/* Floor Capacity */}
          <div className="bg-[#111827] rounded-2xl border border-white/10 p-4 sm:p-5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-colors">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">chair</span>
                Total Capacity
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{totalFloorSeats}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-400">Seats</span>
              </div>
              <span className="text-[10px] text-purple-300 font-medium">
                Across {stats.total} configured tables
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl border-2 border-purple-500/30 bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-400">
              <span className="material-symbols-outlined text-[24px]">meeting_room</span>
            </div>
          </div>
        </div>

        {/* Zones & Legend row */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            <button
              type="button"
              onClick={() => setActiveZone(null)}
              className={`px-4 h-10 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer ${
                activeZone === null
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-500 shadow-blue-500/25'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              All Zones ({tables.length})
            </button>
            {zones.map((z: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const count = tables.filter((t) => t.zoneId === z.id).length;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setActiveZone(z.id)}
                  className={`px-4 h-10 rounded-xl text-xs font-black transition-all shrink-0 border cursor-pointer ${
                    activeZone === z.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-blue-500 shadow-blue-500/25'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {z.name} ({count})
                </button>
              );
            })}
            <div className="shrink-0 ml-auto">
              <AddTableModal zones={zones} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Available
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-black">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Occupied
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-black">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Needs Clean
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 font-black">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> Reserved
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 p-4 sm:p-6 pt-2">
        {/* Left Side: Blueprint / Grid */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Floor Blueprint</h2>
              <span className="hidden sm:inline px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-400 font-mono">
                Architectural Grid
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Sync
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 bg-[#111827] border border-white/10 rounded-xl p-1 shrink-0">
              <span className="text-xs text-slate-400 font-bold px-2">{restaurantName}</span>
            </div>
          </div>

          {/* Blueprint Canvas with high-tech dot matrix background */}
          <div
            className="rounded-3xl border border-white/10 p-5 sm:p-7 flex flex-col gap-8 relative overflow-hidden min-h-[620px] shadow-2xl bg-[#090D16]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {/* Top Architectural Façade Banner */}
            <div className="border-b border-dashed border-white/15 text-[10px] text-slate-400 uppercase tracking-widest pb-2 flex justify-between font-mono">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px] text-blue-400">sensor_window</span>
                Garden Atrium &amp; Street Frontage
              </span>
              <span>North Façade</span>
            </div>

            {Object.keys(groupedTables).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <span className="material-symbols-outlined text-5xl mb-3 text-slate-600">table_restaurant</span>
                <p className="font-bold text-white text-base">No tables found in this view</p>
                <p className="text-xs text-slate-400 mt-1">Use the &ldquo;Add Table&rdquo; button above to create tables.</p>
              </div>
            ) : (
              Object.entries(groupedTables).map(([zoneName, tableList]: [string, any[]], zoneIdx) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={zoneName} className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs font-mono">
                        {String.fromCharCode(65 + zoneIdx)}
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-200">
                        {zoneName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-slate-400 font-bold border border-white/10">
                        {tableList.length} {tableList.length === 1 ? 'Table' : 'Tables'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono hidden sm:inline">
                      Primary Seating Section
                    </span>
                  </div>

                  {/* 3-Column Grid on desktop ensures cards have plenty of width (>280px) and labels NEVER clip */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {tableList.map((table) => {
                      const isSelected = selectedTableId === table.id;
                      const isOccupied = table.status === 'OCCUPIED';
                      const isAvailable = table.status === 'AVAILABLE';
                      const isCleaning = table.status === 'CLEANING';
                      const isReserved = table.status === 'RESERVED';
                      const sg = isOccupied ? seatedMap.get(table.id) : null;

                      // Theme styling with rich aesthetics
                      let theme = {
                        container: 'border-white/10 bg-[#111827]/90 hover:border-white/20',
                        glow: '',
                        statusDot: 'bg-slate-400',
                        badge: 'border-white/10 bg-white/5 text-slate-300',
                        notch: 'bg-[#1E293B] text-slate-200 border border-white/10',
                        statusText: table.status,
                      };

                      if (isAvailable) {
                        theme = {
                          container:
                            'border-emerald-500/40 bg-gradient-to-br from-[#062016]/90 via-[#0B1A24]/90 to-[#0A0E17]/95 hover:border-emerald-400',
                          glow: 'shadow-[0_0_24px_rgba(16,185,129,0.14)] hover:shadow-[0_0_32px_rgba(16,185,129,0.22)]',
                          statusDot: 'bg-emerald-400 animate-pulse',
                          badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                          notch:
                            'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/30',
                          statusText: 'READY',
                        };
                      } else if (isOccupied) {
                        theme = {
                          container:
                            'border-amber-500/40 bg-gradient-to-br from-[#261606]/90 via-[#191325]/90 to-[#0A0E17]/95 hover:border-amber-400',
                          glow: 'shadow-[0_0_24px_rgba(245,158,11,0.14)] hover:shadow-[0_0_32px_rgba(245,158,11,0.22)]',
                          statusDot: 'bg-amber-400 animate-pulse',
                          badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
                          notch:
                            'bg-gradient-to-br from-amber-600 to-yellow-700 text-white shadow-lg shadow-amber-900/40 border border-amber-400/30',
                          statusText: 'OCCUPIED',
                        };
                      } else if (isCleaning) {
                        theme = {
                          container:
                            'border-rose-500/40 bg-gradient-to-br from-[#290815]/90 via-[#1B0E1D]/90 to-[#0A0E17]/95 hover:border-rose-400',
                          glow: 'shadow-[0_0_24px_rgba(244,63,94,0.18)] hover:shadow-[0_0_32px_rgba(244,63,94,0.28)]',
                          statusDot: 'bg-rose-400 animate-ping',
                          badge: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
                          notch:
                            'bg-gradient-to-br from-rose-600 to-pink-700 text-white shadow-lg shadow-rose-900/40 border border-rose-400/30',
                          statusText: 'NEEDS CLEAN',
                        };
                      } else if (isReserved) {
                        theme = {
                          container:
                            'border-blue-500/40 bg-gradient-to-br from-[#08182E]/90 via-[#0F172E]/90 to-[#0A0E17]/95 hover:border-blue-400',
                          glow: 'shadow-[0_0_24px_rgba(59,130,246,0.14)] hover:shadow-[0_0_32px_rgba(59,130,246,0.22)]',
                          statusDot: 'bg-blue-400',
                          badge: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
                          notch:
                            'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30',
                          statusText: 'RESERVED',
                        };
                      }

                      const capacity = table.capacity || 2;
                      const cleanTableNum = table.tableNumber.startsWith('T')
                        ? table.tableNumber
                        : `T${table.tableNumber}`;

                      return (
                        <button
                          key={table.id}
                          type="button"
                          onClick={() => setSelectedTableId(table.id)}
                          className={`text-left rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] cursor-pointer relative overflow-hidden backdrop-blur-md min-h-[185px] ${
                            theme.container
                          } ${theme.glow} ${
                            isSelected
                              ? 'ring-2 ring-white shadow-[0_0_30px_rgba(255,255,255,0.35)] scale-[1.01]'
                              : ''
                          }`}
                        >
                          <div>
                            {/* Card Header: Big Table Notch, Capacity Dots & Status Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg ${theme.notch}`}
                                >
                                  {cleanTableNum}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-white">
                                    {table.zoneName || 'Table'}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] text-slate-300 font-bold">
                                      {capacity} Seats
                                    </span>
                                    <span className="text-[9px] text-slate-500">
                                      {Array.from({ length: Math.min(capacity, 8) }).map((_, i) => (
                                        <span key={i}>●</span>
                                      ))}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Unclipped Status Badge with pulse dot */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border whitespace-nowrap shrink-0 ${theme.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.statusDot}`} />
                                {theme.statusText}
                              </span>
                            </div>

                            {/* Card Body: High-fidelity details per status */}
                            {isOccupied && sg ? (
                              <div className="mt-4 pt-3 border-t border-amber-500/25 flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-amber-200 text-xs truncate flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                      {sg.customer_name?.charAt(0) || 'G'}
                                    </span>
                                    <span className="truncate">{sg.customer_name}</span>
                                  </span>
                                  <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                    Q-{(sg.display_number || sg.queue_number || '').toString().replace(/^#+/, '')}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-300">
                                  <span className="text-slate-400 font-semibold text-[11px]">
                                    👥 {sg.actual_guests || sg.party_size} guests
                                  </span>
                                  <span className="text-amber-400 font-mono text-[11px] font-bold flex items-center gap-1">
                                    <span>⏱️</span>
                                    <span>{formatDiningDuration(sg.seated_at) || 'Just seated'}</span>
                                  </span>
                                </div>
                              </div>
                            ) : isOccupied ? (
                              <div className="mt-4 pt-3 border-t border-amber-500/25 flex items-center justify-between text-xs">
                                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                  <span>👥</span> Occupied by Guests
                                </span>
                                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  In Service
                                </span>
                              </div>
                            ) : isAvailable ? (
                              <div className="mt-4 pt-3 border-t border-emerald-500/25 flex flex-col gap-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                                    <span>✨</span> Ready to Seat
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    Open
                                  </span>
                                </div>
                                {waitingGuests.length > 0 && (
                                  <span className="text-[10px] text-emerald-400/80 font-medium truncate">
                                    {waitingGuests.some((e: { party_size?: number }) => (e.party_size || 0) <= capacity)
                                      ? '⚡ Waiting party matches this table'
                                      : 'No exact party size match waiting'}
                                  </span>
                                )}
                              </div>
                            ) : isCleaning ? (
                              <div className="mt-4 pt-3 border-t border-rose-500/25 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-rose-300 font-bold flex items-center gap-1.5">
                                    <span>🧹</span> Sanitizing Table...
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(table.id, 'AVAILABLE');
                                  }}
                                  className="w-full py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 text-xs font-black border border-emerald-500/50 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <span>✨</span> Mark Table Ready
                                </button>
                              </div>
                            ) : (
                              <div className="mt-4 pt-3 border-t border-blue-500/25 flex items-center justify-between text-xs">
                                <span className="text-blue-300 font-bold flex items-center gap-1.5">
                                  <span>📌</span> Reserved Party
                                </span>
                                <span className="text-[10px] text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
                                  Hold
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Table Inspector */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedTable ? (
            <div className="bg-[#111827] rounded-3xl shadow-xl border border-white/10 p-6 flex flex-col gap-5 sticky top-4">
              {/* Inspector Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-3xl font-black text-white font-mono">
                      Table {selectedTable.tableNumber.startsWith('T') ? selectedTable.tableNumber : `T${selectedTable.tableNumber}`}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-blue-400">grid_view</span>
                    {selectedTable.zoneName || 'Unassigned'} • {selectedTable.capacity} Seats Capacity
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                    selectedTable.status === 'AVAILABLE'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : selectedTable.status === 'OCCUPIED'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : selectedTable.status === 'CLEANING'
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  }`}
                >
                  {selectedTable.status === 'CLEANING' ? 'NEEDS CLEANING' : selectedTable.status}
                </span>
              </div>

              {/* Table meta pills */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold">
                  Capacity {selectedTable.capacity} Guests
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold">
                  {selectedTable.zoneName || 'Main Area'}
                </span>
              </div>

              {/* DYNAMIC INSPECTOR DOSSIER BY STATUS */}

              {/* Case 1: OCCUPIED Table with Seated Guest (CRITICAL: Only shown when table is actually OCCUPIED) */}
              {selectedTable.status === 'OCCUPIED' && selectedSeatedGuest && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-4 sm:p-5 flex flex-col gap-3.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      Currently Seated Guest
                    </span>
                    <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Q-{(selectedSeatedGuest.display_number || selectedSeatedGuest.queue_number || '').toString().replace(/^#+/, '')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="text-lg font-black text-white flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-black border border-amber-500/30">
                        {selectedSeatedGuest.customer_name?.charAt(0) || 'G'}
                      </span>
                      <span className="truncate">{selectedSeatedGuest.customer_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-black/40 p-2.5 border border-white/5 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Party Size</span>
                        <span className="text-base font-black text-white mt-0.5">
                          {selectedSeatedGuest.actual_guests || selectedSeatedGuest.party_size} Guests
                        </span>
                      </div>
                      <div className="rounded-xl bg-black/40 p-2.5 border border-white/5 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dining Time</span>
                        <span className="text-base font-black text-amber-300 font-mono mt-0.5 flex items-center gap-1">
                          ⏱️ {formatDiningDuration(selectedSeatedGuest.seated_at) || 'Just seated'}
                        </span>
                      </div>
                    </div>

                    {selectedSeatedGuest.customer_phone && (
                      <div className="flex items-center justify-between text-xs rounded-xl bg-black/30 px-3 py-2 border border-white/5 text-slate-300">
                        <span className="text-slate-400 text-xs font-medium">Customer Phone:</span>
                        <a
                          href={`tel:${selectedSeatedGuest.customer_phone}`}
                          className="font-mono font-bold text-blue-400 hover:underline flex items-center gap-1"
                        >
                          📞 {selectedSeatedGuest.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleExitCustomer(selectedSeatedGuest.id, selectedTable.id)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:brightness-110 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Clear Table &amp; Complete Guest (Exit Flow)
                    </button>
                    <span className="text-[10px] text-center text-slate-400 leading-relaxed">
                      Frees table &amp; finishes ticket so customer can join queue again later
                    </span>
                  </div>
                </div>
              )}

              {/* Case 2: AVAILABLE Table - Show Seating Recommendation */}
              {selectedTable.status === 'AVAILABLE' && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4 sm:p-5 flex flex-col gap-3.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Table Ready for Seating
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                      Open Now
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    This {selectedTable.capacity}-seat table is sanitized and ready to seat incoming or queued parties.
                  </p>

                  {nextMatchingGuest ? (
                    <div className="rounded-xl bg-black/40 border border-emerald-500/30 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-black text-emerald-400">
                          Recommended Queue Match
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-300">
                          Q-{(nextMatchingGuest.display_number || nextMatchingGuest.queue_number || '').toString().replace(/^#+/, '')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white font-bold">
                        <span>👤 {nextMatchingGuest.customer_name}</span>
                        <span className="text-slate-400 font-medium">
                          👥 {nextMatchingGuest.party_size} Guests
                        </span>
                      </div>
                      <div className="pt-1">
                        <SeatCustomerModal
                          entryId={nextMatchingGuest.id}
                          customerName={nextMatchingGuest.customer_name}
                          displayNumber={nextMatchingGuest.display_number}
                          partySize={nextMatchingGuest.party_size}
                          userId={userId}
                          seatableTables={availableTablesList}
                          allAvailableTables={availableTablesList}
                          onSeated={() => {
                            chimeEngine.playSeatChime();
                            router.refresh();
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-black/30 border border-white/5 p-3 text-center text-xs text-slate-400">
                      No waiting queue parties matching this table right now.
                    </div>
                  )}
                </div>
              )}

              {/* Case 3: CLEANING Table - Bus / Sanitization Prompt */}
              {selectedTable.status === 'CLEANING' && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] p-4 sm:p-5 flex flex-col gap-3.5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                      Table Needs Sanitization
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase">
                      Action Required
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Previous guests have departed. Please wipe and sanitize table before seating next party.
                  </p>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Complete Sanitization &amp; Mark Ready
                  </button>
                </div>
              )}

              {/* Status Quick Switcher */}
              <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Set Table Status
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Available',
                      status: 'AVAILABLE',
                      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
                    },
                    {
                      label: 'Occupied',
                      status: 'OCCUPIED',
                      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
                    },
                    {
                      label: 'Needs Cleaning',
                      status: 'CLEANING',
                      cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
                    },
                    {
                      label: 'Reserved',
                      status: 'RESERVED',
                      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20',
                    },
                    {
                      label: 'Out of Service',
                      status: 'OUT_OF_SERVICE',
                      cls: 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700',
                    },
                  ].map((s) => (
                    <button
                      key={s.status}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(selectedTable.id, s.status)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        s.cls
                      } ${
                        selectedTable.status === s.status
                          ? 'ring-2 ring-white/30 scale-[1.02] shadow-sm font-black'
                          : 'opacity-80'
                      }`}
                    >
                      {selectedTable.status === s.status ? `✓ ${s.label}` : s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex flex-col gap-2.5 mt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange(selectedTable.id, 'CLEANING')}
                  className={`w-full py-3.5 rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedTable.status === 'OCCUPIED'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                      : 'bg-white/5 text-slate-500 opacity-60 hover:opacity-100 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                  MARK NEEDS CLEANING
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(selectedTable.id, 'OCCUPIED')}
                    className="py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person</span> Mark Occupied
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')}
                    className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span> Mark Available
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111827] rounded-3xl shadow-sm border border-white/10 p-12 flex flex-col items-center justify-center text-slate-500 h-full min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] opacity-30 mb-4 text-blue-400">touch_app</span>
              <p className="text-sm font-bold text-white text-center">Select a table</p>
              <p className="text-xs text-slate-400 text-center mt-1">
                Click any table on the floor plan<br />to view guest details, turnover, or change status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
