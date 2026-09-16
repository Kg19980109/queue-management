'use client';

import React, { useState } from 'react';
import { useActionState } from 'react';
import { Ticket, ArrowRight, User, Phone, LoaderCircle, TriangleAlert } from 'lucide-react';
import { joinQueuePublicAction, JoinQueueState } from '@/app/q/actions';
import type { PublicRestaurantInfo } from '@/lib/services/public-restaurant-service';
import { PartySizeSelector } from './PartySizeSelector';
import {
  validateJoinForm,
  normalizePhoneForSubmit,
  mapJoinErrorToUX,
  type JoinFormErrors,
} from '@/lib/customer-join-ux';

interface QueueJoinFormProps {
  restaurant: PublicRestaurantInfo;
}

/**
 * Phase 4A — Mobile-first join form.
 *
 * - Client validation is instant UX only; `JoinQueueSchema` + the atomic
 *   `join_queue_atomic` RPC remain authoritative (server decides).
 * - Phone is sent trim-only so the exact-match duplicate guard keeps working.
 * - Raw tokens never touch this component: success redirects server-side
 *   to the ticket URL and the HttpOnly cookie flow takes over. No
 *   browser-side persistence of credentials anywhere in this component.
 */
export function QueueJoinForm({ restaurant }: QueueJoinFormProps) {
  const minParty = restaurant.minPartySize || 1;
  const maxParty = restaurant.maxPartySize || 20;

  const [partySize, setPartySize] = useState<number>(() => Math.min(2, maxParty));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState<JoinFormErrors>({});
  const [state, formAction, isPending] = useActionState<JoinQueueState | null, FormData>(
    joinQueuePublicAction,
    null
  );

  const serverError = state?.error ? mapJoinErrorToUX(state.error) : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isPending) {
      e.preventDefault();
      return;
    }
    const errors = validateJoinForm(
      { name, phone, partySize },
      { minParty, maxParty }
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      e.preventDefault();
    }
  }

  return (
    <section
      aria-label="Join the queue"
      className="qf-card relative space-y-4 overflow-hidden rounded-3xl p-4 sm:space-y-6 sm:p-7 mb-24 sm:mb-0"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />

      <div className="relative space-y-1.5 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-300">
          🎟️ Free · No app needed
        </p>
        <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
          Save your spot in line
        </h2>
        <p className="mx-auto max-w-[300px] px-2 text-[13px] leading-relaxed text-slate-300">
          Tell us who&apos;s coming — we&apos;ll buzz you when your table is almost ready.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center"
        >
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-200">
            <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
            {serverError.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-300/90">
            {serverError.body}
          </p>
        </div>
      )}

      <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-5">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        <input type="hidden" name="restaurantSlug" value={restaurant.slug} />
        <input type="hidden" name="partySize" value={partySize} />
        {/* Phone is normalized trim-only on the client to match server expectations. */}
        <input type="hidden" name="customerPhone" value={normalizePhoneForSubmit(phone)} />

        <PartySizeSelector
          value={partySize}
          min={minParty}
          max={maxParty}
          disabled={isPending}
          error={fieldErrors.partySize}
          onChange={(next) => {
            setPartySize(next);
            setFieldErrors((prev) => ({ ...prev, partySize: undefined }));
          }}
        />

        <div className="space-y-1.5">
          <label htmlFor="customerName" className="block text-xs font-bold uppercase tracking-widest text-white">
            Your name <span aria-hidden="true" className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <User aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
            <input
              id="customerName"
              type="text"
              name="customerName"
              required
              autoComplete="name"
              autoCapitalize="words"
              maxLength={100}
              placeholder="e.g. Rahul Sharma"
              disabled={isPending}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'customerName-error' : undefined}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-10 pr-4 text-[16px] text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 md:text-[15px]"
            />
          </div>
          {fieldErrors.name && (
            <p id="customerName-error" role="alert" className="text-xs font-semibold text-rose-300">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="customerPhoneDisplay" className="block text-xs font-bold uppercase tracking-widest text-white">
            Mobile <span className="font-semibold normal-case text-slate-500">(for updates)</span>
          </label>
          <div className="relative">
            <Phone aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500" />
            <input
              id="customerPhoneDisplay"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              disabled={isPending}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'customerPhone-error customerPhone-hint' : 'customerPhone-hint'}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-10 pr-4 text-[16px] text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 md:text-[15px]"
            />
          </div>
          <p id="customerPhone-hint" className="text-[11px] text-slate-500">
            Optional — 10-digit mobile number for status updates.
          </p>
          {fieldErrors.phone && (
            <p id="customerPhone-error" role="alert" className="text-xs font-semibold text-rose-300">
              {fieldErrors.phone}
            </p>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/10 z-50 sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:p-0">
          <button
            type="submit"
            disabled={isPending}
            className="qf-cta relative flex h-[58px] w-full max-w-md mx-auto items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 text-[15px] font-black text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
                <span role="status">Securing your spot…</span>
              </>
            ) : (
              <>
                <Ticket aria-hidden="true" className="h-5 w-5" />
                Get my ticket
                <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" />
              </>
            )}
          </button>
          <p className="text-center text-[11px] font-semibold text-slate-400 mt-2 sm:mt-3">
            ⚡ Takes ~10 seconds · Keep this page open for live updates
          </p>
        </div>
      </form>
    </section>
  );
}
