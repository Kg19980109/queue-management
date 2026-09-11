import { NextRequest, NextResponse } from 'next/server';
import { QueueService } from '@/lib/services/queue-service';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing customer token' }, { status: 400 });
    }

    const queueStatus = await QueueService.getQueueStatusByToken(token);

    if (!queueStatus) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const notifications = await NotificationService.getCustomerNotificationsByQueueId(
      queueStatus.entryId,
      queueStatus.restaurantId
    );

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch customer notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
