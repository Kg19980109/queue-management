'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateQueueStatusAction, seatQueueEntryAction, updateTableStatusAction } from '@/app/dashboard/actions';
import { broadcastCustomerQueueUpdate } from '@/lib/realtime/useCustomerQueueRealtime';

interface DashboardClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feedEntries: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tablesRes: { tables: any[] };
  activeQueueCount: number;
}

export function DashboardClient({ feedEntries, tablesRes, activeQueueCount }: DashboardClientProps) {
  const [seatingEntryId, setSeatingEntryId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Time difference in minutes
  const getWaitTimeMins = (joinedAtStr: string) => {
    const joinedAt = new Date(joinedAtStr);
    const now = new Date();
    const diffMs = now.getTime() - joinedAt.getTime();
    return Math.floor(diffMs / 60000);
  };



  const handleSeatClick = (entryId: string) => {
    setSeatingEntryId(entryId);
  };

  const handleSeatConfirm = async (tableId: string) => {
    if (!seatingEntryId) return;
    const entryId = seatingEntryId;
    setIsProcessing(entryId);
    setSeatingEntryId(null);
    try {
      await seatQueueEntryAction(entryId, tableId);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(null);
  };

  const handlePingBusser = async (tableId: string) => {
    setIsProcessing(`table-${tableId}`);
    try {
      await updateTableStatusAction(tableId, 'AVAILABLE', 'CLEANING');
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(null);
  };

  const availableTables = tablesRes.tables.filter((t) => t.status === 'AVAILABLE');
  const tablesTotal = tablesRes.tables.length;
  const tablesOccupied = tablesRes.tables.filter(t => t.status === 'OCCUPIED').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start relative z-10">
      
      {/* SEATING MODAL */}
      {seatingEntryId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#0A0E17] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative max-h-[85dvh] overflow-hidden safe-pb">
             <button 
                onClick={() => setSeatingEntryId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="text-xl font-bold text-white mb-2">Select a Table</h3>
              
              {availableTables.length === 0 ? (
                <p className="text-amber-500 text-sm">No available tables right now. Please mark a table as available first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                  {availableTables.map(t => (
                     <button
                        key={t.id}
                        onClick={() => handleSeatConfirm(t.id)}
                        className="p-4 rounded-xl border border-white/10 bg-[#111827] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-colors"
                     >
                       <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Table</div>
                       <div className="text-3xl font-black text-white font-headline-xl">{t.tableNumber}</div>
                       <div className="text-[10px] text-emerald-400 mt-2">Cap: {t.capacity} guests</div>
                     </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}


      {/* LEFT COLUMN: Queue Feed */}
      <section className="lg:col-span-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Live Queue Feed</h2>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-slate-400 font-mono">Real-time Stream</span>
          </div>
          <Link href="/dashboard/queue" className="text-sm font-bold text-primary hover:text-blue-400 transition-colors flex items-center gap-1">
            View All {activeQueueCount} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {feedEntries.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-white/5 p-8 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">inbox</span>
              <p className="text-slate-400">The queue is currently empty.</p>
            </div>
          ) : (
            feedEntries.map((entry, index) => {
              const waitMins = getWaitTimeMins(entry.joined_at);
              const isCalled = entry.status === 'CALLED';
              const isNextUp = index === 0 && !isCalled;
              const loading = isProcessing === entry.id;
              
              const borderColor = isCalled ? 'border-emerald-500/50' : 'border-white/5';
              const pillColor = isCalled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white';

              return (
                <div key={entry.id} className={`bg-[#111827] rounded-2xl border ${borderColor} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group hover:border-white/20 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isCalled && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>}
                  
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6 pl-2">
                    <div className="flex flex-col items-center">
                      <span className={`text-2xl font-black font-headline-xl ${isCalled ? 'text-emerald-400' : 'text-white'}`}>#{entry.display_number.replace('#', '')}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${pillColor} mt-1`}>
                        {isCalled ? 'CALLED' : isNextUp ? 'NEXT UP' : 'WAITING'}
                      </span>
                    </div>
                    
                    <div className="hidden sm:block w-px h-12 bg-white/10"></div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-bold text-white truncate">{entry.customer_name}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span> {entry.party_size} guests</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline"></span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-amber-500">schedule</span> {waitMins}m wait</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                      {entry.status === 'WAITING' && (
                        <button onClick={() => { setIsProcessing(entry.id); updateQueueStatusAction(entry.id, 'NOTIFIED').then(()=>broadcastCustomerQueueUpdate(entry.id)).finally(() => setIsProcessing(null)); }} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer">
                          Notify — Almost Ready
                        </button>
                      )}
                      
                      {entry.status === 'NOTIFIED' && (
                        <button onClick={() => { setIsProcessing(entry.id); updateQueueStatusAction(entry.id, 'CALLED').then(()=>broadcastCustomerQueueUpdate(entry.id)).finally(() => setIsProcessing(null)); }} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer">
                          Call — Table Ready
                        </button>
                      )}

                      {entry.status === 'CALLED' && (
                        <button onClick={() => handleSeatClick(entry.id)} className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                          Assign Table & Seat
                        </button>
                      )}

                      {entry.status === 'CALLED' && (
                        <button onClick={() => { if (!confirm(`Mark ${entry.customer_name} as no-show?`)) return; setIsProcessing(entry.id); updateQueueStatusAction(entry.id, 'NO_SHOW', undefined, 'STAFF_MARKED_NO_SHOW').then(()=>broadcastCustomerQueueUpdate(entry.id)).finally(() => setIsProcessing(null)); }} className="px-3 py-2 rounded-xl bg-transparent hover:bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold transition-colors flex items-center gap-1 cursor-pointer">
                          <span className="material-symbols-outlined text-[16px]">person_off</span>
                          <span>No-Show</span>
                        </button>
                      )}

                      {entry.status === 'SEATED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                          Dining
                        </span>
                      )}
                  </div>
                </div>
              );
            })
          )}


        </div>
      </section>

      {/* RIGHT COLUMN: Real-time Floor Matrix & Efficiency */}
      <section className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Floor Status */}
        <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">Floor Status</span>
              <span className="text-xs text-slate-400">{tablesTotal} Total Tables Configured</span>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold">
              {tablesOccupied} Occupied
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {tablesRes.tables.slice(0, 4).map((t) => {
              const isCleaning = t.status === 'CLEANING';
              const isOccupied = t.status === 'OCCUPIED';
              const isAvailable = t.status === 'AVAILABLE';
              const loading = isProcessing === `table-${t.id}`;

              let borderCls = 'border-white/5';
              let dotCls = 'bg-slate-500';
              let pillCls = 'bg-[#1A2333] border-white/5 text-slate-400';
              
              if (isCleaning) {
                borderCls = 'border-rose-500/30 bg-rose-500/5';
                dotCls = 'bg-rose-500';
                pillCls = 'bg-rose-500/20 border-rose-500/30 text-rose-400';
              } else if (isOccupied) {
                borderCls = 'border-primary/30 bg-primary/5';
                dotCls = 'bg-primary';
                pillCls = 'bg-primary/20 border-primary/30 text-primary';
              }

              return (
                <div key={t.id} className={`rounded-2xl border p-4 flex flex-col items-center text-center ${borderCls} ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-full flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Table</span>
                    <span className={`w-2 h-2 rounded-full ${dotCls}`}></span>
                  </div>
                  <span className="text-3xl font-black text-white font-headline-xl mb-3">{t.tableNumber}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border mb-2 ${pillCls}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-400 mb-4">Cap: {t.capacity} guests</span>
                  
                  {isCleaning && (
                    <div className="flex gap-1 w-full mt-2">
                      <button onClick={() => handlePingBusser(t.id)} className="flex-1 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-rose-500/30">
                        Ping
                      </button>
                      <button onClick={async () => {
                        setIsProcessing(`table-${t.id}`);
                        await updateTableStatusAction(t.id, 'AVAILABLE');
                        setIsProcessing(null);
                      }} className="flex-1 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/30">
                        Available
                      </button>
                    </div>
                  )}
                  {isOccupied && (
                    <div className="flex gap-1 w-full mt-2">
                      <Link href={`/dashboard/orders`} className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-primary text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-primary/30">
                        Order
                      </Link>
                      <button onClick={async () => {
                        setIsProcessing(`table-${t.id}`);
                        await updateTableStatusAction(t.id, 'CLEANING');
                        setIsProcessing(null);
                      }} className="flex-1 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-rose-500/30">
                        Clean
                      </button>
                    </div>
                  )}
                  {isAvailable && (
                    <div className="flex gap-1 w-full mt-2">
                      <Link href={`/dashboard/tables`} className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/30">
                        View
                      </Link>
                      <button onClick={async () => {
                        setIsProcessing(`table-${t.id}`);
                        await updateTableStatusAction(t.id, 'OCCUPIED');
                        setIsProcessing(null);
                      }} className="flex-1 py-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-primary/30">
                        Occupy
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Link href="/dashboard/tables" className="w-full mt-2 py-3 rounded-xl bg-[#1A2333] hover:bg-white/5 border border-white/5 text-slate-300 text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            Manage Tables Map <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>


        
      </section>

    </div>
  );
}
