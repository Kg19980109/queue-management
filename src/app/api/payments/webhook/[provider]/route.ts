import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawBody = await req.text();

    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    const result = await PaymentService.handleWebhookEvent(rawBody, headersRecord, provider);

    if (!result.success && !result.handled && result.message?.includes('signature')) {
      return NextResponse.json(
        { error: result.message || 'Webhook verification failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      received: true,
      handled: result.handled,
      duplicate: result.duplicate,
      status: result.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
