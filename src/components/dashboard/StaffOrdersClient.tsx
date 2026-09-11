'use client';

import React, { useState, useTransition } from 'react';
import { updateOrderStatusAction } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

export interface DashboardOrderItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone?: string | null;
  queueDisplayNumber?: string | null;
  tableId?: string | null;
  total: number;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    notes?: string | null;
  }>;
}

interface StaffOrdersClientProps {
  orders: DashboardOrderItem[];
  restaurantId: string;
  userId: string;
  initialStatus: string;
  initialSearch: string;
}

const STATUS_FILTERS = ['ALL', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];

export function StaffOrdersClient({
  orders,
  restaurantId,
  userId,
  initialStatus,
  initialSearch,
}: StaffOrdersClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    const url = new URL(window.location.href);
    if (status === 'ALL') {
      url.searchParams.delete('status');
    } else {
      url.searchParams.set('status', status);
    }
    router.push(url.pathname + url.search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    if (!searchQuery.trim()) {
      url.searchParams.delete('search');
    } else {
      url.searchParams.set('search', searchQuery.trim());
    }
    router.push(url.pathname + url.search);
  };

  const handleTransition = (
    orderId: string,
    targetStatus: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'
  ) => {
    startTransition(async () => {
      await updateOrderStatusAction(orderId, targetStatus, restaurantId, userId);
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CONFIRMED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'PREPARING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'READY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SERVED':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleFilterChange(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order # or customer..."
            className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-60"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <div className="text-4xl">📦</div>
          <h3 className="text-base font-bold text-white">No Orders Found</h3>
          <p className="text-xs text-slate-400">
            There are no orders matching your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-xl hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        #{order.orderNumber}
                      </span>
                      {order.queueDisplayNumber && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                          {order.queueDisplayNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                      {order.customerName}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase border ${getStatusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span>
                        <strong className="text-white font-mono">{item.quantity}×</strong>{' '}
                        {item.name}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & FSM Actions */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total ({order.itemCount} items)</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatPrice(order.total)}
                  </span>
                </div>

                {/* FSM Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {order.status === 'PLACED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTransition(order.id, 'CONFIRMED')}
                        disabled={isPending}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                      >
                        Confirm Order
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransition(order.id, 'CANCELLED')}
                        disabled={isPending}
                        className="py-2 px-3 bg-slate-800 hover:bg-rose-950 text-rose-400 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {order.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => handleTransition(order.id, 'PREPARING')}
                      disabled={isPending}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      Start Preparation
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => handleTransition(order.id, 'READY')}
                      disabled={isPending}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      Mark Ready
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => handleTransition(order.id, 'SERVED')}
                      disabled={isPending}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                    >
                      Mark Served ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
