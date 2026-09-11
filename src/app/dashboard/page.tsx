import React from 'react';
import Link from 'next/link';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';
import { QueueService } from '@/lib/services/queue-service';
import { TableService } from '@/lib/services/table-service';
import { OrderService } from '@/lib/services/order-service';

function getWaitTimeMins(joinedAt: string) {
  const diffMs = new Date().getTime() - new Date(joinedAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export default async function RestaurantAdminDashboardPage() {
  const { restaurant } = await RestaurantAdminService.getRestaurantDashboardStats();
  const restaurantId = restaurant.id;

  // Fetch real data concurrently
  const [activeQueue, tablesRes, activeOrders] = await Promise.all([
    QueueService.getActiveQueue(restaurantId),
    TableService.listTables({ restaurantId }),
    OrderService.listDashboardOrders(restaurantId, 'ALL'),
  ]);

  // --- KPI 1: Active Queue ---
  const activeQueueCount = activeQueue.length;
  const activeQueueGuests = activeQueue.reduce((acc, q) => acc + q.party_size, 0);
  
  let avgWaitTime = 0;
  if (activeQueue.length > 0) {
    const totalWait = activeQueue.reduce((acc, q) => acc + getWaitTimeMins(q.joined_at), 0);
    avgWaitTime = Math.floor(totalWait / activeQueue.length);
  }

  const calledCount = activeQueue.filter(q => q.status === 'CALLED').length;

  // --- KPI 2: Floor Occupancy ---
  const tablesTotal = tablesRes.stats.total;
  const tablesReady = tablesRes.stats.available;
  const tablesOccupied = tablesRes.stats.occupied;
  const occupancyPercent = tablesTotal > 0 ? Math.round((tablesOccupied / tablesTotal) * 100) : 0;

  // --- KPI 3: Guests Seated ---
  const guestsSeated = tablesRes.tables.filter(t => t.status === 'OCCUPIED').reduce((acc, t) => acc + t.capacity, 0);
  const partiesSeated = tablesOccupied;
  const tableCapacityMax = tablesRes.tables.reduce((acc, t) => acc + t.capacity, 0);

  // --- KPI 4: Pre-Order Inflow ---
  const preOrders = activeOrders.filter(o => o.status !== 'SERVED' && o.status !== 'CANCELLED');
  const preOrderRevenue = preOrders.reduce((acc, o) => acc + o.total, 0);
  const ticketAvg = preOrders.length > 0 ? Math.round(preOrderRevenue / preOrders.length) : 0;

  // --- Live Queue Feed Data ---
  const feedEntries = activeQueue.slice(0, 5); // Show top 5

  return (
    <div className="flex flex-col w-full text-slate-300 font-sans p-4 md:p-8 gap-6 md:gap-8">
      
      {/* Top Section: Greeting and Quick Action */}
      <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 relative z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span className="text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-full">Shift Telemetry</span>
            <span>• Night Service •</span>
            <span className="text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Normal Service</span>
          </div>
          <div className="relative pb-2 w-full max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl leading-none font-black text-white tracking-widest uppercase font-headline-xl">
              Good evening, Love Cafe Rathindra
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">Here is your live floor and queue performance for tonight&apos;s dinner service.</p>
        </div>
        
        {/* Quick Action Block */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
          <span className="text-2xl sm:text-3xl hidden sm:inline">👋</span>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex flex-col items-end justify-center px-4 py-2 rounded-xl bg-[#111827] border border-white/5 text-slate-300">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px] sm:text-[12px] text-emerald-400">bolt</span> Turnover:</span>
              <span className="text-xs sm:text-sm font-bold text-white">~{restaurant.avg_service_time_mins || 15}m</span>
            </div>
            <Link href="/dashboard/queue" className="flex flex-col items-center justify-center px-6 py-2 rounded-xl bg-primary hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-400/30 text-white font-bold text-sm">
              <span className="text-xs font-normal opacity-70 mb-0.5">+</span>
              Add Walk-In
            </Link>
          </div>
        </div>
      </section>

      {/* 4 Command OS KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* KPI 1: Active Queue */}
        <div className="bg-[#111827] p-5 rounded-2xl border border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center text-primary bg-primary/5">
                <span className="material-symbols-outlined text-[16px]">groups</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Active</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Queue</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold">
              {calledCount} Called
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black text-white font-headline-xl">{activeQueueCount}</span>
            <span className="text-sm font-bold text-white">Groups</span>
            <span className="text-[11px] text-slate-500">({activeQueueGuests} Guests)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 border-t border-white/5 pt-3">
            <span>Avg Wait Time:</span>
            <span className="text-white font-mono font-bold">{avgWaitTime} mins</span>
          </div>
        </div>

        {/* KPI 2: Floor Occupancy */}
        <div className="bg-[#111827] p-5 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-emerald-500/20 flex items-center justify-center text-emerald-400 bg-emerald-500/5">
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Floor</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Occupancy</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
              {tablesReady} Tables Ready
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black text-emerald-400 font-headline-xl">{occupancyPercent}%</span>
            <div className="flex flex-col text-[11px] text-slate-400 leading-tight ml-1">
              <span>{tablesOccupied} of {tablesTotal} Tables</span>
              <span>Full</span>
            </div>
          </div>
          <div className="w-full bg-[#1A2333] h-1.5 rounded-full mt-2 mb-1">
             <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${occupancyPercent}%` }}></div>
          </div>
        </div>

        {/* KPI 3: Guests Seated */}
        <div className="bg-[#111827] p-5 rounded-2xl border border-white/5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-purple-500/20 flex items-center justify-center text-purple-400 bg-purple-500/5">
                <span className="material-symbols-outlined text-[16px]">monetization_on</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Guests</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Seated</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] font-bold">
              Est. Active
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black text-white font-headline-xl">{guestsSeated}</span>
            <span className="text-sm font-bold text-white">Guests</span>
            <span className="text-[11px] text-slate-500">({partiesSeated} Parties)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 border-t border-white/5 pt-3">
            <span>Table Capacity:</span>
            <span className="text-white font-mono font-bold">{tableCapacityMax} Max</span>
          </div>
        </div>

        {/* KPI 4: Pre-Order Inflow */}
        <div className="bg-[#111827] p-5 rounded-2xl border border-amber-500/20 flex flex-col justify-between shadow-[0_0_15px_rgba(245,158,11,0.05)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-amber-500/20 flex items-center justify-center text-amber-500 bg-amber-500/5">
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Pre-Order</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">Inflow</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px] font-bold">
              {preOrders.length} Orders
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-black text-amber-500 font-headline-xl tracking-tight">{restaurant.currency === 'USD' ? '$' : '₹'}{preOrderRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400">active value</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 border-t border-white/5 pt-3">
            <span>Ticket Avg:</span>
            <span className="text-white font-mono font-bold">{restaurant.currency === 'USD' ? '$' : '₹'}{ticketAvg.toLocaleString()} / order</span>
          </div>
        </div>
      </section>

      {/* Main Split Content */}
      <DashboardClient 
        feedEntries={feedEntries}
        tablesRes={tablesRes}
        activeQueueCount={activeQueueCount}
      />
    </div>
  );
}
