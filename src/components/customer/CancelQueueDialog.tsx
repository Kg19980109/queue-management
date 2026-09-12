'use client';

import React, { useState, useTransition } from 'react';
import { cancelQueuePublicAction } from '@/app/q/actions';

interface CancelQueueDialogProps {
  token: string;
  restaurantSlug: string;
}

export function CancelQueueDialog({ token, restaurantSlug }: CancelQueueDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      await cancelQueuePublicAction(token, restaurantSlug);
      setIsOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-[#1A2234] hover:bg-red-950/30 hover:border-red-500/30 border border-white/5 rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors group w-full"
      >
        <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-red-400">logout</span>
        <span className="text-sm font-bold text-slate-300 group-hover:text-red-400">Leave Queue</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl">
            <div className="text-3xl">❓</div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Leave the Queue?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your place in line will be given up and you will need to re-join if you return.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-colors"
              >
                Keep My Spot
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isPending ? 'Cancelling...' : 'Leave Queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
