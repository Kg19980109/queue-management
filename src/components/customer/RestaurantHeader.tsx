import React from 'react';
import { MapPin } from 'lucide-react';
import type { PublicRestaurantInfo } from '@/lib/services/public-restaurant-service';

interface RestaurantHeaderProps {
  restaurant: PublicRestaurantInfo;
  waitingCount?: number;
}

/**
 * Phase 4A — Customer restaurant header.
 * Answers "Where am I?" in ~1 second: logo, name, location, live status.
 * Decorative glow elements are aria-hidden; status pill carries text
 * (never color-only).
 */
export function RestaurantHeader({ restaurant, waitingCount }: RestaurantHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const state = restaurant.queueOperatingState || 'OPEN';
  const statusLabel = !restaurant.queueEnabled || state === 'CLOSED'
    ? 'Queue closed'
    : state === 'PAUSED'
      ? 'Queue paused'
      : state === 'CLOSING_SOON'
        ? 'Closing soon'
        : waitingCount !== undefined
          ? `${waitingCount} ${waitingCount === 1 ? 'party' : 'parties'} · Live`
          : 'Queue open';

  return (
    <header className="flex flex-col items-center space-y-3 pb-1 pt-2 text-center sm:space-y-4 sm:pt-4">
      <div className="relative">
        {restaurant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logoUrl}
            alt={`${restaurant.name} logo`}
            className="h-16 w-16 rounded-2xl border-2 border-emerald-500/30 object-cover shadow-lg shadow-emerald-500/10 sm:h-20 sm:w-20"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 text-xl font-black tracking-wider text-white shadow-xl shadow-emerald-500/20 sm:h-20 sm:w-20 sm:text-2xl"
          >
            {getInitials(restaurant.name)}
          </div>
        )}
        {restaurant.queueEnabled && state !== 'CLOSED' && (
          <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-emerald-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          </span>
        )}
      </div>

      <div className="space-y-1.5 px-4">
        <h1 className="text-[22px] font-black leading-tight tracking-tight text-white sm:text-[26px]">
          {restaurant.name}
        </h1>
        {restaurant.description && (
          <p className="mx-auto line-clamp-2 max-w-sm text-[12px] leading-relaxed text-slate-400 sm:text-[13px]">
            {restaurant.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-xs">
        {restaurant.address && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300 backdrop-blur">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
            </span>
          </span>
        )}
        <span
          role="status"
          className={
            !restaurant.queueEnabled || state === 'CLOSED'
              ? 'inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 font-bold text-rose-400'
              : state === 'PAUSED'
                ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-400'
                : state === 'CLOSING_SOON'
                  ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-400'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-400 shadow-sm shadow-emerald-500/10'
          }
        >
          {(state === 'OPEN' || state === 'CLOSING_SOON') && restaurant.queueEnabled && (
            <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
          )}
          {statusLabel}
        </span>
      </div>
    </header>
  );
}
