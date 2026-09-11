import React from 'react';
import Link from 'next/link';
import { InventoryService } from '@/lib/services/inventory-service';
import {
  createInventoryItemFormAction,
  archiveInventoryItemAction,
  adjustStockFormAction,
} from '@/app/dashboard/actions';
import type { StockState } from '@/types/database.types';

export default async function InventoryManagementPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    stockState?: StockState;
    adjustItemId?: string;
  }>;
}) {
  const params = await searchParams;
  const searchTerm = params.search || '';
  const stockStateFilter = params.stockState || undefined;

  const { items, stats, total } = await InventoryService.listInventoryItems({
    search: searchTerm,
    stockState: stockStateFilter,
    limit: 100,
  });

  const selectedAdjustItem = params.adjustItemId
    ? items.find((i) => i.id === params.adjustItemId)
    : null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-400">
            Track stock quantities, low-stock thresholds, and append-only stock movement ledger history.
          </p>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Items</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Active Items</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{stats.activeCount}</div>
        </div>

        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-950/10">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Low Stock Alert</div>
          <div className="text-3xl font-bold text-amber-400 mt-1">{stats.lowStock}</div>
        </div>

        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-950/10">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Out of Stock</div>
          <div className="text-3xl font-bold text-rose-400 mt-1">{stats.outOfStock}</div>
        </div>
      </div>

      {/* INVENTORY TABLE SECTION */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Stock Items ({total})</h2>

          {/* Search & Stock Filter */}
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="search"
              defaultValue={searchTerm}
              placeholder="Search item or SKU..."
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <select
              name="stockState"
              defaultValue={stockStateFilter || ''}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Stock States</option>
              <option value="NORMAL">Normal Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Inventory Items Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Threshold</th>
                <th className="p-3">Stock State</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-medium text-white">{item.name}</td>
                    <td className="p-3 text-slate-400 font-mono">{item.sku || '—'}</td>
                    <td className="p-3 font-mono font-bold text-slate-100">
                      {item.currentQuantity} {item.unit}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {item.lowStockThreshold} {item.unit}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded font-semibold border ${
                          item.stockState === 'OUT_OF_STOCK'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : item.stockState === 'LOW_STOCK'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {item.stockState.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <a
                        href={`/dashboard/inventory?adjustItemId=${item.id}`}
                        className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2 py-1 rounded transition-colors"
                      >
                        Adjust Stock
                      </a>
                      <Link
                        href={`/dashboard/inventory/${item.id}/history`}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                      >
                        Ledger History
                      </Link>
                      {!item.isArchived && (
                        <form
                          action={archiveInventoryItemAction.bind(null, item.id)}
                          className="inline-block"
                        >
                          <button
                            type="submit"
                            className="text-[11px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded transition-colors"
                          >
                            Archive
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Inventory Item Form Inline */}
        <details className="border-t border-slate-800 pt-4">
          <summary className="text-xs font-semibold text-emerald-400 cursor-pointer hover:underline">
            + Create New Inventory Item
          </summary>
          <form action={createInventoryItemFormAction} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Item Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Chicken, Rice, Milk"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">SKU / Code (Optional)</label>
              <input
                type="text"
                name="sku"
                placeholder="SKU-1002"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Unit of Measurement</label>
              <select
                name="unit"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="liter">liter (Liters)</option>
                <option value="ml">ml (Milliliters)</option>
                <option value="piece">piece (Pieces)</option>
                <option value="packet">packet (Packets)</option>
                <option value="box">box (Boxes)</option>
                <option value="bottle">bottle (Bottles)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Opening Stock Quantity</label>
              <input
                type="number"
                step="0.001"
                min="0"
                name="openingQuantity"
                defaultValue="0"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Low Stock Alert Threshold</label>
              <input
                type="number"
                step="0.001"
                min="0"
                name="lowStockThreshold"
                defaultValue="5"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Save Inventory Item
              </button>
            </div>
          </form>
        </details>
      </div>

      {/* STOCK ADJUSTMENT MODAL / SECTION */}
      {selectedAdjustItem && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Adjust Stock for {selectedAdjustItem.name}
              </h2>
              <p className="text-xs text-slate-400">
                Current Stock: <span className="font-mono font-bold text-white">{selectedAdjustItem.currentQuantity} {selectedAdjustItem.unit}</span>
              </p>
            </div>
            <a href="/dashboard/inventory" className="text-xs text-slate-400 hover:text-white">
              Close
            </a>
          </div>

          <form action={adjustStockFormAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="inventoryItemId" value={selectedAdjustItem.id} />

            <div>
              <label className="block text-xs text-slate-400 mb-1">Adjustment Type</label>
              <select
                name="movementType"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="PURCHASE">Purchase / Restock (+)</option>
                <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
                <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
                <option value="WASTE">Waste / Spoilage (-)</option>
                <option value="CORRECTION">Correction (+/-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Adjustment Quantity ({selectedAdjustItem.unit})
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                name="quantity"
                required
                placeholder="2.5"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Reason for Adjustment</label>
              <input
                type="text"
                name="reason"
                required
                placeholder="e.g. Weekly vendor delivery, Spoilage, Physical count correction"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Confirm Stock Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
