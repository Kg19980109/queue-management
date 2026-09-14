import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';
import { checkRateLimit, RateLimitEndpointClass, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate limit: 10 payment verifications per minute per IP
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit({
    identifier: `payment_verify:${ip}`,
    limit: 10,
    windowSeconds: 60,
    endpointClass: RateLimitEndpointClass.HIGH_COST,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many verification requests. Please try again shortly.' },
      { status: 429, headers: rateLimit.headers }
    );
  }

  try {
    const body = await req.json();
    const { paymentId, providerPaymentId, providerOrderId, providerSignature } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
    }

    const result = await PaymentService.verifyAndProcessPayment({
      paymentId,
      providerPaymentId,
      providerOrderId,
      providerSignature,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.errorMessage || 'Payment verification failed', result },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify payment';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
