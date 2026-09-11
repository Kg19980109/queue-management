import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { OrderService } from '@/lib/services/order-service';
import { redirect } from 'next/navigation';
import { StaffOrdersClient } from '@/components/dashboard/StaffOrdersClient';

export default async function StaffOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
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
    permission: PERMISSIONS.ORDERS_VIEW,
  });

  const orders = await OrderService.listDashboardOrders(
    restaurantId,
    params.status,
    params.search
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Order Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor customer orders, food preparation status, and table deliveries.
        </p>
      </div>

      <StaffOrdersClient
        orders={orders}
        restaurantId={restaurantId}
        userId={user.id}
        initialStatus={params.status || 'ALL'}
        initialSearch={params.search || ''}
      />
    </div>
  );
}
