import { createAdminClient } from '@/lib/db/supabase/admin';
import { NotificationProvider } from './notification-provider.interface';
import { SendNotificationPayload, NotificationResult } from '../types';
import { NotificationChannel } from '@/types/database.types';

export class ConsoleNotificationProvider implements NotificationProvider {
  readonly channelName: NotificationChannel;

  constructor(channelName: NotificationChannel = 'SMS') {
    this.channelName = channelName;
  }

  async send(payload: SendNotificationPayload): Promise<NotificationResult> {
    const supabase = createAdminClient();
    const providerMsgId = `mock_${this.channelName.toLowerCase()}_${Date.now()}`;

    // Simulate channel dispatch log
    console.log(`[NOTIFICATION DISPATCH] Channel: ${this.channelName} | Type: ${payload.notificationType} | Recipient: ${payload.recipient || 'N/A'} | Message: "${payload.message}"`);

    const { data: record, error } = await supabase
      .from('notifications')
      .insert({
        restaurant_id: payload.restaurantId,
        queue_entry_id: payload.queueEntryId || null,
        order_id: payload.orderId || null,
        channel: this.channelName,
        notification_type: payload.notificationType,
        recipient: payload.recipient || 'console',
        status: 'SENT',
        provider: `MOCK_${this.channelName}`,
        provider_message_id: providerMsgId,
        idempotency_key: payload.idempotencyKey || null,
        message: payload.message,
        metadata: payload.metadata || {},
      })
      .select()
      .single();

    if (error || !record) {
      return {
        success: false,
        status: 'FAILED',
        errorMessage: error?.message || 'Failed to persist notification record',
      };
    }

    return {
      success: true,
      notificationId: record.id,
      providerMessageId: providerMsgId,
      status: 'SENT',
    };
  }
}
