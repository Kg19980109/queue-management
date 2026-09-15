'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateQueueStatusAction, updateTableStatusAction, markNoShowAction, passTableToNextAction } from '@/app/dashboard/actions';
import { broadcastCustomerQueueUpdate } from '@/lib/realtime/useCustomerQueueRealtime';
import { SeatCustomerModal, SeatableTableItem } from '@/components/dashboard/SeatCustomerModal';
import { StaffQueueChatModal } from '@/components/dashboard/StaffQueueChatModal';
import { chimeEngine } from '@/lib/audio-chime';
import type { TableStatus } from '@/types/database.types';

interface DashboardClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feedEntries: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tablesRes: { tables: any[] };
  activeQueueCount: number;
  userId?: string;
  callTimeoutMinutes?: number;
}

export function DashboardClient({
  feedEntries,
  tablesRes,
  activeQueueCount,
  userId,
  callTimeoutMinutes = 15,
}: DashboardClientProps) {
  const router = useRouter();
  const [feed, setFeed] = useState(feedEntries);
  const [tables, setTables] = useState(tablesRes.tables);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [noShowMenuId, setNoShowMenuId] = useState<string | null>(null);
  const [noShowReason, setNoShowReason] = useState('STAFF_MARKED_NO_SHOW');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chatEntry, setChatEntry] = useState<any | null>(null);

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

  // Sync triggers for customer realtime notifications:
  // - notified: broadcastCustomerQueueUpdate(entryId)
  // - no-show: broadcastCustomerQueueUpdate(entryId)
  const handleNotify = async (entryId: string) => {
    setIsProcessing(entryId);
    chimeEngine.playCallChime();

    // Optimistic UI update: instantly elevate entry to NOTIFIED
    setFeed((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, status: 'NOTIFIED', notified_at: new Date().toISOString() } : e))
    );

    try {
      await updateQueueStatusAction(entryId, 'NOTIFIED', userId);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to notify customer:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handleCall = async (entryId: string) => {
    setIsProcessing(entryId);
    chimeEngine.playCallChime();

    // Optimistic UI update: instantly elevate entry to CALLED and resort to top priority
    setFeed((prev) => {
      const next = prev.map((e) =>
        e.id === entryId ? { ...e, status: 'CALLED', called_at: new Date().toISOString() } : e
      );
      const priority: Record<string, number> = { CALLED: 0, NOTIFIED: 1, WAITING: 2 };
      return next.sort((a, b) => {
        const pa = priority[a.status] ?? 9;
        const pb = priority[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime();
      });
    });

    try {
      await updateQueueStatusAction(entryId, 'CALLED', userId);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to call customer:', e);
    } finally {
      setIsProcessing(null);
      router.refresh();
    }
  };

  const handlePassToNext = async (entryId: string) => {
    setIsProcessing(entryId);
    try {
      await passTableToNextAction(entryId);
      await broadcastCustomerQueueUpdate(entryId);
      chimeEngine.playAlertChime();
      router.refresh();
    } catch (e) {
      console.error('Failed to pass table:', e);
      alert('Could not pass table to next customer.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleNoShow = async (entryId: string, reason: string) => {
    setIsProcessing(entryId);
    setNoShowMenuId(null);

    // Optimistic UI update: remove from active queue
    setFeed((prev) => prev.filter((e) => e.id !== entryId));

    try {
      const formData = new FormData();
      formData.append('entryId', entryId);
      formData.append('reason', reason);
      if (userId) formData.append('actorUserId', userId);
      await markNoShowAction(formData);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to mark no-show:', e);
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
      await updateQueueStatusAction(entryId, 'CANCELLED', userId);
      await broadcastCustomerQueueUpdate(entryId);
    } catch (e) {
      console.error('Failed to cancel queue entry:', e);
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

  // Pre-calculate seatable tables for each entry
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE') as unknown as SeatableTableItem[];
  const tablesTotal = tables.length;
  const tablesOccupied = tables.filter((t) => t.status === 'OCCUPIED').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start relative z-10">
      {/* LEFT COLUMN: Queue Feed matching Live Queue page design */}
      <section className="lg:col-span-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Live Queue Feed</h2>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-slate-400 font-mono">Real-time Stream</span>
          </div>
          <Link
            href="/dashboard/queue"
            className="text-sm font-bold text-primary hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            View All {activeQueueCount} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {feed.length === 0 ? (
            <div className="bg-[#111827] rounded-2xl border border-white/5 p-10 text-center flex flex-col items-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">inbox</span>
              <p className="text-slate-400">The queue is currently empty.</p>
            </div>
          ) : (
            feed.map((entry, index) => {
              const isWaiting = entry.status === 'WAITING';
              const isCalled = entry.status === 'CALLED';
              const isNotified = entry.status === 'NOTIFIED';
              const isSeated = entry.status === 'SEATED';
              const isNext = isWaiting && index === 0;
              const isLargeGroup = (entry.party_size || 0) >= 6;
              const loading = isProcessing === entry.id;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const anyEntry = entry as any;
              const isVIP = anyEntry.is_vip || false;
              const hasPreOrder = anyEntry.pre_order_amount && anyEntry.pre_order_amount > 0;

              // Filter tables matching party size directly from current tables state
              const seatableForParty = availableTables.filter((t) => (t.capacity || 0) >= entry.party_size);

              return (
                <div
                  key={entry.id}
                  className={`relative p-4 sm:p-5 rounded-2xl bg-[#111827] border border-white/5 shadow-md flex flex-col gap-3 overflow-hidden transition-all group hover:border-white/15 ${
                    loading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Left Status Color Band */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isSeated
                        ? 'bg-emerald-500'
                        : isNotified
                        ? 'bg-purple-500'
                        : isCalled
                        ? 'bg-blue-500'
                        : hasPreOrder
                        ? 'bg-amber-500'
                        : isNext
                        ? 'bg-blue-400'
                        : 'bg-slate-600'
                    }`}
                  ></div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-1">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Monospace Ticket Box */}
                      <div
                        className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0 shadow-sm ${
                          isSeated
                            ? 'bg-emerald-600 text-white'
                            : isNotified
                            ? 'bg-purple-600 text-white'
                            : isCalled
                            ? 'bg-blue-600 text-white'
                            : isNext
                            ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20'
                            : 'bg-[#1A2333] border border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="font-black text-xl sm:text-2xl tracking-tight font-headline-xl leading-none">
                          {entry.display_number || entry.queue_number}
                        </span>
                        {isSeated && (
                          <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Dining</span>
                        )}
                        {isNotified && (
                          <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Arriving</span>
                        )}
                        {isCalled && (
                          <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Priority</span>
                        )}
                        {isNext && (
                          <span className="text-[8px] uppercase tracking-widest font-bold mt-0.5">Next</span>
                        )}
                        {isWaiting && !isNext && (
                          <span className="text-[8px] uppercase tracking-widest mt-0.5">#{index + 1}</span>
                        )}
                      </div>

                      {/* Guest Details */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[16px] sm:text-lg font-bold text-white truncate">
                            {entry.customer_name}
                          </span>
                          {isVIP && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/30 shrink-0">
                              <span
                                className="material-symbols-outlined text-[12px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              VIP
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm text-slate-400 truncate">
                          {entry.customer_phone || 'No phone'} • {entry.party_size} guests{' '}
                          {isLargeGroup ? '• Large group' : ''}
                        </span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {new Date(entry.joined_at || entry.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isCalled && entry.called_at && (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${(() => {
                                const age = Date.now() - new Date(entry.called_at).getTime();
                                const timeoutMs = callTimeoutMinutes * 60 * 1000;
                                const remaining = timeoutMs - age;
                                if (remaining <= 0) return 'bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse';
                                if (remaining <= 2 * 60 * 1000)
                                  return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
                                return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                              })()}`}
                            >
                              {(() => {
                                const ageMins = Math.floor((Date.now() - new Date(entry.called_at).getTime()) / 60000);
                                const remaining = callTimeoutMinutes - ageMins;
                                if (remaining <= 0) return `Overdue ${Math.abs(remaining)}m`;
                                if (remaining <= 2) return `Timeout in ${remaining}m`;
                                return `Called ${ageMins}m ago`;
                              })()}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-widest font-bold shrink-0 ${
                              isSeated
                                ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'
                                : isNotified
                                ? 'bg-purple-900/30 border-purple-500/30 text-purple-400'
                                : isCalled
                                ? 'bg-blue-900/30 border-blue-500/30 text-blue-400'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </div>

                        {/* Customer Late Alert Banner */}
                        {entry.lateInfo?.isLate && (
                          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                            <span className="material-symbols-outlined text-[15px] text-amber-400">schedule</span>
                            <span className="font-bold">Running Late (+{entry.lateInfo.delayMinutes || 10}m)</span>
                            {entry.lateInfo.note && (
                              <span className="text-[11px] text-amber-200/80 truncate">· &ldquo;{entry.lateInfo.note}&rdquo;</span>
                            )}
                            {entry.lateInfo.tablePassedToNext && (
                              <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40">
                                Table Passed · Spot Held
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Pill on the Right */}
                    <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0">
                      {isNotified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-400 text-[10px] tracking-widest uppercase font-bold">
                          NOTIFIED
                        </span>
                      )}
                      {isCalled && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-[10px] tracking-widest uppercase font-bold">
                          CALLED
                        </span>
                      )}
                      {isWaiting && (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] tracking-widest uppercase font-bold border ${
                            isNext
                              ? 'bg-blue-900/30 border-blue-500/30 text-blue-400'
                              : 'bg-transparent border-white/10 text-slate-400'
                          }`}
                        >
                          WAITING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION RIBBON: Identical to Live Queue page */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-white/5 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl bg-[#0A0E17]/40">
                    {(isCalled || hasPreOrder || anyEntry.notes) && (
                      <div className="flex items-center gap-2 text-xs">
                        {isCalled && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Ready to be
                            seated
                          </span>
                        )}
                        {hasPreOrder && <span className="text-slate-400">Dishes ready</span>}
                        {anyEntry.notes && <span className="text-slate-400 truncate">{anyEntry.notes}</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2 w-full">
                      {/* Step 1: WAITING -> Notify */}
                      {isWaiting && (
                        <button
                          type="button"
                          onClick={() => handleNotify(entry.id)}
                          disabled={loading}
                          className="col-span-2 sm:col-span-1 px-5 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          Notify — Almost Ready
                        </button>
                      )}

                      {/* Step 2: NOTIFIED -> Call */}
                      {isNotified && (
                        <button
                          type="button"
                          onClick={() => handleCall(entry.id)}
                          disabled={loading}
                          className="col-span-2 sm:col-span-1 px-5 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          Call — Table Ready
                        </button>
                      )}

                      {/* Step 3: CALLED -> Assign Table & Seat (AI recommendation engine with multi-table combine) */}
                      {isCalled && (
                        <div className="col-span-2 sm:col-span-1">
                          <SeatCustomerModal
                            entryId={entry.id}
                            customerName={entry.customer_name}
                            displayNumber={entry.display_number}
                            partySize={entry.party_size}
                            userId={userId || ''}
                            seatableTables={seatableForParty}
                            allAvailableTables={availableTables}
                            onSeated={async (tableId, additionalIds) => {
                              chimeEngine.playSeatChime();
                              // Optimistic remove seated guest and mark table(s) occupied
                              setFeed((prev) => prev.filter((e) => e.id !== entry.id));
                              const allIds = [tableId, ...(additionalIds || [])];
                              setTables((prev) =>
                                prev.map((t) => (allIds.includes(t.id) ? { ...t, status: 'OCCUPIED' } : t))
                              );
                              await broadcastCustomerQueueUpdate(entry.id);
                              router.refresh();
                            }}
                          />
                        </div>
                      )}

                      {/* Step 3: CALLED -> No-Show */}
                      {isCalled && (
                        <div className="col-span-2 sm:col-span-1 flex items-center gap-1 relative">
                          {noShowMenuId === entry.id ? (
                            <div className="flex items-center gap-1 w-full animate-in fade-in">
                              <select
                                value={noShowReason}
                                onChange={(e) => setNoShowReason(e.target.value)}
                                className="flex-1 min-w-0 h-11 rounded-xl bg-[#1A2333] border border-white/10 text-slate-200 text-xs font-bold px-2"
                              >
                                <option value="STAFF_MARKED_NO_SHOW">Staff marked</option>
                                <option value="CUSTOMER_DID_NOT_RETURN">Did not return</option>
                                <option value="CUSTOMER_DID_NOT_RESPOND">No response</option>
                                <option value="OTHER">Other</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleNoShow(entry.id, noShowReason)}
                                className="px-3 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setNoShowMenuId(null)}
                                className="px-2 h-11 text-slate-400 hover:text-white text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setNoShowMenuId(entry.id)}
                              className="w-full sm:w-auto px-4 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              No-Show
                            </button>
                          )}
                        </div>
                      )}

                      {/* Pass to Next Button for Late Guests */}
                      {entry.lateInfo?.isLate && !entry.lateInfo.tablePassedToNext && (
                        <button
                          type="button"
                          onClick={() => handlePassToNext(entry.id)}
                          disabled={loading}
                          className="h-11 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all active:scale-95 shadow cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                          title="Seat next guest and hold this customer's spot"
                        >
                          <span className="material-symbols-outlined text-[16px]">fast_forward</span>
                          <span>Pass to Next</span>
                        </button>
                      )}

                      {/* Chat Button */}
                      <button
                        type="button"
                        onClick={() => setChatEntry(entry)}
                        className="h-11 px-3.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                        title="Chat with customer"
                      >
                        <span className="material-symbols-outlined text-[17px] text-cyan-400">chat</span>
                        <span className="hidden sm:inline">Chat</span>
                        {entry.chatMessages && entry.chatMessages.length > 0 && (
                          <span className="h-4 min-w-4 px-1 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                            {entry.chatMessages.length}
                          </span>
                        )}
                      </button>

                      {/* Cancel Button */}
                      {(isWaiting || isNotified || isCalled) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(entry.id)}
                          disabled={loading}
                          className="h-11 w-11 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                          title="Cancel Entry"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: Real-time Floor Matrix & Table Controls */}
      <section className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 flex flex-col gap-5 shadow-sm">
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
                <div
                  key={t.id}
                  className={`rounded-2xl border p-4 flex flex-col items-center text-center ${borderCls} ${
                    loading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
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
                      <Link
                        href="/dashboard/orders"
                        className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-primary text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-primary/30"
                      >
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
                      <Link
                        href="/dashboard/tables"
                        className="flex-1 py-1.5 rounded bg-[#1A2333] hover:bg-white/10 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-500/30"
                      >
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

          <Link
            href="/dashboard/tables"
            className="w-full mt-2 py-3 rounded-xl bg-[#1A2333] hover:bg-white/5 border border-white/5 text-slate-300 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            Manage Tables Map <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>
      </section>

      {/* Staff Guest Communications Modal */}
      {chatEntry && (
        <StaffQueueChatModal
          isOpen={!!chatEntry}
          onClose={() => setChatEntry(null)}
          queueEntryId={chatEntry.id}
          customerName={chatEntry.customer_name}
          ticketDisplayNumber={
            chatEntry.display_number
              ? `Q-${chatEntry.display_number}`
              : `Q-${String(chatEntry.id || '').slice(0, 4).toUpperCase()}`
          }
          lateInfo={chatEntry.lateInfo}
          initialMessages={chatEntry.chatMessages || []}
          onActionComplete={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}


