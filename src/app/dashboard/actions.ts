'use server';

import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { ZoneService } from '@/lib/services/zone-service';
import { TableService } from '@/lib/services/table-service';
import { MenuService } from '@/lib/services/menu-service';
import { InventoryService } from '@/lib/services/inventory-service';
import { RecipeService } from '@/lib/services/recipe-service';
import { QueueService } from '@/lib/services/queue-service';
import { OrderService } from '@/lib/services/order-service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { TableStatus, ZoneStatus, InventoryUnit, QueueStatus } from '@/types/database.types';

export async function updateProfileFormAction(_prevState: unknown, formData: FormData) {
  try {
    const input = {
      name: formData.get('name') as string,
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

    await RestaurantAdminService.updateRestaurantProfile(input);
    redirect('/dashboard/profile?updated=true');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update restaurant profile.',
    };
  }
}

export async function createStaffFormAction(_prevState: unknown, formData: FormData) {
  try {
    const input = {
      email: formData.get('email') as string,
      displayName: formData.get('displayName') as string,
    };

    await RestaurantAdminService.createStaff(input);
    redirect('/dashboard/staff');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create staff member.',
    };
  }
}

export async function updateStaffStatusAction(targetUserId: string, newStatus: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  try {
    await RestaurantAdminService.updateStaffStatus(targetUserId, newStatus);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update staff status.');
  }
  revalidatePath('/dashboard/staff');
}

export async function createZoneFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      sortOrder: parseInt((formData.get('sortOrder') as string) || '0', 10),
    };

    await ZoneService.createZone(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to create zone.');
  }
  revalidatePath('/dashboard/zones');
}

export async function updateZoneStatusAction(zoneId: string, status: ZoneStatus): Promise<void> {
  try {
    await ZoneService.updateZone(zoneId, { status });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update zone status.');
  }
  revalidatePath('/dashboard/zones');
}

export async function createTableFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      tableNumber: formData.get('tableNumber') as string,
      capacity: parseInt((formData.get('capacity') as string) || '2', 10),
      zoneId: (formData.get('zoneId') as string) || undefined,
    };

    await TableService.createTable(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to create table.');
  }
  revalidatePath('/dashboard/tables');
}

export async function bulkCreateTableFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      zoneId: formData.get('zoneId') as string,
      prefix: (formData.get('prefix') as string) || '',
      startNumber: parseInt((formData.get('startNumber') as string) || '1', 10),
      count: parseInt((formData.get('count') as string) || '10', 10),
      capacity: parseInt((formData.get('capacity') as string) || '4', 10),
    };

    await TableService.bulkCreateTables(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed bulk table creation.');
  }
  revalidatePath('/dashboard/tables');
}

export async function updateTableStatusAction(
  tableId: string,
  targetStatus: TableStatus,
  currentStatus?: TableStatus
): Promise<void> {
  try {
    await TableService.updateTableStatus(tableId, targetStatus, currentStatus);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update table status.');
  }
  revalidatePath('/dashboard', 'layout');
}

export async function adminAddQueueGuestAction(formData: FormData): Promise<void> {
  try {
    const { restaurantId } = await RestaurantAdminService.getAuthorizedRestaurantContext();
    const customerName = formData.get('customerName') as string;
    const customerPhone = (formData.get('customerPhone') as string) || undefined;
    const partySize = parseInt((formData.get('partySize') as string) || '1', 10);

    if (!customerName) {
      throw new Error('Customer name is required.');
    }

    await QueueService.joinQueue({
      restaurantId,
      customerName,
      customerPhone,
      partySize,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to add guest to queue.');
  }
  revalidatePath('/dashboard/queue');
  revalidatePath('/dashboard');
}

export async function archiveTableAction(tableId: string): Promise<void> {
  try {
    await TableService.archiveTable(tableId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to archive table.');
  }
  revalidatePath('/dashboard/tables');
}

// --------------------------------------------------------------------------
// PHASE 7: MENU & INVENTORY SERVER ACTIONS
// --------------------------------------------------------------------------

export async function createCategoryFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || undefined,
      sortOrder: parseInt((formData.get('sortOrder') as string) || '0', 10),
    };

    await MenuService.createCategory(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to create menu category.');
  }
  revalidatePath('/dashboard/menu');
}

export async function updateCategoryStatusAction(categoryId: string, active: boolean): Promise<void> {
  try {
    await MenuService.updateCategory(categoryId, { active });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update category status.');
  }
  revalidatePath('/dashboard/menu');
}

export async function createMenuItemFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      name: formData.get('name') as string,
      categoryId: (formData.get('categoryId') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      price: parseFloat((formData.get('price') as string) || '0'),
      preparationTimeMinutes: parseInt((formData.get('preparationTimeMinutes') as string) || '15', 10),
      displayOrder: parseInt((formData.get('displayOrder') as string) || '0', 10),
      imageUrl: (formData.get('imageUrl') as string) || undefined,
    };

    await MenuService.createMenuItem(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to create menu item.');
  }
  revalidatePath('/dashboard/menu');
}

export async function updateMenuItemAvailabilityAction(itemId: string, available: boolean): Promise<void> {
  try {
    await MenuService.updateMenuItem(itemId, { available });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update item availability.');
  }
  revalidatePath('/dashboard/menu');
}

