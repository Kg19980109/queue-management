import React from 'react';
import { OrderService } from '@/lib/services/order-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { RestaurantHeader } from '@/components/customer/RestaurantHeader';
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
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(slug);
  const orderDetails = await OrderService.getCustomerOrderStateByToken(token);

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

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
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
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <div className="w-full max-w-md mx-auto space-y-6">
        <RestaurantHeader restaurant={restaurant} />

        {/* Order Success Header Banner */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-2xl font-bold flex items-center justify-center mx-auto">
            ✓
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              Order Placed
            </span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Order #{orderDetails.orderNumber}
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {orderDetails.status === 'SERVED'
              ? 'Your food has been served! Enjoy your meal.'
              : orderDetails.status === 'READY'
              ? 'Your order is ready!'
              : orderDetails.status === 'PREPARING'
              ? 'Your food is being prepared in the kitchen.'
              : orderDetails.status === 'CANCELLED'
              ? 'This order was cancelled.'
              : 'Your order was received and is awaiting kitchen confirmation.'}
          </p>
        </div>

        {/* FSM Progress Timeline */}
        {orderDetails.status !== 'CANCELLED' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Order Progress
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 leading-relaxed flex items-start gap-3">
          <span className="text-base">⏳</span>
          <div>
            <strong>Queue Notice</strong>: Ordering food does not mean your table is ready yet. You are still holding your place in line.
          </div>
        </div>

        {/* Order Details & Price Snapshots */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Payment Status
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ₹{Number(orderDetails.total).toFixed(2)}
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
              href={`/q/${slug}/payment/${token}`}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md"
            >
              {orderDetails.paymentStatus === 'PAID' ? 'View Receipt' : 'Pay ₹' + Number(orderDetails.total).toFixed(2)}
            </a>
          </div>
        </div>

        {/* Action Button: Back to Queue */}
        <a
          href={`/q/${slug}`}
          className="block w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs text-center transition-all shadow-lg"
        >
          ← Back to Digital Queue
        </a>
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
