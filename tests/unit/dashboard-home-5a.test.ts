import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { orderAttentionEntries, isOverdueCalled } from '@/lib/dashboard-attention';

const src = (...p: string[]) => resolve(__dirname, '../../src', ...p);
const read = (p: string) => readFileSync(src(...p.split('/')), 'utf8');

/**
 * Phase 5A — restaurant dashboard cockpit contracts. Source-behavior
 * assertions (no brittle snapshots) plus pure-helper unit tests.
 */
describe('Phase 5A: restaurant dashboard (A–W)', () => {
  // A. Dashboard loads authorized restaurant.
  it('A. home resolves restaurant server-side via authorized context', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('getAuthorizedRestaurantContext');
    expect(page).toContain('getRestaurantDashboardStats');
  });

  // B. Unauthorized restaurant is rejected.
  it('B. context requires ACTIVE admin membership + active lifecycle', () => {
    const svc = read('lib/services/restaurant-admin-service.ts');
    expect(svc).toContain("eq('role', 'RESTAURANT_ADMIN')");
    expect(svc).toContain("eq('status', 'ACTIVE')");
    expect(svc).toContain('assertRestaurantActive');
  });

  // C. restaurant_id tampering cannot switch tenant.
  it('C. home never reads restaurant_id from client input', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).not.toContain('searchParams');
    expect(page).not.toContain('formData.get(\'restaurantId\')');
    expect(page).not.toContain('formData.get("restaurantId")');
    // Operating forms carry ids only as opaque action args resolved server-side.
    expect(page).toContain('setQueueOperatingStateFormAction');
  });

  // D. Queue health renders correctly.
  it('D. hero renders authoritative health states and reason', () => {
    const page = read('app/dashboard/page.tsx');
    for (const s of ['HEALTHY', 'BUSY', 'CRITICAL', 'EMPTY', 'PAUSED', 'CLOSED']) {
      expect(page).toContain(s);
    }
    expect(page).toContain('getQueueHealth');
    expect(page).toContain('healthReason');
  });

  // E. Capacity uses active states only.
  it('E. capacity counts WAITING/NOTIFIED/CALLED, never terminals', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain("['WAITING', 'NOTIFIED', 'CALLED']");
    expect(page).not.toMatch(/SEATED.*activeCount|activeCount.*SEATED/);
  });

  // F. CLOSED renders correct dashboard state.
  it('F. CLOSED state has explicit copy and intake semantics', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain("'CLOSED'");
    expect(page).toContain('Closed · not taking entries');
    expect(page).toContain('Close new entries?');
  });

  // G. PAUSED renders correct dashboard state.
  it('G. PAUSED state keeps tickets active in copy', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain("'PAUSED'");
    expect(page).toContain('existing tickets stay active');
    expect(page).toContain('Pause new guests?');
  });

  // H. CLOSING_SOON renders correct dashboard state.
  it('H. CLOSING_SOON warns without blocking joins', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain("'CLOSING_SOON'");
    expect(page).toContain('Closing soon · join while open');
  });

  // I. attention list respects existing ordering.
  it('I. overdue → called → notified → oldest waiting, max 5, no terminals', () => {
    const now = Date.parse('2026-09-15T12:00:00Z');
    const entries = [
      { id: 'w1', status: 'WAITING', joined_at: '2026-09-15T11:00:00Z' },
      { id: 'n1', status: 'NOTIFIED', joined_at: '2026-09-15T11:30:00Z' },
      { id: 'c1', status: 'CALLED', joined_at: '2026-09-15T11:45:00Z', called_at: '2026-09-15T11:58:00Z' },
      { id: 'cold', status: 'CALLED', joined_at: '2026-09-15T10:00:00Z', called_at: '2026-09-15T10:30:00Z' },
      { id: 's1', status: 'SEATED', joined_at: '2026-09-15T09:00:00Z' },
      { id: 'x1', status: 'CANCELLED', joined_at: '2026-09-15T09:30:00Z' },
    ];
    const ordered = orderAttentionEntries(entries, 15, 5, now).map((e) => e.id);
    expect(ordered).toEqual(['cold', 'c1', 'n1', 'w1']);
    const [w1, , c1, cold] = entries;
    expect(isOverdueCalled(cold as (typeof entries)[number], 15, now)).toBe(true);
    expect(isOverdueCalled(c1 as (typeof entries)[number], 15, now)).toBe(false);
    expect(isOverdueCalled(w1 as (typeof entries)[number], 15, now)).toBe(false);
  });

  // J. privileged actions hidden/disabled without permission.
  it('J. operating controls + seat actions gate on server-checked permissions', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('PERMISSIONS.QUEUE_MANAGE');
    expect(page).toContain('PERMISSIONS.QUEUE_SEAT');
    expect(page).toContain('queue.manage permission');
  });

  // K. server rejects unauthorized queue operating action.
  it('K. operating-state service enforces permission server-side', () => {
    const svc = read('lib/services/queue-service.ts');
    expect(svc).toContain('QUEUE_MANAGE');
  });

  // L. table summary is accurate.
  it('L. table counts come from authoritative service/tables', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('TableService.listTables');
    for (const s of ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'RESERVED']) {
      expect(page).toContain(s);
    }
    expect(page).toContain('/dashboard/tables');
  });

  // M. order summary is accurate.
  it('M. order counts come from kitchen service, no revenue prominence', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('listKitchenOrders');
    expect(page).not.toContain('preOrderRevenue');
    expect(page).not.toContain('Ticket Avg');
    expect(page).toContain('/dashboard/kitchen');
  });

  // N. realtime update triggers authoritative refresh.
  it('N. staff hooks revalidate on event, never apply payloads', () => {
    const conn = read('lib/realtime/useRealtimeConnection.ts');
    expect(conn).toContain('router.refresh()');
    const home = read('components/dashboard/DashboardHomeRealtime.tsx');
    expect(home).toContain('useOrderRealtime');
    expect(home).toContain('useNotificationRealtime');
  });

  // O. no duplicate subscriptions.
  it('O. one subscription per domain on home (layout + home mounts differ)', () => {
    const layout = read('components/realtime/DashboardRealtime.tsx');
    expect(layout).not.toContain('useOrderRealtime');
    expect(layout).not.toContain('useNotificationRealtime');
    const home = read('components/dashboard/DashboardHomeRealtime.tsx');
    expect(home).not.toContain('useDashboardRealtime');
    expect(home).not.toContain('useTableRealtime');
  });

  // P. offline/realtime failure is graceful.
  it('P. sections degrade independently; realtime has fallback + indicator', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('degrade');
    const conn = read('lib/realtime/useRealtimeConnection.ts');
    expect(conn).toContain('fallbackIntervalMs');
  });

  // Q. suspended/archived restaurant cannot operate.
  it('Q. lifecycle gate sits in the context path + calm error page', () => {
    const svc = read('lib/services/restaurant-admin-service.ts');
    expect(svc).toContain('assertRestaurantActive');
    const errPage = read('app/dashboard/error.tsx');
    expect(errPage).toContain('Restaurant unavailable');
    expect(errPage).not.toMatch(/SUSPENDED|ARCHIVED/);
  });

  // R. dashboard doesn't expose customer PII unnecessarily.
  it('R. home renders names/party only; no phones, tokens, or internals', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).not.toContain('customer_phone');
    expect(page).not.toContain('token');
    expect(page).not.toContain('phone');
  });

  // S. no raw token/secret exposure.
  it('S. no service-role usage or secrets in dashboard client code', () => {
    for (const f of [
      'components/dashboard/ConfirmSubmitButton.tsx',
      'components/dashboard/DashboardHomeRealtime.tsx',
    ]) {
      const code = read(f);
      expect(code).not.toContain('service_role');
      expect(code).not.toContain('SERVICE_ROLE');
      expect(code).not.toContain('localStorage');
      expect(code).not.toContain('sessionStorage');
    }
  });

  // T. light/dark visual contrast.
  it('T. hero and controls use high-contrast dark-first styling', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('text-white');
    expect(page).toContain('bg-[#111827]');
  });

  // U. mobile layout assumptions.
  it('U. responsive grid, no fixed widths, thumb-sized actions', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toContain('grid-cols-2');
    expect(page).toContain('sm:grid-cols-4');
    expect(page).toContain('lg:grid-cols-2');
    expect(page).toContain('h-10');
    expect(page).toContain('h-11');
  });

  // V. loading skeleton.
  it('V. dashboard loading mirrors cockpit structure accessibly', () => {
    const loading = read('app/dashboard/loading.tsx');
    expect(loading).toContain('role="status"');
    expect(loading).toContain('animate-pulse');
  });

  // W. error state.
  it('W. error boundary exists with operational copy + recovery', () => {
    expect(existsSync(src('app', 'dashboard', 'error.tsx'))).toBe(true);
    const errPage = read('app/dashboard/error.tsx');
    expect(errPage).toContain('Reconnect');
    expect(errPage).not.toMatch(/SQL|stack|postgres/i);
  });
});
