'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/db/supabase/client';
import type { RealtimeConnectionState } from './types';

/**
 * Customer queue realtime - NARROWLY SCOPED via broadcast.
 * Security: Customer is anon (no auth). Do NOT subscribe to entire restaurant queue.
 * We use a broadcast channel named `queue-entry:${entryId}` - bearer via entryId (UUID, not guessable).
 * Server/staff broadcasts to this channel after queue status changes; customer refetches authoritative status.
 * Fallback polling remains as safety net.
 */
export function useCustomerQueueRealtime(entryId: string, enabled = true) {
  const router = useRouter();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('CONNECTING');
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);

  const revalidate = useCallback(() => {
    try { router.refresh(); } catch {}
  }, [router]);

  useEffect(() => {
    if (!enabled || !entryId) {
      setConnectionState('DISCONNECTED');
      return;
    }

    let isMounted = true;
    const supabase = createBrowserClient();
    const channelName = `customer-queue:${entryId}`;
    const channel = supabase.channel(channelName);

    channel.on('broadcast', { event: 'queue_update' }, () => {
      if (!isMounted) return;
      revalidate();
    });

    channel.subscribe((status: string) => {
      if (!isMounted) return;
      if (status === 'SUBSCRIBED') {
        setConnectionState('CONNECTED');
        revalidate();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionState('ERROR');
      } else if (status === 'CLOSED') {
        setConnectionState('DISCONNECTED');
      } else {
        setConnectionState('CONNECTING');
      }
    });

    channelRef.current = channel as unknown as typeof channelRef.current;

    // Fallback: 30s polling when visible (conservative, not aggressive)
    const fallback = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) revalidate();
    }, 30000);

    const onVisibility = () => { if (document.visibilityState === 'visible') revalidate(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      clearInterval(fallback);
      document.removeEventListener('visibilitychange', onVisibility);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current as unknown as never);
        channelRef.current = null;
      }
      setConnectionState('DISCONNECTED');
    };
  }, [entryId, enabled, revalidate]);

  return { connectionState, revalidate };
}

/**
 * Helper for staff to broadcast to customer's narrow channel after queue update.
 * Call this from staff browser after successful updateQueueStatus.
 */
export async function broadcastCustomerQueueUpdate(entryId: string) {
  try {
    const supabase = createBrowserClient();
    const channel = supabase.channel(`customer-queue:${entryId}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('subscribe timeout')), 5000);
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(status));
        }
      });
    });
    await channel.send({ type: 'broadcast', event: 'queue_update', payload: { entryId } } as never);
    // Keep channel briefly to ensure delivery, then cleanup
    setTimeout(() => {
      supabase.removeChannel(channel as unknown as never);
    }, 1000);
  } catch {}
}
