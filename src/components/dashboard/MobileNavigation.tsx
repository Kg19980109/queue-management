"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavigationProps {
  activeQueueCount: number;
}

export default function MobileNavigation({ activeQueueCount }: MobileNavigationProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Helper to determine if a path is active
  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Dimmed Background Overlay when Drawer is open */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Slide-Up Drawer for "More" Menu */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0E17]/95 backdrop-blur-xl border-t border-white/10 z-[70] transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        <div className="flex flex-col p-4 gap-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-lg">Menu</h3>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link onClick={() => setIsDrawerOpen(false)} href="/dashboard/tables" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 active:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[24px]">table_restaurant</span>
              <span className="text-xs font-medium">Table Map</span>
            </Link>
            <Link onClick={() => setIsDrawerOpen(false)} href="/dashboard/staff" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 active:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[24px]">badge</span>
              <span className="text-xs font-medium">Staff</span>
            </Link>
            <Link onClick={() => setIsDrawerOpen(false)} href="/dashboard/inventory" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 active:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              <span className="text-xs font-medium">Inventory</span>
            </Link>
            <Link onClick={() => setIsDrawerOpen(false)} href="/dashboard/settings/qr" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 active:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[24px]">qr_code</span>
              <span className="text-xs font-medium">QR Codes</span>
            </Link>
            <Link onClick={() => setIsDrawerOpen(false)} href="/dashboard/menu" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 active:bg-white/10 transition-colors col-span-2">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
              <span className="text-xs font-medium">Menu Configuration</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 min-h-[4rem] h-[calc(4rem+env(safe-area-inset-bottom))] bg-[#0A0E17]/90 backdrop-blur-lg border-t border-white/5 z-50 flex items-start pt-2 justify-around px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <Link 
          href="/dashboard" 
          onClick={() => setIsDrawerOpen(false)}
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            isActive('/dashboard') ? 'text-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
          <span className="text-[10px] font-medium mt-1">Home</span>
        </Link>
        <Link 
          href="/dashboard/queue" 
          onClick={() => setIsDrawerOpen(false)}
          className={`flex flex-col items-center justify-center w-16 h-full relative transition-colors ${
            isActive('/dashboard/queue') ? 'text-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">people</span>
          <span className="text-[10px] font-medium mt-1">Queue</span>
          {activeQueueCount > 0 && (
            <span className="absolute top-0 right-3 w-2.5 h-2.5 bg-primary rounded-full border-2 border-[#0A0E17]"></span>
          )}
        </Link>
        <Link 
          href="/dashboard/orders" 
          onClick={() => setIsDrawerOpen(false)}
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            isActive('/dashboard/orders') ? 'text-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          <span className="text-[10px] font-medium mt-1">Orders</span>
        </Link>
        <Link 
          href="/dashboard/kitchen" 
          onClick={() => setIsDrawerOpen(false)}
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            isActive('/dashboard/kitchen') ? 'text-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">soup_kitchen</span>
          <span className="text-[10px] font-medium mt-1">Kitchen</span>
        </Link>
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            isDrawerOpen ? 'text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
          <span className="text-[10px] font-medium mt-1">More</span>
        </button>
      </nav>
    </>
  );
}
