'use client';

import { useDashboardRealtime, useTableRealtime } from '@/lib/realtime/hooks';
import { RealtimeIndicator } from './RealtimeIndicator';

export function DashboardRealtime({ restaurantId }: { restaurantId: string }) {
  const { connectionState } = useDashboardRealtime(restaurantId);
  // Also subscribe to tables for dashboard floor metrics
  useTableRealtime(restaurantId);
  return <RealtimeIndicator state={connectionState} compact />;
}

export function DashboardRealtimeSilent({ restaurantId }: { restaurantId: string }) {
  useDashboardRealtime(restaurantId);
  useTableRealtime(restaurantId);
  return null;
}
