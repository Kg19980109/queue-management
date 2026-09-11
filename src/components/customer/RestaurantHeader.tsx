import React from 'react';
import type { PublicRestaurantInfo } from '@/lib/services/public-restaurant-service';

interface RestaurantHeaderProps {
  restaurant: PublicRestaurantInfo;
  waitingCount?: number;
}

export function RestaurantHeader({ restaurant, waitingCount }: RestaurantHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-2">
      {/* Logo / Initials Fallback */}
      {restaurant.logoUrl ? (
        <img
          src={restaurant.logoUrl}
          alt={restaurant.name}
          className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
        />
      ) : (
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-2xl shadow-xl shadow-emerald-500/10 tracking-wider">
          {getInitials(restaurant.name)}
        </div>
      )}

      {/* Title & Info */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {restaurant.name}
        </h1>
        {restaurant.description && (
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* Address & Live Queue Status Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
        {restaurant.address && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            📍 {restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}
          </span>
        )}

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${
            restaurant.queueEnabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              restaurant.queueEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
            }`}
          />
          {restaurant.queueEnabled ? 'Queue Open' : 'Queue Closed'}
        </span>

        {restaurant.queueEnabled && waitingCount !== undefined && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
            ⏳ {waitingCount} {waitingCount === 1 ? 'party' : 'parties'} waiting
          </span>
        )}
      </div>
    </div>
  );
}
