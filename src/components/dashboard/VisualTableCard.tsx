'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { updateTableStatusAction, archiveTableAction } from '@/app/dashboard/actions';
import type { TableStatus } from '@/types/database.types';
const VALID_TABLE_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  AVAILABLE: ['OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'],
  OCCUPIED: ['CLEANING', 'AVAILABLE'],
  CLEANING: ['AVAILABLE', 'OUT_OF_SERVICE'],
  RESERVED: ['OCCUPIED', 'AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE'],
};

interface TableData {
  id: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: TableStatus;
}

export function VisualTableCard({
  table,
  canManageStatus,
  canDelete,
  canUpdate,
}: {
  table: TableData;
  canManageStatus: boolean;
  canDelete: boolean;
  canUpdate: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Optimistic UI for instant status changes
  const [optimisticStatus, addOptimisticStatus] = useOptimistic(
    table.status,
    (_state, newStatus: TableStatus) => newStatus
  );

  const allowedTransitions = VALID_TABLE_TRANSITIONS[optimisticStatus] || [];

  const handleStatusChange = (newStatus: TableStatus) => {
    setIsMenuOpen(false);
    startTransition(async () => {
      addOptimisticStatus(newStatus);
      await updateTableStatusAction(table.id, newStatus, table.status);
    });
  };

  const handleArchive = () => {
    setIsMenuOpen(false);
    startTransition(async () => {
      await archiveTableAction(table.id);
    });
  };

  // Status-based styling for the table and chairs
  let tableGlow = '';
  let chairFill = '';
  let chairBorder = '';
  let statusBg = '';
  let statusText = '';
  let pulseAnimation = '';

  switch (optimisticStatus) {
    case 'AVAILABLE':
      tableGlow = 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      chairFill = 'bg-slate-900';
      chairBorder = 'border-emerald-500/50';
      statusBg = 'bg-emerald-500/20';
      statusText = 'text-emerald-400';
      break;
    case 'OCCUPIED':
      tableGlow = 'border-blue-500/60 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.25)]';
      chairFill = 'bg-blue-400';
      chairBorder = 'border-blue-400';
      statusBg = 'bg-blue-500/20';
      statusText = 'text-blue-400';
      break;
    case 'CLEANING':
      tableGlow = 'border-amber-500/60 bg-amber-500/20';
      chairFill = 'bg-slate-900';
      chairBorder = 'border-amber-500/50';
      statusBg = 'bg-amber-500/20';
      statusText = 'text-amber-400';
      pulseAnimation = 'animate-pulse';
      break;
    case 'RESERVED':
      tableGlow = 'border-purple-500/60 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]';
      chairFill = 'bg-slate-900';
      chairBorder = 'border-purple-500/50';
      statusBg = 'bg-purple-500/20';
      statusText = 'text-purple-400';
      break;
    case 'OUT_OF_SERVICE':
    default:
      tableGlow = 'border-slate-700 bg-slate-800/40 opacity-70';
      chairFill = 'bg-slate-800';
      chairBorder = 'border-slate-700';
      statusBg = 'bg-slate-800';
      statusText = 'text-slate-400';
      break;
  }

  // Calculate chair positions (evenly distributed around the table)
  const capacity = Math.min(Math.max(table.capacity, 1), 20); // Cap visualization to 20 for UI sanity
  const chairs = [];
  const radius = 55; // Distance from center
  const centerX = 64; // Half of 128 (w-32)
  const centerY = 64; // Half of 128 (h-32)

  for (let i = 0; i < capacity; i++) {
    const angle = (i / capacity) * 2 * Math.PI - Math.PI / 2; // Start at top
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    chairs.push(
      <div
        key={i}
        className={`absolute h-4 w-4 rounded-full border-2 transition-all duration-500 ease-in-out ${chairFill} ${chairBorder}`}
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    );
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 pt-10 transition-all duration-300 hover:border-slate-700 ${
        isPending ? 'opacity-50' : ''
      }`}
    >
      {/* Zone & Menu Button at Top */}
      <div className="absolute left-3 top-3 right-3 flex items-center justify-between z-10">
        <span className="truncate rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-slate-400 backdrop-blur-sm border border-slate-800 max-w-[120px]">
          {table.zoneName || 'Unassigned'}
        </span>

        {/* Triple Dot Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 backdrop-blur-sm"
          >
            &#8942;
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-8 w-40 rounded-xl border border-slate-700 bg-slate-800/95 shadow-xl backdrop-blur-md overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              {canManageStatus && allowedTransitions.length > 0 && (
                <div className="py-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Change Status</div>
                  {allowedTransitions.map((target) => (
                    <button
                      key={target}
                      onClick={() => handleStatusChange(target)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      &rarr; {target}
                    </button>
                  ))}
                </div>
              )}
              
              {(canDelete || canUpdate) && (
                <div className="border-t border-slate-700 py-1">
                  <button
                    onClick={handleArchive}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-slate-700 transition-colors"
                  >
                    Archive Table
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visual Table & Chairs */}
      <div className="relative mt-2 mb-4 h-[128px] w-[128px]">
        {/* The physical table */}
        <div
          className={`absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-all duration-500 ease-in-out ${tableGlow} ${pulseAnimation}`}
        >
          <span className="text-xl font-extrabold text-white drop-shadow-md z-10">{table.tableNumber}</span>
        </div>

        {/* The chairs */}
        {chairs}
      </div>

      {/* Status Badge & Capacity */}
      <div className="flex w-full items-center justify-between border-t border-slate-800 pt-4 mt-2 z-10">
        <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold border border-transparent ${statusBg} ${statusText} transition-colors duration-500`}>
          {optimisticStatus}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span>👥</span>
          <span>{table.capacity}</span>
        </div>
      </div>
      
      {/* Click-away overlay when menu is open */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  );
}
