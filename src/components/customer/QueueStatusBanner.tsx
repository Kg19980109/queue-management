import React from 'react';
import type { PublicQueueStatusResponse } from '@/lib/services/queue-service';

interface QueueStatusBannerProps {
  status: PublicQueueStatusResponse;
}

export function QueueStatusBanner({ status }: QueueStatusBannerProps) {
  const currentStatus = status.status;

  if (currentStatus === 'CALLED' || currentStatus === 'NOTIFIED') {
    return (
      <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-2 border-emerald-500/50 rounded-3xl p-6 text-center space-y-2 shadow-2xl animate-pulse">
        <div className="text-3xl">🎉</div>
        <h3 className="text-xl font-black text-emerald-300 tracking-tight">
          IT&apos;S YOUR TURN!
        </h3>
        <p className="text-xs text-emerald-200 font-medium max-w-xs mx-auto leading-relaxed">
          Please head directly to the restaurant host stand now. Your table is ready!
        </p>
      </div>
    );
  }

  if (currentStatus === 'WAITING') {
    const isNearFront = status.position !== null && status.position <= 3;

    return (
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-5 text-center space-y-1.5 shadow-lg">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
          <h3 className="text-sm font-bold text-amber-300">
            {isNearFront ? "You're almost up!" : "You're safely in the queue"}
          </h3>
        </div>
        <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
          {isNearFront
            ? "Your table is getting very close. Please head back toward the restaurant."
            : "You don't need to stand outside in line. We'll hold your spot while you relax nearby."}
        </p>
      </div>
    );
  }

  if (currentStatus === 'SEATED') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 text-center space-y-1 shadow-lg">
        <div className="text-2xl">🍽️</div>
        <h3 className="text-sm font-bold text-emerald-400">You are Seated!</h3>
        <p className="text-xs text-slate-300">Enjoy your meal at {status.restaurantName}.</p>
      </div>
    );
  }

  if (currentStatus === 'CANCELLED') {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 text-center space-y-1">
        <div className="text-2xl">🚫</div>
        <h3 className="text-sm font-bold text-slate-400">Queue Entry Cancelled</h3>
        <p className="text-xs text-slate-500">
          This queue entry has been cancelled. You can join again anytime.
        </p>
      </div>
    );
  }

  // NO_SHOW or EXPIRED
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 text-center space-y-1">
      <div className="text-2xl">⏳</div>
      <h3 className="text-sm font-bold text-slate-400">Queue Spot Expired</h3>
      <p className="text-xs text-slate-500">
        This queue spot has expired. Please speak with the host or join a new queue.
      </p>
    </div>
  );
}
