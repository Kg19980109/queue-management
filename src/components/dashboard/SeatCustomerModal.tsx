'use me client';
'use client';

import React, { useState, useTransition } from 'react';
import { seatQueueEntryAction } from '@/app/dashboard/actions';

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

  const handleSeat = (tableId: string) => {
    setSelectedTableId(tableId);
    startTransition(async () => {
      await seatQueueEntryAction(entryId, tableId, userId);
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
        Seat Party
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Seat Queue Customer
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

            {seatableTables.length === 0 ? (
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
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Available Table ({seatableTables.length} available)
                </span>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {seatableTables.map((table) => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm font-mono">
                          {table.table_number}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Table {table.table_number}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {table.restaurant_zones?.name || 'Main Area'} • Capacity {table.capacity}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSeat(table.id)}
                        disabled={isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                      >
                        {isPending && selectedTableId === table.id ? 'Seating...' : 'Select & Seat'}
                      </button>
                    </div>
                  ))}
                </div>
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
