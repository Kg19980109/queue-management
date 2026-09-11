import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { NotificationWorker } from '@/lib/workers/notification-worker';
import { getEnv } from '@/lib/config/env';
import { logger } from '@/lib/logging/logger';

/**
 * CRON WORKER ENDPOINT — PROTECTED BY CRON_SECRET
 *
 * This endpoint processes the outbox event queue and dispatches notifications.
 * It MUST only be invoked by the platform scheduler (Vercel Cron, etc.) or
 * internal infrastructure using the shared CRON_SECRET bearer token.
 *
 * Public invocation is explicitly denied.
 */
async function handleCronRequest(req: NextRequest): Promise<NextResponse> {
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();

  // 1. Validate CRON_SECRET bearer token
  const env = getEnv();
  const cronSecret = env.server.CRON_SECRET;

  if (!cronSecret) {
    logger.error('CRON_SECRET is not configured — worker endpoint is disabled', {
      operation: 'cron_worker',
      correlationId,
    });
    return NextResponse.json({ error: 'Worker endpoint not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const providedSecret = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  // Constant-time comparison to prevent timing attacks
  const secretBytes = Buffer.from(cronSecret, 'utf8');
  const providedBytes = Buffer.from(providedSecret, 'utf8');

  const isValid =
    secretBytes.length === providedBytes.length &&
    timingSafeEqual(secretBytes, providedBytes);

  if (!isValid) {
    logger.warn('Unauthorized cron worker invocation rejected', {
      operation: 'cron_worker',
      correlationId,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse optional batch size limit
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    logger.info('Cron worker batch starting', {
      operation: 'cron_worker',
      correlationId,
      metadata: { limit },
    });

    const result = await NotificationWorker.runBatch(limit);

    logger.info('Cron worker batch completed', {
      operation: 'cron_worker',
      correlationId,
      metadata: {
        processed: result.processedCount,
        succeeded: result.successCount,
        failed: result.failedCount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        result,
      },
      {
        headers: { 'x-correlation-id': correlationId },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Worker execution error';
    logger.error('Cron worker batch failed', {
      operation: 'cron_worker',
      correlationId,
      metadata: { error: message },
    });
    return NextResponse.json({ error: 'Worker execution failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCronRequest(req);
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req);
}
