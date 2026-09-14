import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';
import { checkRateLimit, RateLimitEndpointClass, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 5 payment intents per minute per IP
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit({
    identifier: `payment_intent:${ip}`,
    limit: 5,
    windowSeconds: 60,
    endpointClass: RateLimitEndpointClass.HIGH_COST,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many payment requests. Please wait a moment and try again.' },
      { status: 429, headers: rateLimit.headers }
    );
  }

  try {
    const body = await req.json();
    const { restaurantId, orderId, paymentMethod, idempotencyKey, currency } = body;

    if (!restaurantId || !orderId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required parameters: restaurantId, orderId, paymentMethod' },
        { status: 400 }
      );
    }

    const result = await PaymentService.createPaymentIntent({
      restaurantId,
      orderId,
      amount: 0, // Authoritative calculation handles this on server
      paymentMethod,
      idempotencyKey,
      currency: currency || 'INR',
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create payment intent';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
