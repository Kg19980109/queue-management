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
    <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 pt-2 sm:pt-4 pb-1">
      {/* Logo / Initials Fallback with animated ring */}
      <div className="relative">
        {restaurant.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt={restaurant.name}
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
          />
        ) : (
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-500 p-[1.5px] shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 font-black text-xl sm:text-2xl tracking-wider">
              {getInitials(restaurant.name)}
            </div>
          </div>
        )}
        {restaurant.queueEnabled && <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center"><span className="w-2 h-2 bg-white rounded-full animate-pulse"></span></span>}
      </div>

      {/* Title & Info */}
      <div className="space-y-1.5 px-4">
        <h1 className="text-[22px] sm:text-[26px] font-black text-white tracking-tight leading-tight">
          {restaurant.name}
        </h1>
        {restaurant.description && (
          <p className="text-[12px] sm:text-[13px] text-slate-400 max-w-sm mx-auto leading-relaxed line-clamp-2">
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

        {(() => {
          const state = (restaurant as unknown as { queueOperatingState?: string }).queueOperatingState || 'OPEN';
          const enabled = restaurant.queueEnabled;
          if (!enabled || state === 'CLOSED') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">🛑 Queue Closed</span>;
          }
          if (state === 'PAUSED') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">⏸️ Paused</span>;
          }
          if (state === 'CLOSING_SOON') {
            return <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold animate-pulse">⏳ Closing Soon</span>;
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-sm shadow-emerald-500/10">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {waitingCount !== undefined ? `${waitingCount} parties • Live` : 'Queue Open'}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
