'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateQueueStatusAction, seatQueueEntryAction, updateTableStatusAction } from '@/app/dashboard/actions';
import { broadcastCustomerQueueUpdate } from '@/lib/realtime/useCustomerQueueRealtime';
import type { TableStatus } from '@/types/database.types';

interface DashboardClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feedEntries: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tablesRes: { tables: any[] };
  activeQueueCount: number;
}

export function DashboardClient({ feedEntries, tablesRes, activeQueueCount }: DashboardClientProps) {
  const router = useRouter();
  const [feed, setFeed] = useState(feedEntries);
  const [tables, setTables] = useState(tablesRes.tables);
  const [seatingEntryId, setSeatingEntryId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Sync state when props update from server
  useEffect(() => {
    setFeed(feedEntries);
  }, [feedEntries]);

  useEffect(() => {
    setTables(tablesRes.tables);
  }, [tablesRes.tables]);

  // Seamless polling fallback so dashboard stays strictly synchronized with other screens
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);

  // Time difference in minutes
  const getWaitTimeMins = (joinedAtStr: string) => {
    if (!joinedAtStr) return 0;
    const joinedAt = new Date(joinedAtStr);
    const now = new Date();
    const diffMs = now.getTime() - joinedAt.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Sync triggers for customer realtime notifications:
  // - notified: broadcastCustomerQueueUpdate(entryId)
  // - no-show: broadcastCustomerQueueUpdate(entryId)
  const handleRecall = async (entryId: string) => {
    setIsProcessing(entryId);

    // Optimistic UI update: instantly elevate entry to CALLED
    setFeed((prev) => {
      const next = prev.map((e) => (e.id === entryId ? { ...e, status: 'CALLED', called_at: new Date().toISOString() } : e));
      const priority: Record<string, number> = { CALLED: 0, NOTIFIED: 1, WAITING: 2 };
      return next.sort((a, b) => {
        const pa = priority[a.status] ?? 9;
        const pb = priority[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime();
      });
    });

    try {
      await updateQueueStatusAction(entryId, 'CALLED');
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to call/recall customer:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handleCancel = async (entryId: string) => {
    if (!confirm('Are you sure you want to cancel this guest from the queue?')) return;
    setIsProcessing(entryId);

    // Optimistic UI update: instantly remove from feed
    setFeed((prev) => prev.filter((e) => e.id !== entryId));

    try {
      await updateQueueStatusAction(entryId, 'CANCELLED');
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to cancel queue entry:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handleSeatClick = (entryId: string) => {
    setSeatingEntryId(entryId);
  };

  const handleSeatConfirm = async (tableId: string) => {
    if (!seatingEntryId) return;
    const entryId = seatingEntryId;
    setIsProcessing(entryId);
    setSeatingEntryId(null);

    // Optimistic UI update: instantly remove guest from active feed & mark table occupied
    setFeed((prev) => prev.filter((e) => e.id !== entryId));
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status: 'OCCUPIED' } : t)));

    try {
      await seatQueueEntryAction(entryId, tableId);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to seat guest:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handleTableStatus = async (tableId: string, targetStatus: TableStatus, currentStatus?: TableStatus) => {
    setIsProcessing(`table-${tableId}`);
    // Optimistic UI update: table status immediately flips
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status: targetStatus } : t)));

    try {
      await updateTableStatusAction(tableId, targetStatus, currentStatus);
    } catch (e) {
      console.error('Failed to update table status:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handlePingBusser = async (tableId: string) => {
    await handleTableStatus(tableId, 'AVAILABLE', 'CLEANING');
  };

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE');
  const tablesTotal = tables.length;
  const tablesOccupied = tables.filter((t) => t.status === 'OCCUPIED').length;

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
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-amber-400 text-sm font-medium">No available tables right now.</p>
                  <p className="text-slate-400 text-xs mt-1">Please mark a table as available or clear an occupied table first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                  {availableTables.map((t) => {
                    const tNum = t.tableNumber || t.table_number;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSeatConfirm(t.id)}
                        className="p-4 rounded-xl border border-white/10 bg-[#111827] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-colors cursor-pointer"
                      >
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Table</div>
                        <div className="text-3xl font-black text-white font-headline-xl">{tNum}</div>
                        <div className="text-[10px] text-emerald-400 mt-2 font-medium">Cap: {t.capacity} guests</div>
                      </button>
                    );
                  })}
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
          {feed.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-white/5 p-8 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">inbox</span>
              <p className="text-slate-400">The queue is currently empty.</p>
            </div>
          ) : (
            feed.map((entry, index) => {
              const waitMins = getWaitTimeMins(entry.joined_at || entry.created_at);
              const isCalled = entry.status === 'CALLED';
              const isNotified = entry.status === 'NOTIFIED';
              const isNextUp = index === 0 && !isCalled;
              const loading = isProcessing === entry.id;
              
              const borderColor = isCalled ? 'border-emerald-500/50' : isNotified ? 'border-purple-500/40' : 'border-white/5';
              const pillColor = isCalled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : isNotified ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-white/5 border-white/10 text-white';

              const ticketNum = entry.display_number ? entry.display_number.replace('#', '') : (entry.queue_number || index + 1);

              return (
                <div key={entry.id} className={`bg-[#111827] rounded-2xl border ${borderColor} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group hover:border-white/20 transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isCalled && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>}
                  {isNotified && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500"></div>}
                  
                  <div className="flex items-start sm:items-center gap-4 sm:gap-6 pl-2 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <span className={`text-2xl font-black font-headline-xl ${isCalled ? 'text-emerald-400' : isNotified ? 'text-purple-400' : 'text-white'}`}>#{ticketNum}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${pillColor} mt-1`}>
                        {isCalled ? 'CALLED' : isNotified ? 'ARRIVING' : isNextUp ? 'NEXT UP' : 'WAITING'}
                      </span>
                    </div>
                    
                    <div className="hidden sm:block w-px h-12 bg-white/10 shrink-0"></div>
                    
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] sm:text-base font-bold text-white truncate">{entry.customer_name}</span>
                        {index === 0 && <span className="text-[9px] px-2 py-0.5 rounded bg-[#1A2333] border border-white/10 text-slate-300 font-medium shrink-0">VIP Host Guest</span>}
                        {index === 1 && <span className="text-[9px] px-2 py-0.5 rounded bg-primary/20 border border-primary/30 text-primary font-medium shrink-0">Priority</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span> {entry.party_size} guests</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline"></span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-amber-500">schedule</span> Waited {waitMins}m</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline"></span>
                        <span className={`flex items-center gap-1 ${isCalled ? 'text-emerald-400' : isNotified ? 'text-purple-400' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCalled ? 'bg-emerald-400 animate-pulse' : isNotified ? 'bg-purple-400' : 'bg-slate-500'}`}></span>
                          {isCalled ? 'SMS Sent / Called' : isNotified ? 'Notified — on the way' : 'Ready for seating'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0 shrink-0">
                    <button 
                      onClick={() => handleSeatClick(entry.id)} 
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Seat Guest</span>
                    </button>
                    <button 
                      onClick={() => handleRecall(entry.id)} 
                      disabled={loading}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1A2333] hover:bg-white/10 text-slate-300 border border-white/5 font-bold text-sm transition-colors text-center cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isCalled ? 'Recall' : 'Call Again'}
                    </button>
                    <button 
                      onClick={() => handleCancel(entry.id)} 
                      disabled={loading}
                      className="w-9 h-9 shrink-0 rounded-full bg-[#1A2333] hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Cancel entry"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
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
            {tables.slice(0, 4).map((t) => {
              const isCleaning = t.status === 'CLEANING';
              const isOccupied = t.status === 'OCCUPIED';
              const isAvailable = t.status === 'AVAILABLE';
              const loading = isProcessing === `table-${t.id}`;
              const tNum = t.tableNumber || t.table_number;

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
              } else if (isAvailable) {
                borderCls = 'border-emerald-500/30 bg-emerald-500/5';
                dotCls = 'bg-emerald-400';
                pillCls = 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
              }

              return (
                <div key={t.id} className={`rounded-2xl border p-4 flex flex-col items-center text-center ${borderCls} ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-full flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Table</span>
                    <span className={`w-2 h-2 rounded-full ${dotCls}`}></span>
                  </div>
                  <span className="text-3xl font-black text-white font-headline-xl mb-3">{tNum}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border mb-2 ${pillCls}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] text-slate-400 mb-4 font-medium">Cap: {t.capacity} guests</span>
                  
                  {isCleaning && (
                    <div className="flex gap-1 w-full mt-2">
                      <button 
                        onClick={() => handlePingBusser(t.id)} 
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-rose-500/30 cursor-pointer active:scale-95"
                      >
                        Ping
                      </button>
                      <button 
                        onClick={() => handleTableStatus(t.id, 'AVAILABLE', 'CLEANING')} 
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/30 cursor-pointer active:scale-95"
                      >
                        Available
                      </button>
                    </div>
                  )}
                  {isOccupied && (
                    <div className="flex gap-1 w-full mt-2">
                      <Link href="/dashboard/orders" className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-primary text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-primary/30">
                        Order
                      </Link>
                      <button 
                        onClick={() => handleTableStatus(t.id, 'CLEANING', 'OCCUPIED')} 
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-rose-500/30 cursor-pointer active:scale-95"
                      >
                        Clean
                      </button>
                    </div>
                  )}
                  {isAvailable && (
                    <div className="flex gap-1 w-full mt-2">
                      <Link href="/dashboard/tables" className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/30">
                        View
                      </Link>
                      <button 
                        onClick={() => handleTableStatus(t.id, 'OCCUPIED', 'AVAILABLE')} 
                        disabled={loading}
                        className="flex-1 py-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-primary/30 cursor-pointer active:scale-95"
                      >
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

