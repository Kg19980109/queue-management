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
    <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 pt-2 sm:pt-4 pb-2">
      {/* Logo / Initials Fallback */}
      {restaurant.logoUrl ? (
        <img
          src={restaurant.logoUrl}
          alt={restaurant.name}
          className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
        />
      ) : (
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-xl sm:text-2xl shadow-xl shadow-emerald-500/10 tracking-wider">
          {getInitials(restaurant.name)}
        </div>
      )}

      {/* Title & Info */}
      <div className="space-y-1 px-4">
        <h1 className="text-[22px] sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
          {restaurant.name}
        </h1>
        {restaurant.description && (
          <p className="text-[13px] sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed line-clamp-2">
            {restaurant.description}
          </p>
        )}
      </div>

      {/* Address & Live Queue Status Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs px-4">
        {restaurant.address && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 backdrop-blur">
            📍 <span className="truncate max-w-[180px]">{restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}</span>
          </span>
        )}

        {restaurant.queueEnabled ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {waitingCount !== undefined ? `${waitingCount} in line` : 'Queue Open'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
            🛑 Queue Closed
          </span>
        )}
      </div>
    </div>
  );
}
