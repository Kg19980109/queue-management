import { createAdminClient } from '@/lib/db/supabase/admin';
import { NotificationProvider } from './notification-provider.interface';
import { SendNotificationPayload, NotificationResult } from '../types';

export class InAppNotificationProvider implements NotificationProvider {
  readonly channelName = 'IN_APP';

  async send(payload: SendNotificationPayload): Promise<NotificationResult> {
    const supabase = createAdminClient();

    const { data: record, error } = await supabase
      .from('notifications')
      .insert({
        restaurant_id: payload.restaurantId,
        queue_entry_id: payload.queueEntryId || null,
        order_id: payload.orderId || null,
        channel: 'IN_APP',
        notification_type: payload.notificationType,
        recipient: payload.recipient || null,
        status: 'DELIVERED',
        provider: 'IN_APP',
        provider_message_id: `inapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        idempotency_key: payload.idempotencyKey || null,
        message: payload.message,
        metadata: {
          title: payload.title || payload.notificationType,
          ...(payload.metadata || {}),
        },
      })
      .select()
      .single();

    if (error || !record) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: error?.message || 'Failed to persist in-app notification',
      };
    }

    return {
      success: true,
      notificationId: record.id,
      providerMessageId: record.provider_message_id || undefined,
      status: 'DELIVERED',
    };
  }
}
