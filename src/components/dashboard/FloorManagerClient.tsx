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
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-64px)] bg-[#0A0E17] text-white overflow-hidden">
      {/* 1. Command Bar & Quick Stats Ribbon */}
      <div className="p-4 border-b border-white/5 bg-[#0D121F] shrink-0 flex flex-col gap-4 z-20 shadow-md">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">table_restaurant</span>
              Floor Manager
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 bg-[#111827] border border-white/10 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-slate-400 font-bold">{restaurantName}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2 overflow-x-auto hide-scrollbar">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Filter Zone:</span>
              <button
                type="button"
                onClick={() => setActiveZone(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  activeZone === null
                    ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                All
              </button>
              {zones.map((z: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setActiveZone(z.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                    activeZone === z.id
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block mx-1"></div>
            <AddTableModal zones={zones} />
          </div>
        </div>

        {/* KPI Ribbon (Ultra-compact) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#151B2B] rounded-xl border border-white/5 p-3 flex items-center gap-4 group hover:border-emerald-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <span className="material-symbols-outlined text-[20px]">restaurant</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Tables</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{stats.occupied}</span>
                <span className="text-xs text-slate-400 font-bold">/ {stats.total}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#151B2B] rounded-xl border border-white/5 p-3 flex items-center gap-4 group hover:border-amber-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <span className="material-symbols-outlined text-[20px]">cleaning_services</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Needs Clean</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-amber-400">{cleaningCount}</span>
                <span className="text-xs text-slate-400 font-bold">Tables</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#151B2B] rounded-xl border border-white/5 p-3 flex items-center gap-4 group hover:border-blue-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Queued Guests</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{waitingGuests.length}</span>
                <span className="text-xs text-slate-400 font-bold">Parties</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[#151B2B] rounded-xl border border-white/5 p-3 flex items-center gap-4 group hover:border-purple-500/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <span className="material-symbols-outlined text-[20px]">chair</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Capacity</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white">{totalFloorSeats}</span>
                <span className="text-xs text-slate-400 font-bold">Seats</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Scrollable body) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Blueprint Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar relative bg-[#090D16]"
             style={{
               backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
               backgroundSize: '32px 32px',
               backgroundPosition: '-1px -1px'
             }}>
          
          <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-32">
            {Object.keys(groupedTables).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center text-slate-500">
                <span className="material-symbols-outlined text-6xl mb-4 text-slate-700/50">grid_view</span>
                <p className="font-bold text-white text-lg">Floor is empty</p>
                <p className="text-sm text-slate-400 mt-2 max-w-sm">Build your restaurant layout by adding tables. They will appear on this grid.</p>
              </div>
            ) : (
              Object.entries(groupedTables).map(([zoneName, tableList]: [string, any[]], zoneIdx) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <div key={zoneName} className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                    <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-mono text-xs font-black border border-blue-500/20">
                      SEC-{String.fromCharCode(65 + zoneIdx)}
                    </span>
                    <span className="text-sm font-black uppercase tracking-widest text-slate-300">
                      {zoneName}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
                    <span className="text-xs text-slate-500 font-bold">{tableList.length} Tables</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {tableList.map((table) => {
                      const isSelected = selectedTableId === table.id;
                      const isOccupied = table.status === 'OCCUPIED';
                      const isAvailable = table.status === 'AVAILABLE';
                      const isCleaning = table.status === 'CLEANING';
                      const isReserved = table.status === 'RESERVED';
                      const sg = isOccupied ? seatedMap.get(table.id) : null;

                      let theme = {
                        bg: 'bg-[#151C2C]/80 border-white/5 hover:border-white/20',
                        accent: 'bg-slate-700',
                        text: 'text-slate-400',
                        badge: 'bg-white/5 text-slate-400',
                        label: table.status,
                        icon: 'table_restaurant'
                      };

                      if (isAvailable) {
                        theme = {
                          bg: 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                          accent: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
                          text: 'text-emerald-400',
                          badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                          label: 'OPEN',
                          icon: 'check'
                        };
                      } else if (isOccupied) {
                        theme = {
                          bg: 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
                          accent: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
                          text: 'text-amber-400',
                          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                          label: 'OCCUPIED',
                          icon: 'person'
                        };
                      } else if (isCleaning) {
                        theme = {
                          bg: 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.05)] hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
                          accent: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse',
                          text: 'text-rose-400',
                          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                          label: 'BUS TABLE',
                          icon: 'sanitizer'
                        };
                      } else if (isReserved) {
                        theme = {
                          bg: 'bg-blue-950/20 border-blue-500/30 hover:border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.05)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
                          accent: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
                          text: 'text-blue-400',
                          badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                          label: 'RESERVED',
                          icon: 'book_online'
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
                          className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer backdrop-blur-md flex flex-col gap-3 min-h-[140px] relative overflow-hidden group ${
                            theme.bg
                          } ${
                            isSelected
                              ? 'ring-2 ring-white/50 scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.1)] z-10'
                              : 'hover:scale-[1.01]'
                          }`}
                        >
                          {/* Top row: Table ID and Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-8 rounded-full ${theme.accent}`} />
                              <div className="flex flex-col">
                                <span className="text-lg font-black text-white font-mono leading-none tracking-tight">
                                  {cleanTableNum}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                  {capacity} Seats
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest border ${theme.badge}`}>
                              {theme.label}
                            </span>
                          </div>

                          {/* Body: Contextual Details */}
                          <div className="flex-1 flex flex-col justify-end mt-2">
                            {isOccupied && sg ? (
                              <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs truncate mr-2">
                                    👤 {sg.customer_name}
                                  </span>
                                  <span className="text-amber-400 font-mono text-[10px] font-bold shrink-0">
                                    {formatDiningDuration(sg.seated_at) || 'Just seated'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    Party of {sg.actual_guests || sg.party_size}
                                  </span>
                                </div>
                              </div>
                            ) : isAvailable ? (
                              <div className="text-xs text-emerald-500/70 font-medium flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">event_seat</span>
                                Ready for next party
                              </div>
                            ) : isCleaning ? (
                              <div className="text-xs text-rose-400/80 font-bold flex items-center gap-1.5 animate-pulse">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                Needs sanitization
                              </div>
                            ) : (
                              <div className="text-xs text-blue-400/70 font-medium flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">lock</span>
                                Held for reservation
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

        {/* Right Side: Smart Table Inspector */}
        {/* Mobile overlay backdrop */}
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${selectedTable ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setSelectedTableId(null)}
        />
        <div className={`
          fixed lg:static inset-x-0 bottom-0 z-50 lg:z-20
          w-full lg:w-[380px] xl:w-[420px] 
          h-[85vh] lg:h-full max-h-[85vh] lg:max-h-full 
          bg-[#0D121F] lg:border-t-0 lg:border-l border-t border-white/10 rounded-t-3xl lg:rounded-none
          flex flex-col shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] lg:shadow-none
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${selectedTable ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        `}>
          {/* Mobile Handle */}
          <div className="lg:hidden flex items-center justify-center pt-4 pb-2 w-full cursor-pointer" onClick={() => setSelectedTableId(null)}>
            <div className="w-12 h-1.5 rounded-full bg-white/20"></div>
          </div>
          
          {selectedTable ? (
            <div className="flex flex-col p-5 sm:p-6 gap-6 h-full min-h-0 overflow-y-auto custom-scrollbar pb-10 lg:pb-5">
              {/* Header */}
              <div className="flex items-start justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-xl font-black shadow-lg ${
                    selectedTable.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedTable.status === 'OCCUPIED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    selectedTable.status === 'CLEANING' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {selectedTable.tableNumber.startsWith('T') ? selectedTable.tableNumber : `T${selectedTable.tableNumber}`}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-white leading-tight">Table Details</h3>
                    <span className="text-xs text-slate-400 font-bold">{selectedTable.zoneName || 'Main Floor'} • {selectedTable.capacity} Seats</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Context Card */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto hide-scrollbar shrink-0">
                {selectedTable.status === 'OCCUPIED' && selectedSeatedGuest && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-400">Current Party</span>
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Q-{(selectedSeatedGuest.display_number || selectedSeatedGuest.queue_number || '').toString().replace(/^#+/, '')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black text-white">{selectedSeatedGuest.customer_name}</span>
                      <div className="flex items-center gap-3 text-sm text-amber-200 mt-1">
                        <span className="font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">group</span> {selectedSeatedGuest.actual_guests || selectedSeatedGuest.party_size} Guests</span>
                        <span className="opacity-50">•</span>
                        <span className="font-mono font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> {formatDiningDuration(selectedSeatedGuest.seated_at) || '0m'}</span>
                      </div>
                      {selectedSeatedGuest.customer_phone && (
                         <span className="text-xs text-slate-400 mt-2 font-mono flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5 w-max">
                           <span className="material-symbols-outlined text-[14px]">call</span> {selectedSeatedGuest.customer_phone}
                         </span>
                      )}
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleExitCustomer(selectedSeatedGuest.id, selectedTable.id)}
                        className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-sm font-black shadow-lg shadow-amber-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined">receipt_long</span>
                        Complete &amp; Clear Table
                      </button>
                    </div>
                  </div>
                )}

                {selectedTable.status === 'AVAILABLE' && (
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Ready to Seat</span>
                    </div>
                    <p className="text-sm text-emerald-100/70">
                      This table is clean and available for a party of up to <strong className="text-white">{selectedTable.capacity}</strong>.
                    </p>
                    
                    {nextMatchingGuest ? (
                      <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/20 mt-2 shadow-inner relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1 mb-2">
                          <span className="material-symbols-outlined text-[14px]">bolt</span> Suggested Match
                        </span>
                        <div className="flex items-center justify-between mb-4">
                           <span className="font-bold text-white text-base">{nextMatchingGuest.customer_name}</span>
                           <span className="text-xs font-bold text-slate-300 bg-white/10 px-2 py-1 rounded">👥 {nextMatchingGuest.party_size}</span>
                        </div>
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
                    ) : (
                      <div className="bg-black/30 rounded-xl p-4 border border-white/5 mt-2 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-slate-500 text-2xl">hourglass_empty</span>
                        No pending parties match this capacity.
                      </div>
                    )}
                  </div>
                )}

                {selectedTable.status === 'CLEANING' && (
                  <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span> Needs Sanitization</span>
                    </div>
                    <p className="text-sm text-rose-100/70">
                      Table requires clearing and cleaning before the next party can be seated.
                    </p>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')}
                      className="w-full py-3.5 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-black shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      Mark Clean &amp; Ready
                    </button>
                  </div>
                )}
                
                {selectedTable.status === 'RESERVED' && (
                  <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5 flex flex-col gap-4">
                     <span className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">lock</span> Reserved / Held</span>
                     <p className="text-sm text-blue-100/70">This table is manually held for an upcoming party.</p>
                  </div>
                )}
              </div>

              {/* Status Switcher (Bottom docked) */}
              <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-3 shrink-0">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manual Override</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')} className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedTable.status === 'AVAILABLE' ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-transparent text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'}`}>Available</button>
                  <button onClick={() => handleStatusChange(selectedTable.id, 'OCCUPIED')} className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedTable.status === 'OCCUPIED' ? 'bg-amber-500 text-white border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-transparent text-amber-400 border-amber-500/30 hover:bg-amber-500/10'}`}>Occupied</button>
                  <button onClick={() => handleStatusChange(selectedTable.id, 'CLEANING')} className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedTable.status === 'CLEANING' ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-transparent text-rose-400 border-rose-500/30 hover:bg-rose-500/10'}`}>Bus Table</button>
                  <button onClick={() => handleStatusChange(selectedTable.id, 'RESERVED')} className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${selectedTable.status === 'RESERVED' ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-transparent text-blue-400 border-blue-500/30 hover:bg-blue-500/10'}`}>Reserved</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center gap-4">
              <span className="material-symbols-outlined text-6xl opacity-20">touch_app</span>
              <p className="font-bold text-white text-lg">Select a table</p>
              <p className="text-sm text-slate-400 max-w-[250px]">Click any table on the blueprint to view details and manage seating.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
