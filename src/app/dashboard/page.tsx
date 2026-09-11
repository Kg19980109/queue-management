import React from 'react';
import Link from 'next/link';
import { RestaurantAdminService } from '@/lib/services/restaurant-admin-service';

export default async function RestaurantAdminDashboardPage() {
  const { restaurant } = await RestaurantAdminService.getRestaurantDashboardStats();

  return (
    <div className="flex flex-col w-full">
      {/* Subtle Ambient Glow Canvas */}
      <div className="relative w-full px-space-xl py-space-lg flex flex-col gap-space-xl overflow-hidden">
        <div className="absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-primary-container/5 blur-3xl pointer-events-none"></div>
        <div className="absolute top-80 right-10 w-72 h-72 rounded-full bg-secondary-container/5 blur-3xl pointer-events-none"></div>
        
        {/* Top Bar: Greeting, Peak Status, Quick Station Switcher */}
        <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Shift Telemetry • Night Service</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                Peak Dinner Service
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">Good evening, {restaurant.name || 'Spice Garden'} 👋</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Here is your live floor and queue performance for tonight’s dinner service.</p>
          </div>
          
          {/* Quick Action Capsule */}
          <div className="flex items-center gap-space-sm bg-surface-container-lowest p-1.5 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-tertiary">pace</span>
              <span className="font-body-sm text-body-sm font-medium">Turnover Velocity:</span>
              <span className="font-label-md text-label-md font-bold text-on-surface">~38m</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-body-sm font-semibold transition-all transform active:scale-95 shadow-sm" type="button">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Walk-In</span>
            </button>
          </div>
        </section>

        {/* 4 High-Precision KPI Metric Tiles */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {/* KPI 1: Active Queue */}
          <div className="relative bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Active Queue</span>
              </div>
              <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-primary">+4 in last 15m</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-ticket-display text-ticket-display text-on-surface">12</span>
              <span className="font-headline-sm text-body-lg text-on-surface-variant font-medium">Groups</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">(34 Guests)</span>
            </div>
            <div className="mt-3 pt-3 flex items-center justify-between text-on-surface-variant">
              <span className="font-body-sm text-body-sm">Avg Wait Time:</span>
              <span className="font-label-md text-label-md font-bold text-on-surface">22 mins</span>
            </div>
          </div>

          {/* KPI 2: Floor Occupancy */}
          <div className="relative bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary rounded-t-xl"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                  <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
                </div>
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Floor Occupancy</span>
              </div>
              <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">4 Tables Ready</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-ticket-display text-ticket-display text-on-surface">86%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">24 of 28 Tables Full</span>
            </div>
            <div className="mt-3 w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className="bg-tertiary h-full rounded-full" style={{ width: '86%' }}></div>
            </div>
          </div>

          {/* KPI 3: Seated Tonight */}
          <div className="relative bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary rounded-t-xl"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[20px]">restaurant</span>
                </div>
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Guests Seated</span>
              </div>
              <span className="font-label-sm text-label-sm font-bold text-tertiary flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                18% vs Thu
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-ticket-display text-ticket-display text-on-surface">142</span>
              <span className="font-headline-sm text-body-lg text-on-surface-variant font-medium">Guests</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">(48 Parties)</span>
            </div>
            <div className="mt-3 pt-3 flex items-center justify-between text-on-surface-variant">
              <span className="font-body-sm text-body-sm">Peak Inflow:</span>
              <span className="font-label-md text-label-md font-semibold text-on-surface">7:45 PM – 8:15 PM</span>
            </div>
          </div>

          {/* KPI 4: Pre-Order Revenue */}
          <div className="relative bg-surface-container-lowest p-space-lg rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary-container rounded-t-xl"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Pre-Order Inflow</span>
              </div>
              <span className="font-label-sm text-label-sm font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface">28 Orders</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-ticket-display text-ticket-display text-on-surface tracking-tight">₹34,850</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">while waiting</span>
            </div>
            <div className="mt-3 pt-3 flex items-center justify-between text-on-surface-variant">
              <span className="font-body-sm text-body-sm">Ticket Avg:</span>
              <span className="font-label-md text-label-md font-bold text-primary">₹640 / order</span>
            </div>
          </div>
        </section>

        {/* Operational Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          
          {/* LEFT COLUMN: Live Queue Stream */}
          <section className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Live Queue Feed</span>
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Real-time Stream</span>
                </div>
                <Link href="/dashboard/queue" className="font-headline-sm text-body-sm font-semibold text-primary hover:text-on-primary-fixed-variant flex items-center gap-1 transition-colors">
                  <span>View All 12</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* Queue Cards Stack */}
              <div className="flex flex-col gap-space-sm" id="queue-stream">
                <div className="group relative bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-tertiary rounded-l-xl"></div>
                  <div className="flex items-start sm:items-center gap-space-md pl-2">
                    <div className="flex flex-col items-start">
                      <span className="font-ticket-display text-ticket-display text-on-surface tracking-tight">#A12</span>
                      <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-semibold mt-0.5">CALLED</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Rahul Mehta</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[16px]">person</span> 4 guests
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-tertiary">schedule</span>
                          Waited 24m
                        </span>
                        <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-medium">Pre-Order Paid</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative bg-surface-container-lowest hover:bg-surface-container-low p-space-md rounded-xl transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-xl"></div>
                  <div className="flex items-start sm:items-center gap-space-md pl-2">
                    <div className="flex flex-col items-start">
                      <span className="font-ticket-display text-ticket-display text-on-surface tracking-tight">#A13</span>
                      <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold mt-0.5">NEXT UP</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Priya Sharma</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[16px]">person</span> 2 guests
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                          Waited 18m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Real-time Floor Matrix & Alerts */}
          <section className="lg:col-span-5 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Floor Status</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">28 Total Tables</span>
                </div>
                <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-bold">24 Occupied</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="p-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex flex-col items-center justify-center shadow-sm">
                  <span className="font-ticket-display text-headline-sm font-bold">T2</span>
                  <span className="font-label-sm text-label-sm">Ready</span>
                </div>
                <div className="p-2.5 rounded-xl bg-error-container text-on-error-container flex flex-col items-center justify-center shadow-sm">
                  <span className="font-ticket-display text-headline-sm font-bold">T7</span>
                  <span className="font-label-sm text-label-sm">Cleaning</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
