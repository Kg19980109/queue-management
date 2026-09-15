'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { LogOut, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cancelQueuePublicAction } from '@/app/q/actions';

interface CancelQueueDialogProps {
  token: string;
  restaurantSlug: string;
}

/**
 * Phase 4B — Cancellation stays secondary but accessible.
 *
 * Security: uses the existing secure path (`cancelQueuePublicAction` →
 * token-hash lookup → tenant cross-check → anon CANCELLED-only atomic
 * RPC). No entry/restaurant ids are sent as authorization; the raw token
 * prop is never written to browser storage. Duplicate taps are blocked
 * while the transition is pending; a backend conflict (e.g. staff just
 * seated/called the entry) surfaces a calm generic message.
 */
export function CancelQueueDialog({ token, restaurantSlug }: CancelQueueDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      confirmRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleCancel = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelQueuePublicAction(token, restaurantSlug);
        // Success redirects server-side; dialog unmounts with the page.
      } catch {
        // Race-safe: staff may have just seated/called/no-showed the entry,
        // or the ticket already left the active set. Never leak internals.
        setError('Could not leave the queue right now. Your ticket may have just changed — please check its status.');
      }
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-slate-400 transition-colors hover:border-rose-500/30 hover:text-rose-300"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        Leave queue
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isPending) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-desc"
            className="w-full max-w-sm space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <TriangleAlert aria-hidden="true" className="mx-auto h-9 w-9 text-amber-400" />
            <div className="space-y-1.5">
              <h3 id="cancel-dialog-title" className="text-lg font-bold text-white">
                Leave the queue?
              </h3>
              <p id="cancel-dialog-desc" className="text-[13px] leading-relaxed text-slate-400">
                You&apos;ll lose your place and won&apos;t be able to recover
                this ticket. If your table is close, consider staying.
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
                {error}
              </p>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="h-12 flex-1 rounded-2xl bg-slate-800 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                Keep my place
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 text-xs font-bold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {isPending ? 'Leaving…' : 'Leave queue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
