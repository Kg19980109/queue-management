import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { NotificationService } from '@/lib/services/notification-service';

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    const canView = await AuthorizationService.hasPermission({
      userId: authUser.id,
      restaurantId,
      permission: 'notifications.view',
    });

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Cannot view notifications for this restaurant' }, { status: 403 });
    }

    const notifications = await NotificationService.getStaffNotifications(restaurantId);

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch staff notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
