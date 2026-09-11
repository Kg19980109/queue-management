import React from 'react';
import Link from 'next/link';
import { InventoryService } from '@/lib/services/inventory-service';

export default async function InventoryHistoryPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const { item, movements, total } = await InventoryService.getMovementHistory(itemId, { limit: 100 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/inventory"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Inventory
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Movement Ledger History: {item.name}
          </h1>
          <p className="text-xs text-slate-400">
            Current Stock: <span className="font-mono font-bold text-emerald-400">{item.currentQuantity} {item.unit}</span> | Alert Threshold: {item.lowStockThreshold} {item.unit}
          </p>
        </div>
      </div>

      {/* Read-Only Ledger Audit Warning */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 text-amber-300 text-xs">
        <span className="font-bold">Append-Only Immutable Ledger:</span> All inventory movements are permanently recorded for auditability and compliance. Historical movement entries cannot be edited or deleted.
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Stock Movements ({total})</h2>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Movement Type</th>
                <th className="p-3">Delta</th>
                <th className="p-3">Before</th>
                <th className="p-3">After</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No movement records found for this item.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors font-mono">
                      <td className="p-3 text-slate-400 text-[11px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {m.movementType}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${m.quantityDelta}` : m.quantityDelta} {item.unit}
                      </td>
                      <td className="p-3 text-slate-400">{m.quantityBefore} {item.unit}</td>
                      <td className="p-3 text-slate-100 font-bold">{m.quantityAfter} {item.unit}</td>
                      <td className="p-3 text-slate-300 font-sans text-xs">{m.reason || '—'}</td>
                      <td className="p-3 text-slate-400 font-sans text-xs">{m.createdByUserName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
