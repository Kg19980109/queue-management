import React from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth/session';
import { signOutAction } from '@/app/login/actions';

export default async function RestaurantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col">
          <div className="h-16 px-space-lg flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[24px] text-primary">restaurant</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">QueueFlow</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary">Live Sync</span>
            </div>
          </div>
          
          <div className="px-space-md pt-space-sm">
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  <span className="font-body-md text-body-md">Dashboard</span>
                </div>
              </Link>
              <Link href="/dashboard/queue" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
                  <span className="font-body-md text-body-md">Live Queue</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold">12</span>
              </Link>
              <Link href="/dashboard/tables" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">table_restaurant</span>
                  <span className="font-body-md text-body-md">Tables</span>
                </div>
              </Link>
              <Link href="/dashboard/orders" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                  <span className="font-body-md text-body-md">Orders</span>
                </div>
              </Link>
              <Link href="/dashboard/kitchen" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">countertops</span>
                  <span className="font-body-md text-body-md">Kitchen Display</span>
                </div>
              </Link>
              <div className="h-px bg-outline-variant my-2 mx-4" />
              <Link href="/dashboard/menu" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
                  <span className="font-body-md text-body-md">Menu</span>
                </div>
              </Link>
              <Link href="/dashboard/inventory" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  <span className="font-body-md text-body-md">Inventory</span>
                </div>
              </Link>
              <Link href="/dashboard/staff" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                  <span className="font-body-md text-body-md">Staff</span>
                </div>
              </Link>
              <Link href="/dashboard/settings/qr" className="flex items-center justify-between px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">qr_code</span>
                  <span className="font-body-md text-body-md">QR Codes</span>
                </div>
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-space-md flex flex-col gap-space-sm">
          <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="flex flex-col">
                <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate max-w-[120px]">
                  {user?.email || 'Admin'}
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">Host Station 1</span>
              </div>
            </div>
            <form action={signOutAction}>
              <button title="Sign Out" type="submit" className="p-1 rounded-lg text-error hover:bg-error-container transition-colors">
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="pl-72 flex flex-col min-h-screen">
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40">
          <div className="h-16 w-full px-space-lg flex items-center justify-between">
            <div className="flex items-center gap-space-lg">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                <span className="font-body-md text-body-md font-medium text-on-surface">Spice Garden</span>
                <span className="text-outline-variant font-label-md">/</span>
                <span className="font-body-md text-body-md text-on-surface-variant">Host Station 1</span>
              </div>
              <div className="relative flex items-center hidden sm:flex">
                <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant">search</span>
                <input 
                  type="text" 
                  placeholder="Search guests, tickets, tables..." 
                  className="w-72 pl-9 pr-14 py-1.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all" 
                />
                <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant">⌘K</kbd>
              </div>
            </div>

            <div className="flex items-center gap-space-md">
              <div className="hidden xl:flex items-center gap-3 px-space-md py-1.5 rounded-lg bg-surface-container-low">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                  <span className="font-body-sm text-body-sm text-on-surface font-semibold">12</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">(34 guests)</span>
                </div>
                <span className="w-1 h-3 bg-outline-variant rounded-full"></span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">schedule</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Avg Wait:</span>
                  <span className="font-label-md text-label-md text-on-surface font-bold">~22m</span>
                </div>
              </div>

              <Link href="/dashboard/queue">
                <button className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-body-sm font-semibold shadow-sm transition-all transform active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <span>Call Next Guest</span>
                </button>
              </Link>
            </div>
          </div>
        </header>

        <main className="w-full pt-16 flex-1 bg-background">
          {children}
        </main>
      </div>
    </>
  );
}