export async function archiveMenuItemAction(itemId: string): Promise<void> {
  try {
    await MenuService.archiveMenuItem(itemId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to archive menu item.');
  }
  revalidatePath('/dashboard/menu');
}

export async function createInventoryItemFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string) || undefined,
      unit: formData.get('unit') as InventoryUnit,
      openingQuantity: parseFloat((formData.get('openingQuantity') as string) || '0'),
      lowStockThreshold: parseFloat((formData.get('lowStockThreshold') as string) || '0'),
    };

    await InventoryService.createInventoryItem(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to create inventory item.');
  }
  revalidatePath('/dashboard/inventory');
}

export async function archiveInventoryItemAction(itemId: string): Promise<void> {
  try {
    await InventoryService.archiveInventoryItem(itemId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to archive inventory item.');
  }
  revalidatePath('/dashboard/inventory');
}

export async function adjustStockFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      inventoryItemId: formData.get('inventoryItemId') as string,
      movementType: formData.get('movementType') as 'PURCHASE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'WASTE' | 'CORRECTION' | 'INITIAL',
      quantity: parseFloat((formData.get('quantity') as string) || '0'),
      reason: formData.get('reason') as string,
    };

    await InventoryService.adjustStock(input);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to adjust inventory stock.');
  }
  revalidatePath('/dashboard/inventory');
}

export async function addIngredientFormAction(formData: FormData): Promise<void> {
  try {
    const input = {
      menuItemId: formData.get('menuItemId') as string,
      inventoryItemId: formData.get('inventoryItemId') as string,
      quantityRequired: parseFloat((formData.get('quantityRequired') as string) || '0'),
    };

    await RecipeService.addIngredient(input);

  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to link recipe ingredient.');
  }
  revalidatePath('/dashboard/menu');
}

export async function removeIngredientAction(ingredientId: string, _menuItemId: string): Promise<void> {
  try {
    await RecipeService.removeIngredient(ingredientId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to remove recipe ingredient.');
  }
  revalidatePath('/dashboard/menu');
}

// --------------------------------------------------------------------------
// QUEUE ACTIONS — use revalidatePath() instead of redirect() to avoid full
// browser navigations. The page data refreshes in-place (no URL change, no
// scroll-position reset, no loading bar flash).
// --------------------------------------------------------------------------

export async function updateQueueStatusAction(entryId: string, newStatus: QueueStatus, actorUserId?: string): Promise<void> {
  try {
    await QueueService.updateQueueStatus({ entryId, newStatus, actorUserId });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update queue entry status.');
  }
  revalidatePath('/dashboard/queue');
}

export async function toggleQueueOpenAction(restaurantId: string, open: boolean, actorUserId: string): Promise<void> {
  try {
    await QueueService.toggleQueueOpen(restaurantId, open, actorUserId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to toggle queue state.');
  }
  revalidatePath('/dashboard/queue');
}

export async function updateQueueSettingsFormAction(formData: FormData): Promise<void> {
  try {
    const restaurantId = formData.get('restaurantId') as string;
    const actorUserId = formData.get('actorUserId') as string;
    const settings = {
      maxQueueCapacity: parseInt((formData.get('maxQueueCapacity') as string) || '100', 10),
      minPartySize: parseInt((formData.get('minPartySize') as string) || '1', 10),
      maxPartySize: parseInt((formData.get('maxPartySize') as string) || '20', 10),
      callTimeoutMinutes: parseInt((formData.get('callTimeoutMinutes') as string) || '15', 10),
    };

    await QueueService.updateQueueSettings(restaurantId, settings, actorUserId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update queue settings.');
  }
  revalidatePath('/dashboard/queue');
}

export async function seatQueueEntryAction(entryId: string, tableId: string, actorUserId?: string): Promise<void> {
  try {
    await QueueService.seatQueueEntry(entryId, tableId, actorUserId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to seat queue entry.');
  }
  revalidatePath('/dashboard', 'layout');
}

export async function updateETASettingsFormAction(formData: FormData): Promise<void> {
  try {
    const restaurantId = formData.get('restaurantId') as string;
    const actorUserId = formData.get('actorUserId') as string;
    const settings = {
      avgServiceTimeMins: parseInt((formData.get('avgServiceTimeMins') as string) || '15', 10),
      serviceCapacityUnits: parseInt((formData.get('serviceCapacityUnits') as string) || '3', 10),
      etaBufferMins: parseInt((formData.get('etaBufferMins') as string) || '5', 10),
      almostYourTurnThreshold: parseInt((formData.get('almostYourTurnThreshold') as string) || '3', 10),
    };

    await QueueService.updateETASettings(restaurantId, settings, actorUserId);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error && String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Failed to update ETA settings.');
  }
  revalidatePath('/dashboard/queue');
}

export async function createCustomerOrderAction(input: {
  restaurantId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  queueEntryId?: string | null;
  tableId?: string | null;
  idempotencyKey?: string | null;
  items: { menuItemId: string; quantity: number; notes?: string | null }[];
}) {
  const result = await OrderService.createCustomerOrder(input);
  return result;
}

export async function updateOrderStatusAction(
  orderId: string,
  targetStatus: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
  restaurantId?: string,
  userId?: string
) {
  const updated = await OrderService.updateOrderStatus({
    orderId,
    targetStatus,
    restaurantId,
    userId,
  });
  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard/kitchen');
  return updated;
}

export async function updateKitchenStatusAction(
  orderId: string,
  targetStatus: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
  restaurantId?: string,
  userId?: string
) {
  const updated = await OrderService.updateOrderStatus({
    orderId,
    targetStatus,
    restaurantId,
    userId,
  });
  revalidatePath('/dashboard/kitchen');
  revalidatePath('/dashboard/orders');
  return updated;
}
