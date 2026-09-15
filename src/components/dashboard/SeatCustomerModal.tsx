'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { seatQueueEntryAction, recommendTablesAction } from '@/app/dashboard/actions';

export interface SeatableTableItem {
  id: string;
  table_number: string;
  capacity: number;
  restaurant_zones?: { name: string } | null;
}

interface SeatCustomerModalProps {
  entryId: string;
  customerName: string;
  displayNumber: string | null;
  partySize: number;
  userId: string;
  seatableTables: SeatableTableItem[];
}

export function SeatCustomerModal({
  entryId,
  customerName,
  displayNumber,
  partySize,
  userId,
  seatableTables,
}: SeatCustomerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [recommended, setRecommended] = useState<SeatableTableItem[] | null>(null);
  // Actual headcount confirmed at the door — defaults to expected party size.
  const [actualGuests, setActualGuests] = useState<number>(partySize);

  useEffect(() => {
    if (!isOpen) return;
    setActualGuests(partySize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Fetch intelligent recommendations server-side (deterministic, DB-side)
    recommendTablesAction(entryId)
      .then((recs) => {
        const mapped = recs.map(r => ({ id: r.id, table_number: r.table_number, capacity: r.capacity, restaurant_zones: r.restaurant_zones } as unknown as SeatableTableItem));
        setRecommended(mapped.length > 0 ? mapped : seatableTables);
      })
      .catch(() => setRecommended(seatableTables));
  }, [isOpen, entryId, seatableTables]);

  const tablesToShow = recommended !== null ? recommended : seatableTables;

  const handleSeat = (tableId: string) => {
    setSelectedTableId(tableId);
    startTransition(async () => {
      await seatQueueEntryAction(entryId, tableId, userId, actualGuests);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
      >
        Assign Table & Seat
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
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
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {tablesToShow.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-2xl">🚫</div>
                <h4 className="text-sm font-bold text-rose-400">No Suitable Tables Available</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  There are no currently AVAILABLE tables with capacity of at least {partySize} guests.
                  Please mark a dining table as clean or clear an occupied table first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Actual headcount: how many guests REALLY came to eat */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
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
                      className="h-9 w-9 rounded-xl bg-slate-800 text-lg font-black text-white hover:bg-slate-700 disabled:opacity-50"
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
                      className="h-9 w-9 rounded-xl bg-emerald-600 text-lg font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Recommended — smallest sufficient table first ({tablesToShow.length} candidates)
                </span>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {tablesToShow.map((table, idx) => (
                    <div
                      key={table.id}
                      className={`flex items-center justify-between p-3.5 border rounded-2xl transition-all ${idx === 0 ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm font-mono ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                          {table.table_number}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            Table {table.table_number} <span className="text-[10px] font-normal text-slate-400">• Cap {table.capacity}</span>
                            {idx === 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black uppercase">Recommended</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {table.restaurant_zones?.name || 'Main Area'} {idx === 0 ? '• Best capacity fit' : `• Rank #${idx + 1}`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSeat(table.id)}
                        disabled={isPending}
                        className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors disabled:opacity-50 ${idx === 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                      >
                        {isPending && selectedTableId === table.id ? 'Assigning...' : idx === 0 ? 'Seat — Recommended' : 'Seat'}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Recommendation is not reservation — table re-validated atomically on Seat. Max 5 shown, ordered by capacity → table number → id.</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
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
