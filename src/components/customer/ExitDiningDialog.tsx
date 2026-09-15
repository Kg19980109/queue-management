'use client';

import React, { useState, useTransition, useRef, useEffect } from 'react';
import { CheckCircle2, LoaderCircle, UtensilsCrossed } from 'lucide-react';
import { exitDiningCustomerAction } from '@/app/q/actions';

interface ExitDiningDialogProps {
  token: string;
  restaurantSlug: string;
}

export function ExitDiningDialog({ token, restaurantSlug }: ExitDiningDialogProps) {
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

  const handleExit = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await exitDiningCustomerAction(token, restaurantSlug);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to complete dining exit.';
        if (msg.includes('NEXT_REDIRECT')) return;
        setError('Failed to exit dining session. Please try again.');
      }
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] cursor-pointer"
        aria-haspopup="dialog"
      >
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-400" />
        <span>Done Dining & Exit Queue</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dining-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 id="exit-dining-title" className="text-lg font-black text-white">
                  Finished Dining?
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  This will complete your ticket and free up your table for the next guests. You can join the queue again whenever you return!
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-center text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                ref={confirmRef}
                type="button"
                disabled={isPending}
                onClick={handleExit}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span>Finishing Dining...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Yes, Done Dining</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="h-10 w-full rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Still Dining / Stay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
