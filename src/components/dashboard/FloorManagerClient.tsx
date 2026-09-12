'use client';

import React, { useState, useTransition } from 'react';
import { AddTableModal } from './AddTableModal';
import { updateTableStatusAction } from '@/app/dashboard/actions';

export function FloorManagerClient({
  tables,
  zones,
  stats,
}: {
  tables: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  zones: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  stats: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  restaurantName: string;
  queueEntries: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tables.length > 0 ? tables[0].id : null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (tableId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        const table = tables.find((t) => t.id === tableId);
        const result = await updateTableStatusAction(tableId, newStatus as any, table?.status as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (result && !result.success) {
          alert(result.error || 'Failed to update table status');
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        alert(err.message || 'Failed to update table status');
      }
    });
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);
  
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
        
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
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
          
          {/* Needs Attention */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">warning</span> Action Required
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-red-400">3</span>
                <span className="text-xs font-bold text-slate-400">Overdue turns</span>
              </div>
            </div>
          </div>

          {/* Incoming Queue */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">groups</span> Queued Guests
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">12</span>
                <span className="text-xs font-bold text-slate-400">Waiting</span>
              </div>
            </div>
          </div>

          {/* Turnover Speed */}
          <div className="bg-[#111827] rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Avg Turn Time</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">42m</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span> 3m
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Zones & Legend row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setActiveZone(null)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeZone === null 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Zones
            </button>
            {zones.map((z: any) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <button
                key={z.id}
                onClick={() => setActiveZone(z.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeZone === z.id 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {z.name}
              </button>
            ))}
            <AddTableModal zones={zones} />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-emerald-500/30 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-amber-500/30 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Occupied</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-blue-500/30 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Held/Reserved</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-red-500/30 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span> Needs Clean</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 pt-2">
        
        {/* Left Side: Blueprint / Grid */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Floor Blueprint · Level 1</h2>
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-slate-400 font-mono">Scaled 1:50</span>
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold ml-2">
                <span className="material-symbols-outlined text-[14px]">sensors</span>
                Live telemetry connected
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#111827] border border-white/5 rounded-lg p-1">
              <button className="p-1.5 rounded bg-white/10 shadow-sm text-white hover:text-blue-400"><span className="material-symbols-outlined text-[18px]">zoom_in</span></button>
              <button className="p-1.5 rounded text-slate-400 hover:text-white"><span className="material-symbols-outlined text-[18px]">zoom_out</span></button>
              <button className="p-1.5 rounded text-slate-400 hover:text-white"><span className="material-symbols-outlined text-[18px]">fit_screen</span></button>
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
                 
                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                   {tableList.map(table => {
                     const isSelected = selectedTableId === table.id;
                     
                     // Derive UI state based on mockup
                     let borderClass = 'border-white/5';
                     let bgClass = 'bg-[#0A0E17]';
                     let shadowClass = '';
                     let statusText = table.status;
                     let statusColor = 'text-slate-400';

                     if (table.status === 'AVAILABLE') {
                       borderClass = 'border-emerald-500';
                       bgClass = 'bg-emerald-900/10';
                       shadowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                       statusText = 'READY';
                       statusColor = 'text-emerald-400';
                     } else if (table.status === 'OCCUPIED') {
                       borderClass = 'border-amber-500';
                       bgClass = 'bg-amber-900/10';
                       shadowClass = 'shadow-[0_0_15px_rgba(245,158,11,0.15)]';
                       statusText = 'OCCUPIED';
                       statusColor = 'text-amber-400';
                     } else if (table.status === 'CLEANING') {
                       borderClass = 'border-rose-500';
                       bgClass = 'bg-rose-900/10';
                       shadowClass = 'shadow-[0_0_15px_rgba(225,29,72,0.15)]';
                       statusText = 'NEEDS CLEAN';
                       statusColor = 'text-rose-400';
                     } else if (table.status === 'RESERVED') {
                       borderClass = 'border-blue-500';
                       bgClass = 'bg-blue-900/10';
                       shadowClass = 'shadow-[0_0_15px_rgba(59,130,246,0.15)]';
                       statusText = 'RESERVED';
                       statusColor = 'text-blue-400';
                     }

                     if (isSelected) {
                       borderClass = 'border-white';
                       shadowClass = 'shadow-[0_0_20px_rgba(255,255,255,0.2)]';
                     }

                     return (
                       <button 
                         key={table.id}
                         onClick={() => setSelectedTableId(table.id)}
                         className={`text-left rounded-xl p-4 border flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden ${borderClass} ${bgClass} ${shadowClass}`}
                       >
                         <div className="flex items-start justify-between">
                           <div className="flex items-center gap-2">
                             <span className={`text-2xl font-black tracking-tight ${statusColor}`}>
                               {table.tableNumber.startsWith('T') ? table.tableNumber : `T${table.tableNumber}`}
                             </span>
                           </div>
                           
                           {/* Status Badge right top */}
                           <span className={`border ${statusColor.replace('text-', 'border-')}/50 ${statusColor.replace('text-', 'bg-')}/20 ${statusColor} text-[10px] font-bold px-2 py-1 rounded tracking-wide`}>
                             {statusText}
                           </span>
                         </div>

                         <div className="flex flex-col gap-1 mt-2">
                           <span className="text-sm font-semibold text-white truncate">
                             {table.capacity} Guests Capacity
                           </span>
                           <span className="text-xs text-slate-400">
                             {table.status === 'AVAILABLE' ? 'Table is ready for guests' : table.status === 'OCCUPIED' ? 'Guests are seated' : table.status === 'CLEANING' ? 'Waiting to be cleaned' : 'Table is reserved'}
                           </span>
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </div>
             ))}
             
             {/* Bottom bar inside map */}
             <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-500 font-medium z-20">
               <div className="flex items-center gap-4">
                 <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-emerald-400">power</span> Outlets at T1-T6, B1-B4</span>
                 <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-blue-400">accessible</span> ADA Compliant: T1, T2, T4, P2</span>
               </div>
               <span className="flex items-center gap-1">Auto-refresh synced: 3s ago <span className="material-symbols-outlined text-[12px]">sync</span></span>
             </div>
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
                    Zone A • Main Dining Hall • {selectedTable.capacity} Seats • Rectangular Wood Top
                  </div>
                </div>
                <button className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>

              {/* Badges row */}
              <div className="flex flex-col gap-2">
                <span className="px-2 py-1.5 rounded bg-blue-900/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-2 w-max"><span className="material-symbols-outlined text-[14px]">bolt</span> Under-Table Power</span>
                <span className="px-2 py-1.5 rounded bg-blue-900/20 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-2 w-max"><span className="material-symbols-outlined text-[14px]">music_note</span> Acoustic Damped</span>
                <span className="px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 w-max"><span className="material-symbols-outlined text-[14px]">child_friendly</span> High Chair Available</span>
              </div>

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
