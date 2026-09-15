import React from 'react';
import Link from 'next/link';
import { OrderService } from '@/lib/services/order-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
import { customerOrderStatusCopy } from '@/lib/customer-order-ux';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);

  if (!restaurant) {
    return { title: 'Order Not Found — QueueFlow' };
  }

  return {
    title: `Order Status — ${restaurant.name} | QueueFlow`,
    description: `Track live order status for ${restaurant.name}.`,
  };
}

const ORDER_STEPS = [
  { key: 'PLACED', label: 'Placed', icon: '📝' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
  { key: 'PREPARING', label: 'Preparing', icon: '🍳' },
  { key: 'READY', label: 'Ready', icon: '🔔' },
  { key: 'SERVED', label: 'Served', icon: '🍽️' },
];

export default async function CustomerOrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ qtoken?: string }>;
}) {
  const { slug, token } = await params;
  const { qtoken } = await searchParams;

  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);
  const orderDetails = await OrderService.getCustomerOrderStateByToken(token);

  // Phase 4H: queue-aware order page. If the customer's ticket is CALLED,
  // the return instruction leads — the order never contradicts it.
  let queueCalled = false;
  if (qtoken && restaurant) {
    try {
      const qs = await QueueService.getQueueStatusByToken(qtoken);
      queueCalled = !!qs && qs.restaurantId === restaurant.id && qs.status === 'CALLED';
    } catch {
      queueCalled = false;
    }
  }

  if (!restaurant || !orderDetails) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">📦</div>
          <h1 className="text-xl font-bold text-white">Order Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            We couldn&apos;t find an active order for this token.
          </p>
        </div>
      </div>
    );
  }

  // Tenant Isolation Check
  if (orderDetails.restaurantId !== restaurant.id) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-xl font-bold text-rose-400">Access Denied</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            This order token belongs to a different restaurant. Cross-tenant access is denied.
          </p>
        </div>
      </div>
    );
  }

  // Phase 4G: restaurant's actual currency — never hardcoded.
  const currency = restaurant.currency || 'INR';
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'PLACED') return 0;
    if (status === 'CONFIRMED') return 1;
    if (status === 'PREPARING') return 2;
    if (status === 'READY') return 3;
    if (status === 'SERVED') return 4;
    return 0;
  };

  const currentStep = getStepIndex(orderDetails.status);

  return (
    <main className="qf-bg flex min-h-screen flex-col justify-between px-4 py-8 text-slate-100 selection:bg-orange-500 selection:text-white">
      <div className="mx-auto w-full max-w-md space-y-5">
        <RestaurantHeader restaurant={restaurant} />

        {queueCalled && qtoken && (
          <Link
            href={`/q/${slug}/status/${qtoken}`}
            className="flex items-center gap-3 rounded-3xl border border-sky-400/30 bg-sky-500/10 p-4 shadow-lg transition-all hover:bg-sky-500/15 active:scale-[0.99]"
          >
            <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-white">Your turn is here — please return 📢</span>
              <span className="block text-[11px] font-semibold text-sky-200/90">Your order is safe — tap to open your ticket</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-sky-300">→</span>
          </Link>
        )}

        {/* Order Success Header Banner */}
        <div className="qf-card animate-fadeUp relative space-y-3 overflow-hidden rounded-3xl p-6 text-center">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-orange-400" />
          <div className="animate-checkPop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-3xl font-black text-white shadow-xl shadow-emerald-500/40">
            ✓
          </div>
          <div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              🎉 Order confirmed
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Order #{orderDetails.orderNumber}
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-200">
            {customerOrderStatusCopy(orderDetails.status)}
          </p>
        </div>

        {/* FSM Progress Timeline */}
        {orderDetails.status !== 'CANCELLED' && (
          <div className="qf-card animate-fadeUp space-y-4 rounded-3xl p-6" style={{ animationDelay: '100ms' }}>
            <h3 className="text-center text-[11px] font-black uppercase tracking-widest text-slate-300">
              👨‍🍳 Live kitchen progress
            </h3>
            <div className="flex items-center justify-between gap-1">
              {ORDER_STEPS.map((step, idx) => {
                const isDone = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center flex-1 space-y-1.5 text-center"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-950 text-slate-600 border border-slate-800'
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        isCurrent
                          ? 'text-emerald-400 font-extrabold'
                          : isDone
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Queue Boundary Callout */}
        <div className="flex items-start gap-3 rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">
          <span className="text-xl">⏳</span>
          <div>
            <strong>Good news:</strong> ordering food doesn&apos;t affect your queue spot — your place in line is still saved! 🎟️
          </div>
        </div>

        {/* Order Details & Price Snapshots */}
        <div className="qf-card animate-fadeUp space-y-4 rounded-3xl p-6" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Order Items
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400">
              {formatPrice(orderDetails.total)}
            </span>
          </div>

          <div className="space-y-3">
            {orderDetails.items.map((item: { id: string; name: string; quantity: number; totalPrice: number; specialInstructions?: string | null }) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0"
              >
                <div>
                  <div className="font-bold text-white">
                    {item.quantity} × {item.name}
                  </div>
                  {item.specialInstructions && (
                    <div className="text-[10px] text-slate-400 italic">
                      Note: {item.specialInstructions}
                    </div>
                  )}
                </div>
                <div className="font-mono text-slate-300 font-semibold">
                  {formatPrice(item.totalPrice)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status Card (Strictly Decoupled Domain) */}
        <div className="qf-card animate-fadeUp space-y-4 rounded-3xl p-6" style={{ animationDelay: '220ms' }}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment Status
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {formatPrice(Number(orderDetails.total))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-white">
                {orderDetails.paymentStatus === 'PAID' ? '✓ Paid' : 'Pending Payment'}
              </div>
              <div className="text-xs text-slate-400">
                {orderDetails.paymentStatus === 'PAID'
                  ? 'Payment confirmed by restaurant / gateway.'
                  : 'Pay online or choose pay at restaurant.'}
              </div>
            </div>
            <a
              href={qtoken ? `/q/${slug}/payment/${token}?qtoken=${encodeURIComponent(qtoken)}` : `/q/${slug}/payment/${token}`}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md min-h-[44px] inline-flex items-center"
            >
              {orderDetails.paymentStatus === 'PAID' ? 'View Receipt' : `Pay ${formatPrice(Number(orderDetails.total))}`}
            </a>
          </div>
        </div>

        {/* Action Button: Back to Queue Ticket (never the join form) */}
        <a
          href={qtoken ? `/q/${slug}/status/${qtoken}` : `/q/${slug}`}
          className="block w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-bold text-xs text-center transition-all shadow-lg"
        >
          {qtoken ? '← Back to My Ticket' : '← Back to Digital Queue'}
        </a>
        {!qtoken && (
          <p className="text-center text-[11px] text-slate-500">
            Tip: open this page from your queue ticket to get a direct back link.
          </p>
        )}
      </div>

      <footer className="w-full max-w-md mx-auto text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Powered by</span>
          <span className="text-emerald-400 font-bold tracking-tight">QueueFlow</span>
        </div>
      </footer>
    </main>
  );
}
