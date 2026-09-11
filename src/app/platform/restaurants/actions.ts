'use server';

import { PlatformService } from '@/lib/services/platform-service';
import type { RestaurantStatus } from '@/types/database.types';
import { redirect } from 'next/navigation';

export async function createRestaurantAction(_prevState: unknown, formData: FormData) {
  try {
    const input = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      description: (formData.get('description') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      city: (formData.get('city') as string) || undefined,
      state: (formData.get('state') as string) || undefined,
      country: (formData.get('country') as string) || undefined,
      timezone: (formData.get('timezone') as string) || 'UTC',
      currency: (formData.get('currency') as string) || 'USD',
    };

    const newRestaurant = await PlatformService.createRestaurant(input);
    redirect(`/platform/restaurants/${newRestaurant.id}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create restaurant.',
    };
  }
}

export async function updateRestaurantAction(restaurantId: string, _prevState: unknown, formData: FormData) {
  try {
    const input = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      description: (formData.get('description') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      city: (formData.get('city') as string) || undefined,
      state: (formData.get('state') as string) || undefined,
      country: (formData.get('country') as string) || undefined,
      timezone: (formData.get('timezone') as string) || undefined,
      currency: (formData.get('currency') as string) || undefined,
    };

    await PlatformService.updateRestaurant(restaurantId, input);
    redirect(`/platform/restaurants/${restaurantId}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update restaurant.',
    };
  }
}

export async function updateStatusAction(restaurantId: string, newStatus: RestaurantStatus) {
  try {
    await PlatformService.updateRestaurantStatus(restaurantId, newStatus);
    redirect(`/platform/restaurants/${restaurantId}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transition restaurant status.',
    };
  }
}

export async function assignAdminAction(restaurantId: string, _prevState: unknown, formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const displayName = formData.get('displayName') as string;

    await PlatformService.assignRestaurantAdmin({
      restaurantId,
      email,
      displayName,
    });

    redirect(`/platform/restaurants/${restaurantId}`);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign restaurant admin.',
    };
  }
}
