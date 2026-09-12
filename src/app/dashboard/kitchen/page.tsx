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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-red-900/20 to-slate-900/40 border border-white/10 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-red-500/20 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight flex items-center gap-3">
              <span>Kitchen Display</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Real-time kitchen ticket queue (FIFO priority order).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <span className="text-sm font-mono font-bold text-emerald-400 tracking-wider">
              LIVE
            </span>
          </div>
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
