'use client';

import React, { useState, useEffect, useTransition, useOptimistic } from 'react';
import { updateKitchenStatusAction } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

export interface KitchenOrderItem {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  queueDisplayNumber?: string | null;
  tableId?: string | null;
  createdAt: string;
  total: number;
  items: Array<{
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    notes?: string | null;
  }>;
}

interface KitchenDisplayClientProps {
  initialOrders: KitchenOrderItem[];
  restaurantId: string;
  userId: string;
}

type KitchenStatus = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

function getTicketStatusBadge(status: string) {
  switch (status) {
    case 'PLACED':    return 'bg-blue-500/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-400/30';
    case 'CONFIRMED': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 ring-1 ring-indigo-400/30';
    case 'PREPARING': return 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-1 ring-amber-400/30 animate-pulse';
    case 'READY':     return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-400/30';
    default:          return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

function getElapsedTimeMins(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(elapsedMs / 60000);
  return mins <= 0 ? 'Just now' : `${mins} min ago`;
}

/**
 * Individual kitchen ticket with its own transition + optimistic status.
 *
 * WHY PER-TICKET:
 *   The old design used ONE global isPending. Clicking "Start Preparing" on
 *   ticket A disabled ALL buttons on ALL tickets — a nightmare for busy kitchens.
 *   Now each ticket has its own transition, and status changes are INSTANT
 *   (optimistic) — no waiting for the server response to update the UI.
 */
function KitchenTicket({
  order,
  restaurantId,
  userId,
  onCompleted,
}: {
  order: KitchenOrderItem;
  restaurantId: string;
  userId: string;
  onCompleted: (orderId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(order.status);

  const handleKitchenStatus = (targetStatus: KitchenStatus) => {
    startTransition(async () => {
      // Instant visual update
      setOptimisticStatus(targetStatus);
      await updateKitchenStatusAction(order.id, targetStatus, restaurantId, userId);
      // Remove from kitchen display when served/cancelled
      if (targetStatus === 'SERVED' || targetStatus === 'CANCELLED') {
        onCompleted(order.id);
      }
    });
  };

  return (
    <div
      className={`bg-slate-900 border rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-2xl transition-all ${
        optimisticStatus === 'PREPARING'
          ? 'border-amber-500/50 shadow-amber-500/10'
          : optimisticStatus === 'READY'
          ? 'border-emerald-500/50 shadow-emerald-500/10'
          : isPending
          ? 'border-slate-600 opacity-90 scale-[0.99]'
          : 'border-slate-800'
      }`}
    >
      {/* Ticket Top */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-white text-base">
                #{order.orderNumber}
              </span>
              {order.queueDisplayNumber && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-black">
                  {order.queueDisplayNumber}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-medium">{order.customerName}</div>
          </div>

          <div className="text-right flex items-center gap-2">
            {isPending && (
              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
            )}
            <div>
              <span
                className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border transition-all ${getTicketStatusBadge(optimisticStatus)}`}
              >
                {optimisticStatus}
              </span>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                ⏱️ {getElapsedTimeMins(order.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2.5">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex items-start justify-between gap-3"
            >
              <div>
                <div className="font-bold text-white text-sm">
                  <span className="text-amber-400 font-mono font-black mr-1.5">
                    {item.quantity}×
                  </span>
                  {item.name}
                </div>
                {item.notes && (
                  <div className="text-xs text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5 mt-1">
                    Note: {item.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kitchen Action Buttons — only THIS ticket is disabled when pending */}
      <div className="border-t border-slate-800 pt-3">
        {optimisticStatus === 'PLACED' && (
          <button
            type="button"
            onClick={() => handleKitchenStatus('CONFIRMED')}
            disabled={isPending}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept Order
          </button>
        )}

        {optimisticStatus === 'CONFIRMED' && (
          <button
            type="button"
            onClick={() => handleKitchenStatus('PREPARING')}
            disabled={isPending}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Preparing 🍳
          </button>
        )}

        {optimisticStatus === 'PREPARING' && (
          <button
            type="button"
            onClick={() => handleKitchenStatus('READY')}
            disabled={isPending}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Ready 🔔
          </button>
        )}

        {optimisticStatus === 'READY' && (
          <button
            type="button"
            onClick={() => handleKitchenStatus('SERVED')}
            disabled={isPending}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Served 🍽️
          </button>
        )}
      </div>
    </div>
  );
}

export function KitchenDisplayClient({
  initialOrders,
  restaurantId,
  userId,
}: KitchenDisplayClientProps) {
  const router = useRouter();

  // Local order list — tickets disappear instantly when served/cancelled (optimistic)
  const [orders, setOrders] = useState<KitchenOrderItem[]>(initialOrders);

  // Sync when server re-renders with fresh data
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Polling — every 10s refresh server data in background
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [router]);

  // Called by a ticket when it reaches a terminal state — removes it from local list instantly
  const handleTicketCompleted = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <div className="text-5xl">👨‍🍳</div>
          <h3 className="text-lg font-bold text-white">Kitchen Ticket Queue Clear</h3>
          <p className="text-xs text-slate-400">
            There are currently no active orders waiting for preparation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => (
            <KitchenTicket
              key={order.id}
              order={order}
              restaurantId={restaurantId}
              userId={userId}
              onCompleted={handleTicketCompleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
