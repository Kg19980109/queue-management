'use client';

import React, { useState, useEffect } from 'react';

interface NotificationItem {
  id: string;
  notification_type: string;
  message: string;
  metadata?: {
    title?: string;
  };
  created_at: string;
}

export function CustomerNotificationBanner({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    async function fetchNotifications() {
      if (!token) return;
      try {
        const res = await fetch(`/api/customer/notifications?token=${token}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {
        // Silent fallback for network errors
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  if (notifications.length === 0 || !notifications[0]) return null;

  const latest = notifications[0];

  return (
    <div className="w-full bg-gradient-to-r from-emerald-600 to-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/30 animate-fade-in">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
        🔔
      </div>
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="font-extrabold text-xs uppercase tracking-wider text-emerald-200">
          {latest.metadata?.title || latest.notification_type}
        </div>
        <p className="text-xs font-semibold leading-snug break-words">
          {latest.message}
        </p>
      </div>
    </div>
  );
}
