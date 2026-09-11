import React from 'react';
import Link from 'next/link';

import { signOutAction } from '@/app/login/actions';
import { QueueService } from '@/lib/services/queue-service';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';

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
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#0A0E17] border-r border-white/5 z-50 flex-col justify-between overflow-y-auto font-sans text-slate-300">
        <div className="flex flex-col">
          {/* Logo Area */}
          <div className="h-20 px-6 flex flex-col justify-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-primary">restaurant</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-[16px] text-white font-black tracking-tight leading-none">QueueFlow</span>
                <span className="text-[8px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">COMMAND OS • HOST STATION</span>
              </div>
            </div>
          </div>
          
          <div className="px-4 pt-6">
            <div className="mb-2 px-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Command</span>
            </div>
            <nav className="flex flex-col gap-1">
              {/* Active State (Dashboard) */}
              <Link href="/dashboard" className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#111827] border border-white/10 text-white shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-colors relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"></div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-primary">grid_view</span>
                  <span className="font-medium text-sm">Dashboard</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              </Link>

              <Link href="/dashboard/queue" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">people</span>
                  <span className="font-medium text-sm">Live Queue</span>
                </div>
                {activeQueueCount > 0 && <span className="px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-mono text-[10px] font-bold">{activeQueueCount}</span>}
              </Link>
              
              <Link href="/dashboard/tables" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                  <span className="font-medium text-sm">Tables Map</span>
                </div>
              </Link>
              
              <Link href="/dashboard/orders" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span className="font-medium text-sm">Orders</span>
                </div>
              </Link>
              
              <Link href="/dashboard/kitchen" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
                  <span className="font-medium text-sm">Kitchen Display</span>
                </div>
              </Link>
            </nav>

            <div className="mt-8 mb-2 px-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Venue Control</span>
            </div>
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard/menu" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  <span className="font-medium text-sm">Menu Config</span>
                </div>
              </Link>
              <Link href="/dashboard/inventory" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  <span className="font-medium text-sm">Inventory</span>
                </div>
              </Link>
              <Link href="/dashboard/staff" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  <span className="font-medium text-sm">Staff Management</span>
                </div>
              </Link>
              <Link href="/dashboard/settings/qr" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">qr_code</span>
                  <span className="font-medium text-sm">QR Codes</span>
                </div>
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-2 border-t border-white/5">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-bold text-sm">
                M
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-white truncate max-w-[100px]">
                  Chef Marco
                </span>
                <span className="text-[10px] text-slate-400">Host Station 1</span>
              </div>
            </div>
            <div className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase">
              Open
            </div>
          </div>
          <form action={signOutAction} className="w-full">
            <button title="Sign Out" type="submit" className="w-full py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">logout</span> Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="pl-0 md:pl-64 flex flex-col min-h-screen bg-[#0A0E17] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-[#0A0E17]/80 backdrop-blur-md border-b border-white/5 z-40 text-slate-300">
          <div className="h-16 w-full px-2 sm:px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-6">
              {/* Live Sync Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest hidden sm:inline">Live Sync</span>
              </div>
              
              {/* Path Breadcrumbs */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-sm">
                <span className="material-symbols-outlined text-[16px] text-slate-400">storefront</span>
                <span className="font-semibold text-white max-w-[100px] sm:max-w-none truncate">{restaurant.name}</span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-slate-400 hidden sm:inline">Host Station 1</span>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center hidden lg:flex">
                <input 
                  type="text" 
                  placeholder="Search guests, tickets, tables..." 
                  className="w-64 pl-4 pr-10 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all" 
                />
                <kbd className="absolute right-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-400 font-mono">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden xl:flex items-center gap-4 px-4 py-1.5 rounded-lg bg-white/5 border border-white/5">
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
                <button className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary hover:bg-blue-500 text-white text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform active:scale-95 border border-blue-400/50 group">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <div className="hidden sm:flex flex-col items-start leading-none">
                    <span>Call Next</span>
                    <span>Guest</span>
                  </div>
                  <div className="hidden lg:flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-mono text-blue-200 border border-black/10">
                    SPACE <span className="material-symbols-outlined text-[10px]">keyboard_return</span>
                  </div>
                </button>
              </Link>
              
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#0A0E17]"></span>
              </button>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 flex-1 relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 min-h-[4rem] h-[calc(4rem+env(safe-area-inset-bottom))] bg-[#0A0E17]/90 backdrop-blur-lg border-t border-white/5 z-50 flex items-start pt-2 justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          <Link href="/dashboard" className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
            <span className="text-[10px] font-medium mt-1">Home</span>
          </Link>
          <Link href="/dashboard/queue" className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white relative">
            <span className="material-symbols-outlined text-[20px]">people</span>
            <span className="text-[10px] font-medium mt-1">Queue</span>
            {activeQueueCount > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-primary rounded-full"></span>}
          </Link>
          <Link href="/dashboard/orders" className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span className="text-[10px] font-medium mt-1">Orders</span>
          </Link>
          <Link href="/dashboard/kitchen" className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
            <span className="text-[10px] font-medium mt-1">Kitchen</span>
          </Link>
          <Link href="/dashboard/menu" className="flex flex-col items-center justify-center w-16 h-full text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">menu</span>
            <span className="text-[10px] font-medium mt-1">More</span>
          </Link>
        </nav>
      </div>
    </>
  );
}
