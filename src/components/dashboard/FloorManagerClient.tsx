'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AddTableModal } from './AddTableModal';
import { updateTableStatusAction } from '@/app/dashboard/actions';

function formatDiningDuration(seatedAt: string | null | undefined): string {
  if (!seatedAt) return '';
  const diffMs = Date.now() - new Date(seatedAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export function FloorManagerClient({
  tables,
  zones,
  stats,
  queueEntries = [],
  seatedEntries = [],
}: {
  tables: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  zones: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  stats: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  restaurantName: string;
  queueEntries?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  seatedEntries?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
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
        const result = await updateTableStatusAction(tableId, newStatus as any, table?.status as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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

  // Build lookup map for currently seated guest per table
  const seatedMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  (seatedEntries || []).forEach((entry: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (entry.seated_table_id) {
      seatedMap.set(entry.seated_table_id, entry);
    }
  });

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const selectedSeatedGuest = selectedTable ? seatedMap.get(selectedTable.id) : null;
  
  // Filter tables by zone
  const filteredTables = activeZone ? tables.filter(t => t.zoneId === activeZone) : tables;

  // Group by zone for the view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupedTables = filteredTables.reduce<Record<string, any[]>>((acc, table) => {
    const zoneName = table.zoneName || 'Unassigned';
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <div className="w-full flex-1 flex flex-col min-h-[calc(100vh-64px)]">
      
      {/* Top Bar / Actions */}
      <div className="p-4 sm:p-6 pb-2 shrink-0 flex flex-col gap-4">
        
        {/* KPI Ribbon - 2 cols on phone, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-2">
          {/* Active Tables */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Active Tables</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats.occupied}</span>
                <span className="text-sm font-bold text-slate-400">/ {stats.total}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-[3px] border-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">
                {stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
          
          {/* Needs Attention - uses real cleaning count */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">cleaning_services</span> Needs Cleaning
              </span>
              <div className="flex items-baseline gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="text-3xl font-black text-amber-400">{tables.filter((t:any)=>t.status==='CLEANING').length}</span>
                <span className="text-xs font-bold text-slate-400">Tables</span>
              </div>
            </div>
          </div>

          {/* Incoming Queue - real count */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">groups</span> Queued Guests
              </span>
              <div className="flex items-baseline gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="text-3xl font-black text-white">{(queueEntries as any[]).filter((e:any)=>['WAITING','CALLED','NOTIFIED'].includes(e.status)).length}</span>
                <span className="text-xs font-bold text-slate-400">Waiting</span>
              </div>
            </div>
          </div>

          {/* Occupancy Speed */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Floor Occupancy</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats.total>0?Math.round(stats.occupied/stats.total*100):0}%</span>
                <span className="text-xs font-bold text-slate-400">{stats.occupied}/{stats.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones & Legend row - scrollable on mobile */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            <button 
              onClick={() => setActiveZone(null)}
              className={`px-4 h-9 rounded-xl text-sm font-bold transition-colors shrink-0 border ${
                activeZone === null 
                  ? 'bg-blue-600 text-white shadow-sm border-blue-600' 
                  : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
              }`}
            >
              All Zones
            </button>
            {zones.map((z: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <button
                key={z.id}
                onClick={() => setActiveZone(z.id)}
                className={`px-4 h-9 rounded-xl text-sm font-bold transition-colors shrink-0 border ${
                  activeZone === z.id 
                  ? 'bg-blue-600 text-white shadow-sm border-blue-600' 
                  : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
                }`}
              >
                {z.name}
              </button>
            ))}
            <div className="shrink-0">
              <AddTableModal zones={zones} />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#111827] border border-emerald-500/30 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#111827] border border-amber-500/30 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Occupied</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#111827] border border-blue-500/30 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Reserved</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#111827] border border-red-500/30 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span> Needs Clean</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 p-4 sm:p-6 pt-2">
        
        {/* Left Side: Blueprint / Grid */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">Floor Blueprint</h2>
              <span className="hidden sm:inline px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-mono">Scaled 1:50</span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 bg-[#111827] border border-white/5 rounded-lg p-1 shrink-0">
              <button className="w-8 h-8 rounded bg-white/10 shadow-sm text-white flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">zoom_in</span></button>
              <button className="w-8 h-8 rounded text-slate-400 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">zoom_out</span></button>
              <button className="w-8 h-8 rounded text-slate-400 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">fit_screen</span></button>
            </div>
          </div>

          <div className="bg-[#111827] rounded-2xl shadow-sm border border-white/5 p-space-lg flex flex-col gap-space-xl relative overflow-hidden min-h-[600px]">
             
             {/* Map Decoration */}
             <div className="absolute top-4 left-4 right-4 border-t border-dashed border-white/10 text-[10px] text-slate-500 uppercase tracking-widest pt-1 flex justify-between">
               <span>-- Glass Wall Curtain (Garden Atrium Facing) --</span>
               <span>North Façade</span>
             </div>

             {Object.entries(groupedTables).map(([zoneName, tableList]: [string, any[]], zoneIdx) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
               <div key={zoneName} className="flex flex-col gap-3 relative z-10 mt-4">
                 <div className="flex items-center justify-between border-b border-white/5 pb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-500">Zone {String.fromCharCode(65 + zoneIdx)} · {zoneName}</span>
                     <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-slate-400 font-bold">{tableList.length} Tables View</span>
                   </div>
                   <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ambient Daylight Glass Line</span>
                 </div>
                 
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {tableList.map((table) => {
                        const isSelected = selectedTableId === table.id;

                        // High-contrast, glowing status styling
                        let theme = {
                          container: 'border-white/10 bg-[#0A0E17]/80 hover:border-white/20',
                          glow: '',
                          statusDot: 'bg-slate-400',
                          badge: 'border-white/10 bg-white/5 text-slate-300',
                          notch: 'bg-[#141C2B] text-slate-200 border border-white/10',
                          statusText: table.status,
                        };

                        if (table.status === 'AVAILABLE') {
                          theme = {
                            container: 'border-emerald-500/40 bg-gradient-to-br from-[#062016]/80 via-[#0A1724]/90 to-[#0A0E17]/95 hover:border-emerald-400',
                            glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_28px_rgba(16,185,129,0.25)]',
                            statusDot: 'bg-emerald-400 animate-pulse',
                            badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                            notch: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/40',
                            statusText: 'READY',
                          };
                        } else if (table.status === 'OCCUPIED') {
                          theme = {
                            container: 'border-amber-500/40 bg-gradient-to-br from-[#291A08]/80 via-[#151221]/90 to-[#0A0E17]/95 hover:border-amber-400',
                            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_28px_rgba(245,158,11,0.25)]',
                            statusDot: 'bg-amber-400 animate-pulse',
                            badge: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
                            notch: 'bg-gradient-to-br from-amber-600 to-yellow-700 text-white shadow-md shadow-amber-900/40',
                            statusText: 'OCCUPIED',
                          };
                        } else if (table.status === 'CLEANING') {
                          theme = {
                            container: 'border-rose-500/40 bg-gradient-to-br from-[#290814]/80 via-[#170E1A]/90 to-[#0A0E17]/95 hover:border-rose-400',
                            glow: 'shadow-[0_0_20px_rgba(244,63,94,0.18)] hover:shadow-[0_0_28px_rgba(244,63,94,0.3)]',
                            statusDot: 'bg-rose-400 animate-ping',
                            badge: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
                            notch: 'bg-gradient-to-br from-rose-600 to-pink-700 text-white shadow-md shadow-rose-900/40',
                            statusText: 'NEEDS CLEAN',
                          };
                        } else if (table.status === 'RESERVED') {
                          theme = {
                            container: 'border-blue-500/40 bg-gradient-to-br from-[#081729]/80 via-[#0E1528]/90 to-[#0A0E17]/95 hover:border-blue-400',
                            glow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_28px_rgba(59,130,246,0.25)]',
                            statusDot: 'bg-blue-400',
                            badge: 'border-blue-500/40 bg-blue-500/15 text-blue-300',
                            notch: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/40',
                            statusText: 'RESERVED',
                          };
                        }

                        const isOccupiedWithGuest = table.status === 'OCCUPIED' && seatedMap.get(table.id);
                        const sg = seatedMap.get(table.id);

                        return (
                          <button
                            key={table.id}
                            onClick={() => setSelectedTableId(table.id)}
                            className={`text-left rounded-2xl p-4 border flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] cursor-pointer relative overflow-hidden backdrop-blur-md ${theme.container} ${theme.glow} ${
                              isSelected ? 'ring-2 ring-white shadow-[0_0_25px_rgba(255,255,255,0.3)]' : ''
                            }`}
                          >
                            <div>
                              {/* Card Header: Table Notch & Status Live Pill */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-base ${theme.notch}`}
                                  >
                                    {table.tableNumber.startsWith('T') ? table.tableNumber : `T${table.tableNumber}`}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-extrabold text-slate-300">
                                      {table.zoneName || 'Table'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      👥 {table.capacity} Seats
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${theme.badge}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${theme.statusDot}`} />
                                  {theme.statusText}
                                </span>
                              </div>

                              {/* Card Body: Dynamic Content by Status */}
                              {isOccupiedWithGuest ? (
                                <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-bold text-amber-200 text-xs truncate flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                        {sg.customer_name?.charAt(0) || 'G'}
                                      </span>
                                      <span className="truncate">{sg.customer_name}</span>
                                    </span>
                                    <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                      Q-{(sg.display_number || sg.queue_number || '').toString().replace(/^#+/, '')}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                                    <span className="text-slate-400 font-medium">
                                      {sg.actual_guests || sg.party_size} guests
                                    </span>
                                    <span className="text-amber-400 font-mono text-[11px] font-bold flex items-center gap-1">
                                      <span>⏱️</span>
                                      <span>{formatDiningDuration(sg.seated_at)}</span>
                                    </span>
                                  </div>
                                </div>
                              ) : table.status === 'AVAILABLE' ? (
                                <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                                  <span className="text-emerald-400/90 font-bold flex items-center gap-1">
                                    <span>✨</span> Ready to Seat
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    Open
                                  </span>
                                </div>
                              ) : table.status === 'CLEANING' ? (
                                <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-rose-400 font-bold flex items-center gap-1">
                                      <span>🧹</span> Sanitizing...
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(table.id, 'AVAILABLE');
                                    }}
                                    className="w-full py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-black border border-emerald-500/40 transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                  >
                                    <span>✨</span> Mark Ready
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-3 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-xs">
                                  <span className="text-blue-400 font-bold">Party Incoming</span>
                                  <span className="text-[10px] text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
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
                ))}
              
          </div>
        </div>

        {/* Right Side: Table Inspector */}
        <div className="lg:col-span-4 flex flex-col">
          {selectedTable ? (
            <div className="bg-[#111827] rounded-2xl shadow-lg border border-white/5 p-6 flex flex-col gap-5 sticky top-4">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-black text-white">Table {selectedTable.tableNumber.startsWith('T') ? selectedTable.tableNumber : `T${selectedTable.tableNumber}`}</h2>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">grid_view</span>
                    {selectedTable.zoneName || 'Unassigned'} • {selectedTable.capacity} Seats
                  </div>
                </div>
                <button className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>

              {/* Table meta */}
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium">Cap {selectedTable.capacity}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${selectedTable.status==='AVAILABLE'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':selectedTable.status==='OCCUPIED'?'bg-amber-500/10 border-amber-500/20 text-amber-400':selectedTable.status==='CLEANING'?'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{selectedTable.status}</span>
              </div>

              {/* Currently Seated Guest Dossier */}
              {selectedSeatedGuest && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 flex flex-col gap-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Currently Seated Guest
                    </span>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Q-{(selectedSeatedGuest.display_number || selectedSeatedGuest.queue_number || '').toString().replace(/^#+/, '')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-base font-black text-white flex items-center gap-2">
                      <span>👤</span>
                      <span>{selectedSeatedGuest.customer_name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/30 p-2 border border-white/5 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-semibold">Party Size</span>
                        <span className="text-sm font-bold text-white mt-0.5">
                          {selectedSeatedGuest.actual_guests || selectedSeatedGuest.party_size} Guests
                        </span>
                      </div>
                      <div className="rounded-lg bg-black/30 p-2 border border-white/5 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-semibold">Dining Time</span>
                        <span className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                          ⏱️ {formatDiningDuration(selectedSeatedGuest.seated_at)}
                        </span>
                      </div>
                    </div>

                    {selectedSeatedGuest.customer_phone && (
                      <div className="flex items-center justify-between text-xs rounded-lg bg-black/20 px-2.5 py-1.5 border border-white/5 text-slate-300">
                        <span className="text-slate-400 text-[11px]">Phone:</span>
                        <span className="font-mono font-bold text-slate-200">{selectedSeatedGuest.customer_phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Clear Table & Complete Guest (Exit Flow)
                    </button>
                    <span className="text-[10px] text-center text-slate-400">
                      Frees table & finishes ticket so customer can join queue again later
                    </span>
                  </div>
                </div>
              )}

              {/* Status Indicator */}
              <div className="bg-[#0A0E17] rounded-xl border border-white/5 p-4 flex flex-col gap-2 relative mt-2 overflow-hidden">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Current Status</span>
                <span className={`text-2xl font-black ${
                  selectedTable.status === 'AVAILABLE' ? 'text-emerald-400' :
                  selectedTable.status === 'OCCUPIED' ? 'text-amber-400' :
                  selectedTable.status === 'CLEANING' ? 'text-rose-400' : 'text-blue-400'
                }`}>
                  {selectedTable.status === 'CLEANING' ? 'NEEDS CLEANING' : selectedTable.status}
                </span>
                <span className="text-xs text-slate-400">
                  {selectedTable.status === 'AVAILABLE' ? 'Table is ready to seat guests.' :
                   selectedTable.status === 'OCCUPIED' ? 'Guests are currently seated.' :
                   selectedTable.status === 'CLEANING' ? 'Table needs to be cleaned and sanitized.' : 'Table is reserved for an incoming party.'}
                </span>
              </div>

              {/* Table Status Quick Switcher */}
              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Set Table Status
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Available', status: 'AVAILABLE', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' },
                    { label: 'Occupied', status: 'OCCUPIED', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' },
                    { label: 'Needs Cleaning', status: 'CLEANING', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' },
                    { label: 'Reserved', status: 'RESERVED', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' },
                    { label: 'Out of Service', status: 'OUT_OF_SERVICE', cls: 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700' },
                  ].map((s) => (
                    <button
                      key={s.status}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(selectedTable.id, s.status)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${s.cls} ${
                        selectedTable.status === s.status ? 'ring-2 ring-white/30 scale-[1.02]' : 'opacity-80'
                      }`}
                    >
                      {selectedTable.status === s.status ? `✓ ${s.label}` : s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Actions */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange(selectedTable.id, 'CLEANING')}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedTable.status === 'OCCUPIED' ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-white/5 text-slate-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                  MARK NEEDS CLEANING
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(selectedTable.id, 'OCCUPIED')}
                    className="py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span> Mark Occupied
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(selectedTable.id, 'AVAILABLE')}
                    className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span> Mark Available
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[#111827] rounded-2xl shadow-sm border border-white/5 p-12 flex flex-col items-center justify-center text-slate-500 h-full min-h-[400px]">
              <span className="material-symbols-outlined text-[48px] opacity-20 mb-4">touch_app</span>
              <p className="text-sm text-center">Select a table on the floor plan<br/>to view details and actions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
