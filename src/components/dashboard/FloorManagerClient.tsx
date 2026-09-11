'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TableStatus } from '@/types/database.types';

export function FloorManagerClient({
  tables,
  zones,
  stats,
  restaurantName,
  queueEntries,
}: {
  tables: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  zones: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  stats: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  restaurantName: string;
  queueEntries: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tables.length > 0 ? tables[0].id : null);
  const [activeZone, setActiveZone] = useState<string | null>(null);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  
  // Filter tables by zone
  const filteredTables = activeZone ? tables.filter(t => t.zoneId === activeZone) : tables;

  // Group by zone for the view
  const groupedTables = filteredTables.reduce<Record<string, any[]>>((acc, table) => {
    const zoneName = table.zoneName || 'Unassigned';
    if (!acc[zoneName]) acc[zoneName] = [];
    acc[zoneName].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Top Bar / Actions */}
      <div className="p-6 pb-2 shrink-0 flex flex-col gap-4">
        
        {/* KPI Ribbon */}
        <div className="grid grid-cols-4 gap-4 mb-2">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
            {zones.map((z: any) => (
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
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-emerald-500/30 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-amber-500/30 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Occupied</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-blue-500/30 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Held/Reserved</div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111827] border border-red-500/30 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span> Needs Clean</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-2 overflow-hidden">
        
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

             {Object.entries(groupedTables).map(([zoneName, tableList]: [string, any[]], zoneIdx) => (
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
                     
                     // Mocking specific tables for the screenshot feel
                     const isT4 = table.tableNumber === 'T4' || table.tableNumber === '4';
                     const isT7 = table.tableNumber === 'T7' || table.tableNumber === '7';
                     const isT2 = table.tableNumber === 'T2' || table.tableNumber === '2';

                     if (isT4) {
                       borderClass = 'border-blue-500';
                       bgClass = 'bg-[#0A0E17]';
                       shadowClass = 'shadow-[0_0_15px_rgba(59,130,246,0.3)]';
                     } else if (isT7) {
                       borderClass = 'border-red-500';
                       bgClass = 'bg-[#0A0E17]';
                       shadowClass = 'shadow-[0_0_15px_rgba(239,68,68,0.2)]';
                     } else if (isT2 || table.status === 'AVAILABLE') {
                       borderClass = 'border-emerald-500';
                       bgClass = 'bg-[#0A0E17]';
                       shadowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.1)]';
                     } else if (table.status === 'OCCUPIED' || table.status === 'CLEANING') {
                       borderClass = 'border-amber-500/50';
                       bgClass = 'bg-[#0A0E17]';
                       shadowClass = 'shadow-[0_0_15px_rgba(245,158,11,0.1)]';
                     } else if (isSelected) {
                       borderClass = 'border-blue-500/50';
                       bgClass = 'bg-blue-900/10';
                     }

                     return (
                       <button 
                         key={table.id}
                         onClick={() => setSelectedTableId(table.id)}
                         className={`text-left rounded-xl p-3 border flex flex-col gap-2 transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden ${borderClass} ${bgClass} ${shadowClass}`}
                       >
                         {isT4 && (
                           <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider text-center py-0.5 flex items-center justify-center gap-1">
                             <span className="material-symbols-outlined text-[10px]">lock</span> Hold #A12
                           </div>
                         )}

                         <div className={`flex items-start justify-between ${isT4 ? 'mt-4' : ''}`}>
                           <div className="flex items-center gap-2">
                             <span className={`text-xl font-black tracking-tight ${isT7 ? 'text-red-400' : isT4 ? 'text-blue-400' : isT2 || table.status === 'AVAILABLE' ? 'text-emerald-400' : 'text-white'}`}>
                               {table.tableNumber.startsWith('T') ? table.tableNumber : `T${table.tableNumber}`}
                             </span>
                             <div className="flex flex-col">
                               <span className="text-[10px] text-slate-400 leading-tight">{table.capacity}-Top</span>
                               {table.capacity === 2 && <span className="text-[9px] text-slate-500 leading-tight">(Round)</span>}
                             </div>
                           </div>
                           
                           {/* Status Badge right top */}
                           {isT7 ? (
                             <div className="flex flex-col items-end">
                               <span className="bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">warning</span> 6m OVERDUE</span>
                             </div>
                           ) : isT2 || table.status === 'AVAILABLE' ? (
                             <span className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">READY</span>
                           ) : isT4 ? (
                             <span className="text-blue-500 material-symbols-outlined text-[18px]">chair_alt</span>
                           ) : (
                             <span className="bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide">{table.status === 'CLEANING' ? 'BUSSING' : table.status === 'OCCUPIED' ? '42m' : table.status}</span>
                           )}
                         </div>

                         <div className="flex flex-col gap-0.5">
                           {isT4 ? (
                             <>
                               <span className="text-sm font-bold text-white truncate">Rahul Sharma</span>
                               <div className="flex items-center gap-2 text-[10px] font-medium text-blue-400">
                                 <span>Queue Locked</span>
                                 <span>Pre-order Ready</span>
                               </div>
                             </>
                           ) : isT7 ? (
                             <>
                               <span className="text-sm font-semibold text-white truncate">Queue #A15 Waiting</span>
                               <span className="text-xs text-slate-400">(Party of 6)</span>
                             </>
                           ) : isT2 ? (
                             <>
                               <span className="text-xs text-slate-400">2 Guests · Table Open</span>
                               <span className="text-[10px] text-emerald-400 font-medium">Inspected at 8:44 PM</span>
                             </>
                           ) : table.status === 'AVAILABLE' ? (
                             <>
                               <span className="text-sm font-semibold text-white truncate">Available</span>
                               <span className="text-[10px] text-emerald-400 font-medium">Sanitized & Set</span>
                             </>
                           ) : (
                             <>
                               <span className="text-xs text-slate-400">{table.capacity} Guests · {table.status === 'CLEANING' ? 'Settling tab' : 'Main Course'}</span>
                               {table.status === 'CLEANING' && <span className="text-[10px] text-blue-400 font-medium">Turnover soon</span>}
                             </>
                           )}
                         </div>

                         <div className="mt-auto pt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
                           {isT4 ? (
                             <div className="w-full mt-2 py-1.5 px-2 bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded-lg flex items-center justify-between font-bold">
                               <span>Arriving in 1m</span>
                               <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                             </div>
                           ) : isT7 ? (
                             <div className="w-full flex items-center justify-between text-red-400">
                               <span>Uncleaned</span>
                               <button className="flex items-center gap-1 bg-red-500/20 border border-red-500/50 text-red-400 px-2 py-1 rounded hover:bg-red-500/30"><span className="material-symbols-outlined text-[12px]">notifications_active</span> Ping Busser</button>
                             </div>
                           ) : table.status === 'AVAILABLE' ? (
                             <button className="flex items-center gap-1 text-blue-400 font-bold hover:text-blue-300">
                               <span className="material-symbols-outlined text-[14px]">person_add</span> Assign Queue #A13
                             </button>
                           ) : (
                             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Server: {['Rajesh', 'Priya', 'Ananya', 'Vikram'][Math.floor(Math.random()*4)]}</span>
                           )}
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
                    {(selectedTable.tableNumber === 'T4' || selectedTable.tableNumber === '4') && (
                      <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">Settling Tab</span>
                    )}
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

              {/* Mock Payment & Turnover */}
              <div className="bg-[#0A0E17] rounded-xl border border-amber-500/30 p-4 flex flex-col gap-3 relative mt-2 overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                  <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 w-[85%] rounded-full"></div>
                </div>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">Payment & Turnover Stage</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-3xl font-black text-white">₹3,420</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold flex items-center gap-1">Check Printed</span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">Verma Party (4 Guests) • Card Swipe Pending</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Table Timer</span>
                    <span className="text-xs font-mono text-slate-400">58m</span>
                    <span className="text-sm font-bold text-amber-500 mt-2">~3m Left</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 text-right leading-tight">Turn target pace</span>
                  </div>
                </div>
              </div>

              {/* Ticket Summary */}
              <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ticket #408 Order Summary</span>
                  <span className="text-xs font-bold text-blue-400">4 Items</span>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-slate-300">
                  <div className="flex justify-between"><span className="text-slate-400">1x</span> <span className="flex-1 ml-2 text-white">Truffle Wild Mushroom Risotto</span><span className="font-mono">₹940</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">2x</span> <span className="flex-1 ml-2 text-white">Wood-Fired Neapolitan Pizza</span><span className="font-mono">₹1,480</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">2x</span> <span className="flex-1 ml-2 text-white">Smoked Espresso Tiramisu</span><span className="font-mono">₹1,000</span></div>
                </div>
              </div>

              {/* Staff Assignments */}
              <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
                 <div className="flex items-center justify-between p-3 rounded-xl bg-blue-900/10 border border-blue-500/10">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded bg-blue-600 text-white font-bold flex items-center justify-center text-xs">AN</div>
                     <div className="flex flex-col">
                       <span className="text-sm font-bold text-white">Ananya (Primary Server)</span>
                       <span className="text-xs text-slate-400">Section: Zone A (T1, T3, T5)</span>
                     </div>
                   </div>
                   <span className="px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">Table Active</span>
                 </div>
                 
                 <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0E17] border border-white/5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs">RK</div>
                     <div className="flex flex-col">
                       <span className="text-sm font-bold text-white">Ravi K. (Pre-Assigned Busser)</span>
                       <span className="text-xs text-slate-400">Next for Sanitization & Reset</span>
                     </div>
                   </div>
                   <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">Alert Busser</span>
                 </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  CLOSE BILL & MARK READY FOR BUSSER
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-2.5 rounded-xl bg-transparent border border-white/10 hover:bg-white/5 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">compare_arrows</span> Merge with T3
                  </button>
                  <button className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">check</span> Fast Reset (Clean)
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
