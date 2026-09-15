import React from 'react';
import { SearchX, WifiOff, AlertTriangle } from 'lucide-react';

interface CustomerErrorStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'not-found' | 'offline' | 'generic';
}

/**
 * Phase 4A — Polished, non-technical error state for customer pages.
 * Generic messages only; never renders raw DB/RPC/provider text.
 */
export function CustomerErrorState({
  title,
  body,
  actionLabel,
  onAction,
  variant = 'generic',
}: CustomerErrorStateProps) {
  const Icon =
    variant === 'not-found' ? SearchX : variant === 'offline' ? WifiOff : AlertTriangle;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div
        role="alert"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl"
      >
        <Icon aria-hidden="true" className="mx-auto h-10 w-10 text-slate-500" />
        <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
        <p className="text-[13px] leading-relaxed text-slate-400">{body}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="h-12 w-full rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
