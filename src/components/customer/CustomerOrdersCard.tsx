'use client';

import React from 'react';
import Link from 'next/link';
import { ReceiptText, ChevronRight } from 'lucide-react';

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
  items: { name: string; quantity: number; totalPrice: number }[];
}

interface CustomerOrdersCardProps {
  orders: CustomerOrderSummary[];
  restaurantSlug: string;
  queueToken: string;
}

const STATUS_STYLE: Record<string, string> = {
  PLACED: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  CONFIRMED: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  PREPARING: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
  READY: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  SERVED: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  CANCELLED: 'bg-slate-500/15 border-slate-600 text-slate-400',
};

/**
 * "My Orders" — shows every pre-order placed from this queue ticket.
 * Fixes the lost-order UX: previously placing an order navigated away
 * and the ticket page showed no order history.
 */
export function CustomerOrdersCard({ orders, restaurantSlug, queueToken }: CustomerOrdersCardProps) {
  if (!orders || orders.length === 0) return null;
  const menuUrl = `/q/${restaurantSlug}/menu?qtoken=${queueToken}`;

  return (
    <section
      aria-label={`My orders, ${orders.length} order${orders.length === 1 ? '' : 's'}`}
      className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl sm:p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-white">
          <ReceiptText aria-hidden="true" className="h-4 w-4 text-emerald-400" />
          My Orders ({orders.length})
        </h2>
        <Link
          href={menuUrl}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-xs font-bold text-emerald-400 hover:text-emerald-300"
        >
          + Add more <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="mt-3 space-y-2.5">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white">
                Order #{o.orderNumber}
                <span className="ml-2 text-[11px] font-semibold text-slate-400">
                  {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · ₹{Number(o.total).toFixed(2)}
                </span>
              </p>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[o.status] || STATUS_STYLE.PLACED}`}
              >
                {o.status}
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {o.paymentStatus === 'PAID' ? '✓ Paid' : 'Payment pending'}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
        Ordering does not affect your queue position — your spot is still saved.
      </p>
    </section>
  );
}
