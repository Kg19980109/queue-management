import 'server-only';
import { NextResponse } from 'next/server';
import { checkRateLimit, RateLimitEndpointClass, fingerprintQueueToken } from '@/lib/rate-limit';
import { QueueService } from '@/lib/services/queue-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { logger } from '@/lib/logging/logger';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string;
    const restaurantSlug = formData.get('restaurantSlug') as string;

    if (!token || !restaurantSlug) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Fingerprint the raw token (SHA-256) — never store raw token in Redis key
    const tokenFingerprint = fingerprintQueueToken(token);

    // Rate limiting: queue cancel ~10 requests/minute/token
    // Key format: rl:queue:cancel:<tokenFingerprint>
    // Per-token rate limiting — the same raw token should not exist across
    // different restaurants (tokens are generated per-restaurant), so this
    // provides implicit tenant isolation without needing restaurantId upfront.
    // Changing restaurant slugs won't bypass the limit because the token
    // fingerprint is tied to the specific ticket.
    const identifier = `rl:queue:cancel:${tokenFingerprint}`;

    const rateLimitConfig = {
      identifier,
      limit: 10,
      windowSeconds: 60,
      endpointClass: RateLimitEndpointClass.STATE_CHANGING,
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
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 404 });
    }

    // Tenant isolation check
    const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(restaurantSlug);
    if (!restaurant || restaurant.id !== queueStatus.restaurantId) {
      return NextResponse.json({ error: 'Tenant isolation mismatch.' }, { status: 403 });
    }

    // Authoritative cancellation
    try {
      await QueueService.updateQueueStatus({
        entryId: queueStatus.entryId,
        newStatus: 'CANCELLED',
      });

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: message || 'Failed to cancel queue entry.' }, { status: 500 });
    }
  } catch (err) {
    logger.error('Queue cancel API error', {
      operation: 'queue_cancel_api_error',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}