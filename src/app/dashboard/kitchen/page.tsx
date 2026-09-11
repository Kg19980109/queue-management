import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { OrderService } from '@/lib/services/order-service';
import { redirect } from 'next/navigation';
import { KitchenDisplayClient } from '@/components/dashboard/KitchenDisplayClient';

export default async function KitchenDisplayPage() {
  const user = await requireAuth();
  const supabase = createAdminClient();

  const { data: membership } = await supabase
    .from('restaurant_memberships')
    .select('restaurant_id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  const restaurantId = membership?.restaurant_id;

  if (!restaurantId) {
    redirect('/dashboard');
  }

  await AuthorizationService.requirePermission({
    userId: user.id,
    restaurantId,
    permission: PERMISSIONS.KITCHEN_VIEW,
  });

  const orders = await OrderService.listKitchenOrders(restaurantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🍳</span> Kitchen Operations Display (KDS)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time kitchen ticket queue (FIFO priority order).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
            Live KDS
          </span>
        </div>
      </div>

      <KitchenDisplayClient
        initialOrders={orders}
        restaurantId={restaurantId}
        userId={user.id}
      />
    </div>
  );
}
