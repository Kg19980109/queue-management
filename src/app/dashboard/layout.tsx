import React from 'react';
import Link from 'next/link';

import { signOutAction } from '@/app/login/actions';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import MobileNavigation from '@/components/dashboard/MobileNavigation';
import DesktopNavigation from '@/components/dashboard/DesktopNavigation';

export default async function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { restaurant } = await RestaurantAdminService.getRestaurantDashboardStats();
  const activeQueue = await QueueService.getActiveQueue(restaurant.id);
  const activeQueueCount = activeQueue.length;
  
  let avgWaitTime = 0;
  if (activeQueue.length > 0) {
    const totalWait = activeQueue.reduce((acc, q) => {
      const diffMs = new Date().getTime() - new Date(q.joined_at).getTime();
      return acc + Math.max(0, Math.floor(diffMs / 60000));
    }, 0);
    avgWaitTime = Math.floor(totalWait / activeQueue.length);
  }

  return (
    <>
      <DesktopNavigation activeQueueCount={activeQueueCount}>
        <form action={signOutAction} className="w-full mt-2">
          <button title="Sign Out" type="submit" className="w-full py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">logout</span> Sign Out
          </button>
        </form>
      </DesktopNavigation>

      <div className="pl-0 md:pl-64 flex flex-col min-h-screen bg-[#0A0E17] pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-[#0A0E17]/80 backdrop-blur-md border-b border-white/5 z-40 text-slate-300">
          <div className="h-16 w-full px-2 sm:px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4 lg:gap-6 shrink">
              {/* Live Sync Pill */}
              <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest hidden md:inline">Live</span>
              </div>
              
              {/* Path Breadcrumbs */}
              <div className="flex items-center gap-2 px-3 lg:px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-sm shrink">
                <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">storefront</span>
                <span className="font-semibold text-white max-w-[80px] sm:max-w-[120px] xl:max-w-[200px] truncate">{restaurant.name}</span>
                <span className="text-slate-600 hidden lg:inline shrink-0">/</span>
                <span className="text-slate-400 hidden lg:inline shrink-0">Host Station 1</span>
              </div>

              {/* Search Bar */}
              <div className="relative hidden xl:flex items-center shrink">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-48 xl:w-64 pl-4 pr-10 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all" 
                />
                <kbd className="absolute right-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-400 font-mono">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <div className="hidden 2xl:flex items-center gap-4 px-4 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">groups</span>
                  <span className="text-sm text-white font-bold">{activeQueueCount}</span>
                  <span className="text-[11px] text-slate-400">({activeQueue.reduce((a,b)=>a+b.party_size,0)} guests)</span>
                </div>
                <span className="w-px h-3 bg-white/10"></span>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">schedule</span>
                  <span className="text-[11px] text-slate-400">Avg Wait:</span>
                  <span className="text-sm text-emerald-400 font-mono font-bold">~{avgWaitTime}m</span>
                </div>
              </div>

              <Link href="/dashboard/queue">
                <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-primary hover:bg-blue-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform active:scale-95 border border-blue-400/50 group">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <span className="hidden sm:inline">Call Next</span>
                  <div className="hidden 2xl:flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-mono text-blue-200 border border-black/10">
                    SPACE <span className="material-symbols-outlined text-[10px]">keyboard_return</span>
                  </div>
                </button>
              </Link>
              
              <button className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors relative">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#0A0E17]"></span>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 flex-1 relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNavigation activeQueueCount={activeQueueCount} />
      </div>
    </>
  );
}
