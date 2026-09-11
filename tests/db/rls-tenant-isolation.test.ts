import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

describe('Live Database RLS Multi-Tenant Security & Penetration Tests', () => {
  let client: Client;

  const RESTAURANT_B_ID = '22222222-2222-4222-a222-222222222222';

  const SUPER_ADMIN_ID = 'a0000000-0000-4000-a000-000000000001';
  const ADMIN_A_ID = 'a0000000-0000-4000-a000-000000000002';
  const STAFF_A_ID = 'a0000000-0000-4000-a000-000000000004';

  beforeAll(async () => {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required in .env.local for database tests');
    }
    client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  /**
   * Helper to set authenticated user context inside a PostgreSQL transaction.
   */
  async function withUserContext<T>(
    userId: string | null,
    role: 'authenticated' | 'anon',
    fn: () => Promise<T>
  ): Promise<T> {
    await client.query('BEGIN');
    try {
      await client.query(`SET LOCAL role = ${role}`);
      if (userId) {
        await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}'`);
      } else {
        await client.query(`RESET request.jwt.claim.sub`);
      }
      const result = await fn();
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: RESTAURANT ADMIN TENANT ISOLATION
  // --------------------------------------------------------------------------

  it('[PENETRATION TEST] Restaurant Admin A cannot SELECT Restaurant B tables', async () => {
    await withUserContext(ADMIN_A_ID, 'authenticated', async () => {
      const res = await client.query(
        'SELECT * FROM public.restaurant_tables WHERE restaurant_id = $1',
        [RESTAURANT_B_ID]
      );
      expect(res.rows.length).toBe(0);
    });
  });

  it('[PENETRATION TEST] Restaurant Admin A cannot INSERT tables into Restaurant B', async () => {
    await withUserContext(ADMIN_A_ID, 'authenticated', async () => {
      await expect(
        client.query(
          `INSERT INTO public.restaurant_tables (restaurant_id, table_number, capacity, status)
           VALUES ($1, 'ILLEGAL-01', 4, 'AVAILABLE')`,
          [RESTAURANT_B_ID]
        )
      ).rejects.toThrow();
    });
  });

  it('[PENETRATION TEST] Restaurant Admin A cannot UPDATE Restaurant B tables', async () => {
    await withUserContext(ADMIN_A_ID, 'authenticated', async () => {
      const updateRes = await client.query(
        `UPDATE public.restaurant_tables SET status = 'BLOCKED' WHERE restaurant_id = $1`,
        [RESTAURANT_B_ID]
      );
      expect(updateRes.rowCount).toBe(0);
    });
  });

  it('[PENETRATION TEST] Restaurant Admin A cannot DELETE Restaurant B tables', async () => {
    await withUserContext(ADMIN_A_ID, 'authenticated', async () => {
      const deleteRes = await client.query(
        `DELETE FROM public.restaurant_tables WHERE restaurant_id = $1`,
        [RESTAURANT_B_ID]
      );
      expect(deleteRes.rowCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 2: STAFF TENANT ISOLATION
  // --------------------------------------------------------------------------

  it('[PENETRATION TEST] Staff A cannot SELECT Restaurant B queue entries or orders', async () => {
    await withUserContext(STAFF_A_ID, 'authenticated', async () => {
      const resQueue = await client.query(
        'SELECT * FROM public.queue_entries WHERE restaurant_id = $1',
        [RESTAURANT_B_ID]
      );
      expect(resQueue.rows.length).toBe(0);

      const resOrders = await client.query(
        'SELECT * FROM public.orders WHERE restaurant_id = $1',
        [RESTAURANT_B_ID]
      );
      expect(resOrders.rows.length).toBe(0);
    });
  });

  it('[PENETRATION TEST] Staff A cannot INSERT queue entries into Restaurant B', async () => {
    await withUserContext(STAFF_A_ID, 'authenticated', async () => {
      await expect(
        client.query(
          `INSERT INTO public.queue_entries (restaurant_id, customer_name, party_size, queue_number, status)
           VALUES ($1, 'Illegal Guest', 2, 999, 'WAITING')`,
          [RESTAURANT_B_ID]
        )
      ).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 3: ANONYMOUS CUSTOMER DIRECT DATABASE ACCESS
  // --------------------------------------------------------------------------

  it('[PENETRATION TEST] Anonymous client cannot SELECT protected domain tables directly', async () => {
    await withUserContext(null, 'anon', async () => {
      const resRestaurants = await client.query('SELECT * FROM public.restaurants');
      expect(resRestaurants.rows.length).toBe(0);

      const resTables = await client.query('SELECT * FROM public.restaurant_tables');
      expect(resTables.rows.length).toBe(0);

      const resOrders = await client.query('SELECT * FROM public.orders');
      expect(resOrders.rows.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 4: SUPER ADMIN PLATFORM-WIDE ACCESS
  // --------------------------------------------------------------------------

  it('Super Admin can SELECT data across all restaurants', async () => {
    await withUserContext(SUPER_ADMIN_ID, 'authenticated', async () => {
      const res = await client.query('SELECT * FROM public.restaurants');
      expect(res.rows.length).toBeGreaterThanOrEqual(2);
    });
  });
});
