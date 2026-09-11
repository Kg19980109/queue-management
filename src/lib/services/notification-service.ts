import { createAdminClient } from '@/lib/db/supabase/admin';
import { NotificationProviderFactory } from '../notifications/notification-provider-factory';
import { NotificationType, SendNotificationPayload } from '../notifications/types';

export interface OutboxEventRecord {
  id: string;
  restaurant_id: string;
  event_type: string;
  aggregate_type: 'QUEUE' | 'ORDER' | 'PAYMENT' | 'STAFF' | 'SYSTEM';
  aggregate_id: string;
  payload: Record<string, unknown>;
  status: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export class NotificationService {
  /**
   * Processes a single outbox event into notification dispatches.
   */
  static async processOutboxEvent(event: OutboxEventRecord): Promise<void> {
    const payload = event.payload || {};
    const restaurantId = event.restaurant_id;

    // Generate human-friendly notification messages based on event type
    const notificationsToDispatch: SendNotificationPayload[] = [];

    switch (event.event_type) {
      case 'QUEUE_JOINED':
        notificationsToDispatch.push({
          restaurantId,
          queueEntryId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'QUEUE_JOINED',
          title: 'Joined Digital Queue',
          message: `You are in line! Position #${payload.position || 1}. We'll notify you as your turn approaches.`,
          metadata: payload,
        });
        break;

      case 'QUEUE_POSITION_UPDATED':
        notificationsToDispatch.push({
          restaurantId,
          queueEntryId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'QUEUE_POSITION_UPDATED',
          title: 'Queue Position Update',
          message: `Queue update: You are now #${payload.position} in line (${payload.peopleAhead} ahead).`,
          metadata: payload,
        });
        break;

      case 'QUEUE_ALMOST_TURN':
        notificationsToDispatch.push({
          restaurantId,
          queueEntryId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'QUEUE_ALMOST_TURN',
          title: "You're Getting Close!",
          message: `You are #${payload.position} in line! Please head towards the restaurant.`,
          metadata: payload,
        });
        break;

      case 'QUEUE_CALLED':
        notificationsToDispatch.push({
          restaurantId,
          queueEntryId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'QUEUE_CALLED',
          title: "It's Your Turn!",
          message: `Your table is ready! Please proceed to the host stand.`,
          metadata: payload,
        });
        break;

      case 'ORDER_PLACED':
        notificationsToDispatch.push({
          restaurantId,
          orderId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'ORDER_PLACED',
          title: 'Order Received',
          message: `Order #${payload.orderNumber || event.aggregate_id.slice(0, 6)} has been placed.`,
          metadata: payload,
        });
        break;

      case 'ORDER_READY':
        notificationsToDispatch.push({
          restaurantId,
          orderId: event.aggregate_id,
          channel: 'IN_APP',
          notificationType: 'ORDER_READY',
          title: 'Food Ready!',
          message: `Order #${payload.orderNumber || event.aggregate_id.slice(0, 6)} is cooked and ready to be served!`,
          metadata: payload,
        });
        break;

      case 'PAYMENT_SUCCEEDED':
        notificationsToDispatch.push({
          restaurantId,
          orderId: (payload.order_id as string) || undefined,
          channel: 'IN_APP',
          notificationType: 'PAYMENT_SUCCEEDED',
          title: 'Payment Successful',
          message: `Payment of ₹${payload.amount} was confirmed. Thank you!`,
          metadata: payload,
        });
        break;

      default:
        // Generic fallback
        notificationsToDispatch.push({
          restaurantId,
          channel: 'IN_APP',
          notificationType: (event.event_type as NotificationType) || 'QUEUE_POSITION_UPDATED',
          title: (payload.title as string) || event.event_type,
          message: `Notification update for ${event.aggregate_type} #${event.aggregate_id.slice(0, 6)}`,
          metadata: payload,
        });
        break;
    }

    // Dispatch through appropriate channel providers
    for (const notifPayload of notificationsToDispatch) {
      const provider = NotificationProviderFactory.getProvider(notifPayload.channel);
      const result = await provider.send(notifPayload);

      if (!result.success) {
        throw new Error(`Notification dispatch failed for channel ${notifPayload.channel}: ${result.errorMessage}`);
      }
    }
  }

  /**
   * Fetches customer in-app notifications authorized via queue_entry_id.
   */
  static async getCustomerNotificationsByQueueId(queueEntryId: string, restaurantId: string) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('queue_entry_id', queueEntryId)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch customer notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetches staff in-app notifications for restaurant dashboard.
   */
  static async getStaffNotifications(restaurantId: string, limit = 20) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch staff notifications: ${error.message}`);
    }

    return data || [];
  }
}
