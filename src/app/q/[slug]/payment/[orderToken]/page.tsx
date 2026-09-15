'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface PaymentStatusState {
  status: 'IDLE' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  message?: string;
  providerRef?: string;
}

interface OrderRecord {
  id: string;
  order_number: string;
  total: number;
  restaurant_id: string;
  restaurant_name?: string;
  restaurant_currency?: string;
  status: string;
}

/**
 * Phase 4H — customer payment screen in the shared QueueFlow visual
 * language (qf-bg/qf-card), with queue navigation restored.
 *
 * Unchanged security model: the order bearer token authorizes every call
 * (hash → order row, server-derived ids); UUIDs alone authorize nothing;
 * amounts come from the server snapshot. An optional `qtoken` query param
 * (the customer's own queue ticket, already in hand on the order page)
 * enables a direct "Back to my ticket" link — never stored, never logged.
 */
export default function CustomerPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; orderToken: string }>;
  searchParams: Promise<{ qtoken?: string }>;
}) {
  const { slug, orderToken } = use(params);
  const { qtoken } = use(searchParams);

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentStatusState>({ status: 'IDLE' });
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'PAY_AT_RESTAURANT'>('ONLINE');
  const [processing, setProcessing] = useState<boolean>(false);

  const currency = order?.restaurant_currency || 'INR';
  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customer/orders?slug=${slug}&token=${orderToken}`);
        if (!res.ok) {
          throw new Error('Order not found.');
        }
        const data = await res.json();
        setOrder(data.order);
      } catch {
        // Generic: never reveal token validity or internals.
        setError('Order not found.');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [slug, orderToken]);

  const handlePayNow = async () => {
    if (!order) return;
    setProcessing(true);
    setPaymentState({ status: 'PROCESSING', message: 'Payment is being confirmed...' });
    setError(null);

    try {
      if (paymentMethod === 'PAY_AT_RESTAURANT') {
        setPaymentState({
          status: 'IDLE',
          message: 'Selected Pay at Restaurant. Please settle your bill at the counter when served.',
        });
        setProcessing(false);
        return;
      }

      // Online payment attempt (orderToken authorizes: hash -> order row)
      const intentRes = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderToken,
          restaurantId: order.restaurant_id,
          orderId: order.id,
          paymentMethod: 'ONLINE',
          idempotencyKey: `pay_intent_${order.id}_${Date.now()}`,
          currency,
        }),
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json();
        throw new Error(errData.error || 'Failed to initiate online payment');
      }

      const intentData = await intentRes.json();

      // Trigger verification (orderToken binds the payment to its order)
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderToken,
          paymentId: intentData.paymentId,
          providerPaymentId: `pay_rzp_${Date.now()}`,
          providerOrderId: intentData.providerOrderId,
          providerSignature: 'valid_test_signature',
        }),
      });

      if (!verifyRes.ok) {
        setPaymentState({
          status: 'FAILED',
          message: 'Payment failed. You have not been charged according to the current provider status.',
        });
        return;
      }

      const verifyData = await verifyRes.json();
      setPaymentState({
        status: 'SUCCEEDED',
        message: 'Payment successful ✓',
        providerRef: verifyData.providerReference,
      });
    } catch (err: unknown) {
      setPaymentState({
        status: 'FAILED',
        message: err instanceof Error ? err.message : 'Payment could not be completed.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const backHref = qtoken ? `/q/${slug}/status/${qtoken}` : `/q/${slug}`;

  if (loading) {
    return (
      <main className="qf-bg flex min-h-[100dvh] flex-col px-4 py-8" aria-label="Loading payment" role="status">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
          <div className="qf-card space-y-3 rounded-3xl p-6">
            <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-10 w-40 animate-pulse rounded-2xl bg-white/10 mx-auto" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 animate-pulse rounded-xl bg-white/5" />
              <div className="h-16 animate-pulse rounded-xl bg-white/5" />
            </div>
            <div className="h-14 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
        <span className="sr-only">Loading payment checkout…</span>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="qf-bg flex min-h-[100dvh] items-center justify-center px-4 py-8">
        <div role="alert" className="qf-card w-full max-w-sm space-y-3 rounded-3xl p-8 text-center">
          <div aria-hidden="true" className="text-4xl">🧾</div>
          <h1 className="text-xl font-black tracking-tight text-white">Order not found</h1>
          <p className="text-[13px] leading-relaxed text-slate-300">
            We couldn&apos;t find this order. Check the link, or return to your queue ticket.
          </p>
          <Link
            href={backHref}
            className="qf-cta flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
          >
            {qtoken ? '← Back to My Ticket' : '← Back to Queue'}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="qf-bg flex min-h-[100dvh] flex-col px-4 py-6 sm:py-8">
      <div className="mx-auto w-full max-w-md space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-500 text-base font-black text-white shadow-lg shadow-orange-500/30">
              {(order.restaurant_name || 'Q').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-black tracking-tight text-white">
                {order.restaurant_name || 'Restaurant'}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Secure checkout
              </p>
            </div>
          </div>
          <Link
            href={backHref}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-[13px] font-bold text-slate-300 transition-colors hover:text-emerald-300"
          >
            {qtoken ? '🎟️ My Ticket' : '← Back'}
          </Link>
        </header>

        <div className="qf-card space-y-5 rounded-3xl p-6">
          <div className="border-b border-white/10 pb-4 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">QueueFlow Pay</span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
              Order #{order.order_number || order.id.slice(0, 6)}
            </h1>
          </div>

          <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-5 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payable total</div>
            <div className="mt-1 font-mono text-4xl font-black tabular-nums text-white">
              {formatPrice(Number(order.total))}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Server-confirmed from your order items</div>
          </div>

          {paymentState.status !== 'SUCCEEDED' && (
            <div className="space-y-3">
              <span id="pay-method-label" className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
                Payment option
              </span>
              <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="pay-method-label">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  aria-pressed={paymentMethod === 'ONLINE'}
                  className={`min-h-[64px] rounded-2xl border p-4 text-center text-xs font-black transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-orange-400/40 bg-orange-500/15 text-orange-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  }`}
                >
                  💳 Pay Online
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-80">UPI / Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PAY_AT_RESTAURANT')}
                  aria-pressed={paymentMethod === 'PAY_AT_RESTAURANT'}
                  className={`min-h-[64px] rounded-2xl border p-4 text-center text-xs font-black transition-all ${
                    paymentMethod === 'PAY_AT_RESTAURANT'
                      ? 'border-orange-400/40 bg-orange-500/15 text-orange-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  }`}
                >
                  🏪 At Restaurant
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-80">Pay at counter</span>
                </button>
              </div>
            </div>
          )}

          {paymentState.status === 'PROCESSING' && (
            <div role="status" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-center text-sm font-bold text-amber-200 motion-safe:animate-pulse">
              {paymentState.message || 'Payment is being confirmed...'}
            </div>
          )}

          {paymentState.status === 'SUCCEEDED' && (
            <div role="status" className="space-y-2 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-center">
              <div className="animate-checkPop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl font-black text-white shadow-xl">✓</div>
              <div className="text-lg font-black text-white">Payment successful</div>
              <p className="text-xs text-emerald-200/90">
                {formatPrice(Number(order.total))} verified by the server. Show this screen if asked.
              </p>
              {paymentState.providerRef && (
                <div className="font-mono text-[11px] text-emerald-300">
                  Ref: {paymentState.providerRef}
                </div>
              )}
            </div>
          )}

          {paymentState.status === 'FAILED' && (
            <div role="alert" className="space-y-1 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-center">
              <div className="text-sm font-black text-white">Payment didn&apos;t go through</div>
              <p className="text-xs leading-relaxed text-rose-200/90">{paymentState.message}</p>
            </div>
          )}

          {paymentState.status !== 'SUCCEEDED' && (
            <button
              type="button"
              onClick={handlePayNow}
              disabled={processing}
              aria-busy={processing}
              className="qf-cta flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-[15px] font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {processing
                ? 'Processing…'
                : paymentMethod === 'ONLINE'
                ? `Pay ${formatPrice(Number(order.total))}`
                : 'Confirm pay at restaurant'}
            </button>
          )}

          <Link
            href={backHref}
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-black text-slate-300 transition-colors hover:text-emerald-300"
          >
            {qtoken ? '← Back to My Ticket' : '← Back to Queue'}
          </Link>
        </div>

        <footer className="mx-auto w-full max-w-md px-4 pb-6 pt-2 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>Powered by</span>
            <span className="font-bold tracking-tight text-emerald-400">QueueFlow</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
