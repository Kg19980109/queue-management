'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { seatQueueEntryAction, recommendTablesAction } from '@/app/dashboard/actions';

export interface SeatableTableItem {
  id: string;
  table_number: string;
  capacity: number;
  restaurant_zones?: { name: string } | null;
  is_combination?: boolean;
  table_ids?: string[];
  combination_labels?: string[];
  reason?: string;
}

interface SeatCustomerModalProps {
  entryId: string;
  customerName: string;
  displayNumber: string | null;
  partySize: number;
  userId: string;
  seatableTables: SeatableTableItem[];
  allAvailableTables?: SeatableTableItem[];
  onSeated?: (tableId: string, additionalIds?: string[]) => void;
}

export function SeatCustomerModal({
  entryId,
  customerName,
  displayNumber,
  partySize,
  userId,
  seatableTables,
  allAvailableTables = [],
  onSeated,
}: SeatCustomerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [recommended, setRecommended] = useState<SeatableTableItem[] | null>(null);
  // Actual headcount confirmed at the door — defaults to expected party size.
  const [actualGuests, setActualGuests] = useState<number>(partySize);
  const [isCustomCombine, setIsCustomCombine] = useState(false);
  const [customSelectedIds, setCustomSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setActualGuests(partySize);
    setIsCustomCombine(false);
    setCustomSelectedIds([]);
    
    recommendTablesAction(entryId)
      .then((recs) => {
        setRecommended(recs.length > 0 ? (recs as unknown as SeatableTableItem[]) : seatableTables);
      })
      .catch(() => setRecommended(seatableTables));
  }, [isOpen, entryId, partySize, seatableTables]);

  const tablesToShow = recommended !== null ? recommended : seatableTables;

  const handleSeat = (tableId: string, additionalIds: string[] = []) => {
    setSelectedTableId(tableId);
    startTransition(async () => {
      await seatQueueEntryAction(entryId, tableId, userId, actualGuests, additionalIds);
      onSeated?.(tableId, additionalIds);
      setIsOpen(false);
    });
  };

  const poolTables = allAvailableTables.length > 0 ? allAvailableTables : seatableTables;
  const customSelectedTables = poolTables.filter(t => customSelectedIds.includes(t.id));
  const customTotalCapacity = customSelectedTables.reduce((sum, t) => sum + (t.capacity || 0), 0);

  const toggleCustomTable = (id: string) => {
    setCustomSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95"
      >
        Assign Table & Seat
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0D131F] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-5 shadow-2xl max-h-[90dvh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Assign Table & Seat
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {displayNumber || 'Party'} — {customerName}
                </h3>
                <span className="text-xs text-slate-400">
                  Party of {partySize} ({partySize === 1 ? 'guest' : 'guests'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {/* Actual headcount: how many guests REALLY came to eat */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shrink-0">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    Guests arrived
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Expected {partySize} — confirm actual headcount
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActualGuests((g) => Math.max(1, g - 1))}
                    disabled={isPending}
                    aria-label="Fewer guests arrived"
                    className="h-9 w-9 rounded-xl bg-slate-800 text-lg font-black text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                  >
                    −
                  </button>
                  <span aria-live="polite" className="w-8 text-center font-mono text-xl font-black text-white">
                    {actualGuests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActualGuests((g) => Math.min(50, g + 1))}
                    disabled={isPending}
                    aria-label="More guests arrived"
                    className="h-9 w-9 rounded-xl bg-emerald-600 text-lg font-black text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Mode Toggle: Smart Recommendations vs Custom Multi-Table Combine */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isCustomCombine ? 'Select Multiple Tables to Combine' : 'Smart Recommendations'}
                </span>
                {poolTables.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setIsCustomCombine(!isCustomCombine)}
                    className="text-xs text-primary hover:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isCustomCombine ? 'auto_awesome' : 'tune'}
                    </span>
                    {isCustomCombine ? 'View AI Recommendations' : 'Custom Combine'}
                  </button>
                )}
              </div>

              {/* CUSTOM COMBINE MODE */}
              {isCustomCombine ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <span className="font-bold text-white">Selected: </span>
                      <span>{customSelectedTables.length} tables ({customTotalCapacity} seats)</span>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${customTotalCapacity >= actualGuests ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {customTotalCapacity >= actualGuests ? `Fits ${actualGuests} guests` : `Need ${actualGuests - customTotalCapacity} more seats`}
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {poolTables.map((t) => {
                      const isChecked = customSelectedIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleCustomTable(t.id)}
                          className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${isChecked ? 'bg-primary/20 border-primary/40' : 'bg-[#111827] border-white/10 hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-white">Table {t.table_number}</span>
                              <span className="text-[10px] text-slate-400 ml-2">Cap: {t.capacity}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400">{t.restaurant_zones?.name || 'Floor'}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={isPending || customSelectedIds.length === 0 || customTotalCapacity < actualGuests}
                    onClick={() => {
                      const primary = customSelectedIds[0];
                      if (!primary) return;
                      handleSeat(primary, customSelectedIds.slice(1));
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 font-bold text-sm text-white shadow transition-all cursor-pointer"
                  >
                    {isPending ? 'Assigning...' : `Seat across ${customSelectedIds.length} tables (${customTotalCapacity} seats)`}
                  </button>
                </div>
              ) : (
                /* SMART RECOMMENDATIONS LIST */
                tablesToShow.length === 0 ? (
                  <div className="p-8 text-center bg-[#111827] border border-white/5 rounded-2xl space-y-2">
                    <div className="text-2xl">🚫</div>
                    <h4 className="text-sm font-bold text-rose-400">No Single Table Fits {actualGuests} Guests</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      All single tables have insufficient capacity or are occupied. Use the{' '}
                      <button
                        type="button"
                        onClick={() => setIsCustomCombine(true)}
                        className="text-purple-400 underline font-semibold hover:text-purple-300 inline"
                      >
                        Custom Combine Tables
                      </button>{' '}
                      toggle above to select multiple tables.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tablesToShow.map((table, idx) => {
                      if (table.is_combination && table.table_ids && table.table_ids.length > 0) {
                        const primaryId = table.table_ids[0];
                        if (!primaryId) return null;
                        return (
                          <div
                            key={table.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border rounded-2xl bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-10 px-2.5 rounded-xl flex items-center justify-center font-bold text-xs font-mono bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
                                {table.table_number}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                  <span>Tables {table.table_number}</span>
                                  <span className="text-[10px] font-bold text-purple-300">• Cap {table.capacity}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[9px] font-black uppercase">
                                    Combine Suggestion
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                                  {table.reason || `Combined: fits party of ${actualGuests}`}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSeat(primaryId, table.table_ids?.slice(1))}
                              disabled={isPending}
                              className="w-full sm:w-auto px-4 py-2 font-bold text-xs rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow active:scale-95 shrink-0"
                            >
                              {isPending && selectedTableId === primaryId ? 'Assigning...' : 'Seat Both Tables'}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={table.id}
                          className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all ${idx === 0 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-[#111827] border-white/5 hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm font-mono shrink-0 ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                              {table.table_number}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Table {table.table_number}</span>
                                <span className="text-[10px] font-normal text-slate-400">• Cap {table.capacity}</span>
                                {idx === 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black uppercase">Recommended</span>}
                              </div>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {table.restaurant_zones?.name || 'Main Area'} {idx === 0 ? '• Best capacity fit' : `• Rank #${idx + 1}`}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSeat(table.id)}
                            disabled={isPending}
                            className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer active:scale-95 shrink-0 ${idx === 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                          >
                            {isPending && selectedTableId === table.id ? 'Assigning...' : idx === 0 ? 'Seat — Recommended' : 'Seat'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

