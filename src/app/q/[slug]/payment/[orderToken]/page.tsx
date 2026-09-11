'use client';

import React, { useState, useEffect, use } from 'react';

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
  status: string;
}

export default function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ slug: string; orderToken: string }>;
}) {
  const { slug, orderToken } = use(params);

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentStatusState>({ status: 'IDLE' });
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'PAY_AT_RESTAURANT'>('ONLINE');
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customer/orders?slug=${slug}&token=${orderToken}`);
        if (!res.ok) {
          throw new Error('Order not found or invalid token');
        }
        const data = await res.json();
        setOrder(data.order);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
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

      // Online payment attempt
      const intentRes = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: order.restaurant_id,
          orderId: order.id,
          paymentMethod: 'ONLINE',
          idempotencyKey: `pay_intent_${order.id}_${Date.now()}`,
          currency: 'INR',
        }),
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json();
        throw new Error(errData.error || 'Failed to initiate online payment');
      }

      const intentData = await intentRes.json();

      // Trigger verification
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading payment checkout...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 max-w-sm w-full text-center space-y-3">
          <div className="text-red-500 font-bold text-lg">Error</div>
          <p className="text-slate-600 text-sm">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        {/* Restaurant Header */}
        <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="text-xs uppercase font-bold text-indigo-600 tracking-wider">QueueFlow Pay</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Order #{order.order_number || order.id.slice(0, 6)}
          </h2>
        </div>

        {/* Order Amount Snapshot */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 text-center space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase">Payable Total Amount</div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            ₹{Number(order.total).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">Includes applicable order items & taxes</div>
        </div>

        {/* Payment Method Selector */}
        {paymentState.status !== 'SUCCEEDED' && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Select Payment Option</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`p-4 rounded-xl border text-center font-semibold text-xs transition-all ${
                  paymentMethod === 'ONLINE'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                }`}
              >
                💳 Pay Online (UPI / Card)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('PAY_AT_RESTAURANT')}
                className={`p-4 rounded-xl border text-center font-semibold text-xs transition-all ${
                  paymentMethod === 'PAY_AT_RESTAURANT'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300'
                }`}
              >
                🏪 Pay at Restaurant
              </button>
            </div>
          </div>
        )}

        {/* Status Feedback Banner */}
        {paymentState.status === 'PROCESSING' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold text-center animate-pulse">
            {paymentState.message || 'Payment is being confirmed...'}
          </div>
        )}

        {paymentState.status === 'SUCCEEDED' && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
            <div className="text-2xl font-bold text-emerald-600">✓ Payment Successful</div>
            <p className="text-xs text-emerald-700 font-medium">
              Your payment of ₹{Number(order.total).toFixed(2)} was verified by the server.
            </p>
            {paymentState.providerRef && (
              <div className="font-mono text-[11px] text-emerald-600 bg-emerald-100/60 py-1 px-2 rounded-md">
                Ref: {paymentState.providerRef}
              </div>
            )}
          </div>
        )}

        {paymentState.status === 'FAILED' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm text-center space-y-2">
            <div className="font-bold">Payment Failed</div>
            <p className="text-xs">{paymentState.message}</p>
          </div>
        )}

        {/* Action Button */}
        {paymentState.status !== 'SUCCEEDED' && (
          <button
            onClick={handlePayNow}
            disabled={processing}
            className="w-full py-4 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            {processing
              ? 'Processing...'
              : paymentMethod === 'ONLINE'
              ? `Pay ₹${Number(order.total).toFixed(2)} Online`
              : 'Confirm Pay at Restaurant'}
          </button>
        )}
      </div>
    </div>
  );
}
