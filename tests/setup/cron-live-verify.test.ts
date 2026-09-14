import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { NextRequest } from 'next/server';

dotenv.config({ path: '.env.local' });
process.env.CRON_SECRET = 'local-verify-secret';

const connectionString = process.env.DATABASE_URL;

describe('Phase 3A: Live cron handler verification', () => {
  let client: Client;
  const RID = '33333333-3333-4333-a333-333333333333';

  beforeAll(async () => {
    if (!connectionString) throw new Error('DATABASE_URL required');
    client = new Client({ connectionString });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it('queue-maintenance: invalid/missing auth rejected, restaurant_id param rejected, valid auth expires overdue', async () => {
    const { GET } = await import('@/app/api/cron/queue-maintenance/route');
    const { QueueService } = await import('@/lib/services/queue-service');
    const { createAdminClient } = await import('@/lib/db/supabase/admin');
    const sb = createAdminClient();

    const bad = await GET(new NextRequest('http://localhost/api/cron/queue-maintenance', { headers: { authorization: 'Bearer wrong' } }));
    expect(bad.status).toBe(401);

    const missing = await GET(new NextRequest('http://localhost/api/cron/queue-maintenance'));
    expect(missing.status).toBe(401);

    const withParam = await GET(
      new NextRequest('http://localhost/api/cron/queue-maintenance?restaurant_id=abc', { headers: { authorization: 'Bearer local-verify-secret' } })
    );
    expect(withParam.status).toBe(400);

    const join = await QueueService.joinQueue({ restaurantId: RID, customerName: 'Cron Live Verify', partySize: 2 });
    await sb.rpc('transition_queue_entry_atomic', { p_queue_entry_id: join.entry.id, p_target_status: 'CALLED', p_actor_user_id: null, p_reason: null });
    await client.query(`UPDATE public.queue_entries SET called_at = NOW() - INTERVAL '20 minutes' WHERE id = $1`, [join.entry.id]);

    const good = await GET(
      new NextRequest('http://localhost/api/cron/queue-maintenance?limit=50', { headers: { authorization: 'Bearer local-verify-secret' } })
    );
    expect(good.status).toBe(200);
    const body = await good.json();
    expect(body.success).toBe(true);
    expect(body.result.expiredCount).toBeGreaterThanOrEqual(1);

    const { data: entry } = await sb.from('queue_entries').select('status, no_show_reason').eq('id', join.entry.id).single();
    expect(entry?.status).toBe('NO_SHOW');
    expect(entry?.no_show_reason).toBe('CUSTOMER_DID_NOT_RESPOND');
  }, 30000);

  it('notifications route: valid auth processes bounded batch', async () => {
    const { GET } = await import('@/app/api/cron/notifications/route');
    const res = await GET(
      new NextRequest('http://localhost/api/cron/notifications?limit=5', { headers: { authorization: 'Bearer local-verify-secret' } })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.processedCount).toBeLessThanOrEqual(5);
  }, 60000);
});
