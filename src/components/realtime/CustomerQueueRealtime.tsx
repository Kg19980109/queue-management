'use client';

import { useCustomerQueueRealtime } from '@/lib/realtime/useCustomerQueueRealtime';
import { RealtimeIndicator } from './RealtimeIndicator';

export function CustomerQueueRealtime({ entryId, isTerminal }: { entryId: string; isTerminal?: boolean }) {
  const { connectionState } = useCustomerQueueRealtime(entryId, !isTerminal);
  // Subtle indicator for customer - only show when not connected
  if (isTerminal) return null;
  if (connectionState === 'CONNECTED') return null;
  return (
    <div className="flex justify-center py-2">
      <RealtimeIndicator state={connectionState} compact />
    </div>
  );
}
