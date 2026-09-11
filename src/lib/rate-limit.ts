import 'server-only';
import { redisClient } from '@/lib/redis';
import { logger } from '@/lib/logging/logger';

export interface RateLimitConfig {
  /**
   * Unique identifier for this rate limit bucket.
   * Should include tenant scope where applicable (e.g. restaurantId, IP, token).
   */
  identifier: string;
  /** Maximum allowed requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** HTTP headers to attach to the response */
  headers: Record<string, string>;
}

/**
 * Check rate limit for a given identifier using Redis (with in-memory fallback).
 * Tenant-scoped — include restaurantId or userId in the identifier to prevent
 * one restaurant's traffic from affecting another.
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const result = await redisClient.rateLimitCheck(
      config.identifier,
      config.limit,
      config.windowSeconds
    );

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        operation: 'rate_limit',
        metadata: {
          identifier: config.identifier.split(':')[0], // Log only bucket prefix, not full key
          limit: config.limit,
          window: config.windowSeconds,
        },
      });
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      headers: {
        'X-RateLimit-Limit': String(config.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Window': String(config.windowSeconds),
        ...(result.allowed ? {} : { 'Retry-After': String(config.windowSeconds) }),
      },
    };
  } catch (err) {
    // If rate limiting itself fails, allow the request and log the failure
    // This prevents rate limit infrastructure outages from taking down the application.
    logger.error('Rate limit check failed — allowing request as fail-open', {
      operation: 'rate_limit_error',
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return {
      allowed: true,
      remaining: config.limit,
      headers: {},
    };
  }
}

/**
 * Extract a best-effort client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}
