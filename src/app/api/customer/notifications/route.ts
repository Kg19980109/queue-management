import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RateLimitEndpointClass, fingerprintQueueToken } from '@/lib/rate-limit';
import { QueueService } from '@/lib/services/queue-service';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing customer token' }, { status: 400 });
    }

    // Rate limiting: customer notifications ~60 requests/minute/token
    // Read-only endpoint — graceful fallback acceptable if Redis fails
    const tokenFingerprint = fingerprintQueueToken(token);

    const identifier = `rl:queue:notifications:${tokenFingerprint}`;

    const rateLimitConfig = {
      identifier,
      limit: 60,
      windowSeconds: 60,
      endpointClass: RateLimitEndpointClass.READ_ONLY,
    };

    const rateResult = await checkRateLimit(rateLimitConfig);

    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    // Token validation — database lookup (authoritative)
    const queueStatus = await QueueService.getQueueStatusByToken(token);

    if (!queueStatus) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const notifications = await NotificationService.getCustomerNotificationsByQueueId(
      queueStatus.entryId,
      queueStatus.restaurantId
    );

    // Attach rate limit headers to the response
    const response = NextResponse.json({ notifications });
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    response.headers.set('X-RateLimit-Window', '60');
    if (!rateResult.allowed) {
      response.headers.set('Retry-After', '60');
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
