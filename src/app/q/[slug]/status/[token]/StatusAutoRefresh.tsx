'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function StatusAutoRefresh({ intervalMs = 10000, isTerminal = false }: { intervalMs?: number; isTerminal?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (isTerminal) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          router.refresh();
        }
      }, intervalMs);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', start);
    window.addEventListener('offline', stop);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', start);
      window.removeEventListener('offline', stop);
    };
  }, [router, intervalMs, isTerminal]);

  return null;
}
