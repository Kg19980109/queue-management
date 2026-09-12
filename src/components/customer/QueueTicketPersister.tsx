'use client';

import { useEffect } from 'react';

export function QueueTicketPersister({ slug, token, isTerminal }: { slug: string; token: string; isTerminal?: boolean }) {
  useEffect(() => {
    try {
      const key = `qf_ticket_${slug}`;
      if (isTerminal) {
        localStorage.removeItem(key);
        document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
      } else {
        localStorage.setItem(key, token);
        document.cookie = `${key}=${token}; Path=/; Max-Age=86400; SameSite=Lax`;
      }
    } catch {}
  }, [slug, token, isTerminal]);
  return null;
}
