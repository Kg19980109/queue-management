import 'server-only';
import { NextResponse } from 'next/server';
import { checkRateLimit, RateLimitEndpointClass, getClientIp, generateQueueJoinIdentifier } from '@/lib/rate-limit';
import { QueueService } from '@/lib/services/queue-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { logger } from '@/lib/logging/logger';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const formData = await request.formData();
    const restaurantId = formData.get('restaurantId') as string;
    const restaurantSlug = formData.get('restaurantSlug') as string;
    const customerName = (formData.get('customerName') as string || '').trim();
    const customerPhone = (formData.get('customerPhone') as string || '').trim();
    const partySize = parseInt(formData.get('partySize') as string || '1', 10);

    if (!restaurantId || !restaurantSlug) {
      return NextResponse.json({ error: 'Invalid restaurant context.' }, { status: 400 });
    }

    // Rate limiting: queue join ~5 requests/minute/IP/restaurant
    // Key format: rl:queue:join:<restaurantId>:<ip> (tenant-scoped)
    const identifier = generateQueueJoinIdentifier(restaurantId, ip);

    const rateLimitConfig = {
      identifier,
      limit: 5,
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

    // Basic authorization/validation (tenant isolation, operating hours, capacity)
    const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 });
    }

    if (restaurant.queueEnabled === false) {
      return NextResponse.json({ error: 'Queue is currently disabled for this restaurant.' }, { status: 403 });
    }

    // Authoritative join — database constraint remains authoritative
    try {
      const result = await QueueService.joinQueue({
        restaurantId,
        customerName,
        customerPhone: customerPhone || undefined,
        partySize,
      });

      // Success — return token for UI redirect
      return NextResponse.json({ success: true, rawToken: result.rawToken, entryId: result.entry?.id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // Duplicate active entry — customer already waiting
      if (message.includes('DUPLICATE_ACTIVE_ENTRY')) {
        return NextResponse.json(
          { error: "You are already waiting in line for this restaurant! Check your existing ticket." },
          { status: 409 }
        );
      }
      if (message.includes('QUEUE_OUTSIDE_OPERATING_HOURS')) {
        return NextResponse.json(
          { error: 'The queue is currently closed. Please check the operating hours and try again later.' },
          { status: 400 }
        );
      }
      if (message.includes('QUEUE_PAUSED')) {
        return NextResponse.json(
          { error: 'The queue is temporarily paused. Please check back shortly.' },
          { status: 400 }
        );
      }
      if (message.includes('QUEUE_FULL')) {
        return NextResponse.json(
          { error: 'The queue is currently full. Please try again shortly.' },
          { status: 400 }
        );
      }

      // Generic error — do not expose database details
      return NextResponse.json({ error: 'Failed to join queue. Please try again.' }, { status: 500 });
    }
  } catch (err) {
    logger.error('Queue join API error', {
      operation: 'queue_join_api_error',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}