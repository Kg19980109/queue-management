'use server';

import { QueueService } from '@/lib/services/queue-service';
import { PublicRestaurantService } from '@/lib/services/public-restaurant-service';
import { redirect } from 'next/navigation';

export interface JoinQueueState {
  success?: boolean;
  error?: string;
  duplicateToken?: string;
}

export async function joinQueuePublicAction(
  _prevState: JoinQueueState | null,
  formData: FormData
): Promise<JoinQueueState> {
  const restaurantId = formData.get('restaurantId') as string;
  const restaurantSlug = formData.get('restaurantSlug') as string;
  const customerName = (formData.get('customerName') as string || '').trim();
  const customerPhone = (formData.get('customerPhone') as string || '').trim();
  const partySize = parseInt((formData.get('partySize') as string) || '1', 10);

  if (!restaurantId || !restaurantSlug) {
    return { error: 'Invalid restaurant context.' };
  }

  if (!customerName) {
    return { error: 'Please enter your name.' };
  }

  try {
    const result = await QueueService.joinQueue({
      restaurantId,
      customerName,
      customerPhone: customerPhone || undefined,
      partySize,
    });

    redirect(`/q/${restaurantSlug}/status/${result.rawToken}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('QUEUE_CLOSED')) {
      return { error: 'The queue for this restaurant is currently closed. Please check back later.' };
    }
    if (message.includes('QUEUE_FULL')) {
      return { error: 'The queue is currently at maximum capacity. Please try again shortly.' };
    }
    if (message.includes('DUPLICATE_ACTIVE_ENTRY')) {
      return {
        error: "You are already waiting in line for this restaurant! Check your existing ticket.",
      };
    }
    if (message.includes('INVALID_PARTY_SIZE')) {
      return { error: 'The selected party size is not accepted by this restaurant.' };
    }

    return { error: message || 'Failed to join queue. Please try again.' };
  }
}

export async function cancelQueuePublicAction(token: string, restaurantSlug: string): Promise<void> {
  try {
    const status = await QueueService.getQueueStatusByToken(token);
    if (!status) {
      throw new Error('Queue entry not found.');
    }

    const restaurant = await PublicRestaurantService.getPublicRestaurantBySlug(restaurantSlug);
    if (!restaurant || restaurant.id !== status.restaurantId) {
      throw new Error('Tenant isolation mismatch.');
    }

    await QueueService.updateQueueStatus({
      entryId: status.entryId,
      newStatus: 'CANCELLED',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to cancel queue entry.');
  }

  redirect(`/q/${restaurantSlug}/status/${token}?cancelled=true`);
}
