import 'server-only';
import { NextResponse } from 'next/server';
import { checkRateLimit, RateLimitEndpointClass, fingerprintQueueToken } from '@/lib/rate-limit';
import { QueueService } from '@/lib/services/queue-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { logger } from '@/lib/logging/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const restaurantSlug = searchParams.get('restaurantSlug');

    if (!token) {
      return NextResponse.json({ error: 'Missing customer token' }, { status: 400 });
    }

    // Fingerprint the raw token (SHA-256) — never store raw token in Redis key
    const tokenFingerprint = fingerprintQueueToken(token);

    // Rate limiting: queue status ~30 requests/minute/token
    // Key format: rl:queue:status:<tokenFingerprint>
    // Per-token rate limiting ensures abusive clients cannot bypass by changing IP
    const identifier = `rl:queue:status:${tokenFingerprint}`;

    const rateLimitConfig = {
      identifier,
      limit: 30, // RateLimitLimit.QUEUE_STATUS
      windowSeconds: 60,
      endpointClass: RateLimitEndpointClass.TOKEN_AUTHENTICATED,
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

    // Tenant isolation check via restaurant slug
    if (restaurantSlug) {
      const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(restaurantSlug);
      if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
      }
      if (restaurant.id !== queueStatus.restaurantId) {
        return NextResponse.json({ error: 'Access denied: ticket belongs to a different restaurant.' }, { status: 403 });
      }
    }

    return NextResponse.json({ status: queueStatus });
  } catch (err) {
    logger.error('Queue status API error', {
      operation: 'queue_status_api_error',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}