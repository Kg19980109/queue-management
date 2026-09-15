import { createAdminClient } from '@/lib/db/supabase/admin';
import { QueueStatus, QueueOperatingState } from '@/types/database.types';
import { generateQueueToken, hashQueueToken } from '@/lib/utils/token-utils';
import { ETAService, RestaurantETAConfig } from '@/lib/services/eta-service';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { z } from 'zod';

export type QueueHealthState = 'HEALTHY' | 'BUSY' | 'CRITICAL' | 'EMPTY' | 'CLOSED' | 'PAUSED';

export interface QueueHealth {
  activeCount: number;
  waitingCount: number;
  notifiedCount: number;
  calledCount: number;
  seatedCount: number;
  noShowCountToday: number;
  avgWaitMins: number | null;
  oldestWaitingAgeMins: number | null;
  overdueCount: number;
  availableTables: number;
  occupiedTables: number;
  cleaningTables: number;
  reservedTables: number;
  outOfServiceTables: number;
  totalTables: number;
  operatingState: QueueOperatingState;
  queueEnabled: boolean;
  isFull: boolean;
  health: QueueHealthState;
  healthReason: string;
}

export const JoinQueueSchema = z.object({
  restaurantId: z.string().uuid(),
  customerName: z.string().min(1, 'Customer name is required').max(100),
  customerPhone: z.string().optional().nullable(),
  partySize: z.number().int().min(1, 'Party size must be at least 1').max(50),
});

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

export const UpdateQueueStatusSchema = z.object({
  entryId: z.string().uuid(),
  newStatus: z.string() as z.ZodType<QueueStatus>,
  actorUserId: z.string().uuid().optional().nullable(),
  reason: z.string().optional(),
});

export type UpdateQueueStatusInput = z.infer<typeof UpdateQueueStatusSchema>;

export const QueueSettingsSchema = z.object({
  queueEnabled: z.boolean().optional(),
  maxQueueCapacity: z.number().int().min(1).max(1000).optional(),
  minPartySize: z.number().int().min(1).max(20).optional(),
  maxPartySize: z.number().int().min(1).max(50).optional(),
  callTimeoutMinutes: z.number().int().min(1).max(120).optional(),
});

export type QueueSettingsInput = z.infer<typeof QueueSettingsSchema>;

export const ETASettingsSchema = z.object({
  avgServiceTimeMins: z.number().int().min(1).max(180),
  serviceCapacityUnits: z.number().int().min(1).max(50),
  etaBufferMins: z.number().int().min(0).max(60),
  almostYourTurnThreshold: z.number().int().min(1).max(20),
});

export type ETASettingsInput = z.infer<typeof ETASettingsSchema>;

export interface PublicQueueStatusResponse {
  entryId: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  partySize: number;
  status: QueueStatus;
  position: number | null;
  peopleAhead: number | null;
  displayNumber: string | null;
  joinedAt: string;
  calledAt: string | null;
  seatedAt: string | null;
  tableNumber?: string | null;
  estimatedWaitMins: number | null;
  formattedETA: string;
  isAlmostYourTurn: boolean;
}

export class QueueService {
  /**
   * Joins a customer party to a restaurant queue atomically.
   */
  static async joinQueue(input: JoinQueueInput) {
    const validated = JoinQueueSchema.parse(input);
    const supabase = createAdminClient();

    const rawToken = generateQueueToken();
    const tokenHash = hashQueueToken(rawToken);

    // Call atomic PostgreSQL function for capacity & duplicate concurrency protection
    const { data: entry, error } = await supabase.rpc('join_queue_atomic', {
      p_restaurant_id: validated.restaurantId,
      p_customer_name: validated.customerName.trim(),
      p_customer_phone: validated.customerPhone ? validated.customerPhone.trim() : null,
      p_party_size: validated.partySize,
      p_token_hash: tokenHash,
    });

    if (error) {
      if (error.message.includes('QUEUE_OUTSIDE_OPERATING_HOURS')) {
        throw new Error('QUEUE_OUTSIDE_OPERATING_HOURS');
      }
      if (error.message.includes('QUEUE_PAUSED')) {
        throw new Error('QUEUE_PAUSED');
      }
      if (error.message.includes('QUEUE_CLOSED')) {
        throw new Error('QUEUE_CLOSED');
      }
      if (error.message.includes('INVALID_PARTY_SIZE')) {
        throw new Error('INVALID_PARTY_SIZE');
      }
      if (error.message.includes('QUEUE_FULL')) {
        throw new Error('QUEUE_FULL');
      }
      if (error.message.includes('DUPLICATE_ACTIVE_ENTRY') || error.code === '23505') {
        throw new Error('DUPLICATE_ACTIVE_ENTRY');
      }
      throw new Error(`Queue join failed: ${error.message}`);
    }

    // Outbox for QUEUE_JOINED is now inserted atomically inside join_queue_atomic (with pg_notify), no separate publish needed

    return {
      entry,
      rawToken,
    };
  }

  /**
   * Retrieves a customer's queue status using their secure raw token.
   * Calculates dynamic position, people ahead, and explainable ETA.
   */
  static async getQueueStatusByToken(rawToken: string): Promise<PublicQueueStatusResponse | null> {
    if (!rawToken) return null;
    const tokenHash = hashQueueToken(rawToken);

    const supabase = createAdminClient();

    const { data: entry, error } = await supabase
      .from('queue_entries')
      .select('*, restaurants!inner(name, avg_service_time_mins, service_capacity_units, eta_buffer_mins, almost_your_turn_threshold)')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !entry) {
      return null;
    }

    let position: number | null = null;
    let peopleAhead: number | null = null;

    if (['WAITING', 'NOTIFIED', 'CALLED'].includes(entry.status)) {
      // Position counts all active (WAITING/NOTIFIED/CALLED) ahead deterministically by joined_at + id
      const { count, error: countError } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', entry.restaurant_id)
        .in('status', ['WAITING', 'NOTIFIED', 'CALLED'])
        .or(`joined_at.lt.${entry.joined_at},and(joined_at.eq.${entry.joined_at},id.lt.${entry.id})`);

      if (!countError && count !== null) {
        position = count + 1;
        peopleAhead = count;
      }
    }

    const restaurantObj = entry.restaurants as unknown as {
      name: string;
      avg_service_time_mins?: number;
      service_capacity_units?: number;
      eta_buffer_mins?: number;
      almost_your_turn_threshold?: number;
    };

    const etaConfig: RestaurantETAConfig = {
      avgServiceTimeMins: restaurantObj?.avg_service_time_mins ?? 15,
      serviceCapacityUnits: restaurantObj?.service_capacity_units ?? 3,
      etaBufferMins: restaurantObj?.eta_buffer_mins ?? 5,
      almostYourTurnThreshold: restaurantObj?.almost_your_turn_threshold ?? 3,
    };

    const etaResult = ETAService.calculateETA(position, etaConfig);

    // Safe table number lookup for SEATED customers only (never expose internal table UUID)
    let tableNumber: string | null = null;
    if (entry.status === 'SEATED' && entry.seated_table_id) {
      const { data: tableData } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', entry.seated_table_id)
        .maybeSingle();
      if (tableData?.table_number) {
        tableNumber = String(tableData.table_number);
      }
    }

    const isCalled = entry.status === 'CALLED';
    const isSeated = entry.status === 'SEATED';

    return {
      entryId: entry.id,
      restaurantId: entry.restaurant_id,
      restaurantName: restaurantObj?.name || 'Restaurant',
      customerName: entry.customer_name,
      partySize: entry.party_size,
      status: entry.status,
      position: isCalled || isSeated ? null : position,
      peopleAhead: isCalled || isSeated ? null : peopleAhead,
      displayNumber: entry.display_number,
      joinedAt: entry.joined_at,
      calledAt: entry.called_at || entry.notified_at,
      seatedAt: entry.seated_at,
      tableNumber,
      estimatedWaitMins: isCalled || isSeated ? null : etaResult.estimatedWaitMins,
      formattedETA: isCalled ? 'Your turn is here' : isSeated ? 'Seated' : etaResult.formattedETA,
      isAlmostYourTurn: isCalled || isSeated ? false : etaResult.isAlmostYourTurn,
    };
  }

  // Canonical FSM definition (authoritative, production-safe)
  static readonly CANONICAL_TRANSITIONS: Record<string, string[]> = {
    WAITING: ['NOTIFIED', 'CALLED', 'CANCELLED', 'EXPIRED'],
    NOTIFIED: ['CALLED', 'CANCELLED', 'EXPIRED'],
    CALLED: ['NO_SHOW', 'CANCELLED', 'EXPIRED'],
    SEATED: [], // terminal - no transitions via updateQueueStatus (only via table lifecycle)
    CANCELLED: [],
    NO_SHOW: [],
    EXPIRED: [],
    COMPLETED: [], // legacy terminal
    REMOVED: [], // legacy terminal
    SKIPPED: [], // legacy terminal
  };

  static readonly TERMINAL_STATUSES = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED', 'COMPLETED', 'REMOVED', 'SKIPPED'];
  static readonly LEGACY_STATUSES = ['COMPLETED', 'REMOVED', 'SKIPPED'];

  static isTerminalStatus(status: string): boolean {
    return (QueueService.TERMINAL_STATUSES as string[]).includes(status);
  }

  static isValidTransition(from: string, to: string): boolean {
    if (from === to) return true;
    const allowed = QueueService.CANONICAL_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  /**
   * Centralized authoritative queue transition.
   * All queue status changes MUST flow through this method.
   * Validates FSM, handles idempotency, concurrency via conditional update, and ensures atomic side effects.
   */
  static async transitionQueue(input: UpdateQueueStatusInput & { requirePermission?: boolean; restaurantId?: string }) {
    return QueueService.updateQueueStatus(input);
  }

  /**
   * Updates queue entry status via atomic DB transaction (row lock + event + outbox + pg_notify).
   * Single authoritative transition layer - all queue status changes MUST flow here.
   */
  static async updateQueueStatus(input: UpdateQueueStatusInput) {
    const validated = UpdateQueueStatusSchema.parse(input);
    const supabase = createAdminClient();

    // Fast path: fetch current for auth and idempotency check (light)
    const { data: current, error: fetchErr } = await supabase
      .from('queue_entries')
      .select('restaurant_id, status')
      .eq('id', validated.entryId)
      .single();

    if (fetchErr || !current) {
      throw new Error('QUEUE_ENTRY_NOT_FOUND');
    }

    if (current.status === validated.newStatus) {
      // Idempotent - already in target
      const { data: full } = await supabase.from('queue_entries').select('*').eq('id', validated.entryId).single();
      return full || current;
    }

    // Authorization: staff requires permission, anon only CANCELLED
    if (validated.actorUserId) {
      let requiredPerm: string = PERMISSIONS.QUEUE_MANAGE;
      if (validated.newStatus === 'CANCELLED') requiredPerm = PERMISSIONS.QUEUE_CANCEL;
      await AuthorizationService.requirePermission({
        userId: validated.actorUserId,
        restaurantId: current.restaurant_id,
        permission: requiredPerm as unknown as typeof PERMISSIONS.QUEUE_MANAGE,
      });
    } else {
      if (validated.newStatus !== 'CANCELLED') {
        throw new Error('UNAUTHORIZED_QUEUE_ACTION: Anonymous can only cancel');
      }
    }

    // Client-side FSM pre-check (fast fail, DB will re-validate)
    if (QueueService.isTerminalStatus(current.status)) {
      throw new Error(`INVALID_QUEUE_TRANSITION: Cannot transition from terminal ${current.status} to ${validated.newStatus}`);
    }
    if (!QueueService.isValidTransition(current.status, validated.newStatus)) {
      throw new Error(`INVALID_QUEUE_TRANSITION: ${current.status} -> ${validated.newStatus} not allowed. Allowed: ${(QueueService.CANONICAL_TRANSITIONS[current.status] || []).join(', ')}`);
    }
    if (validated.newStatus === 'SEATED') {
      throw new Error('INVALID_QUEUE_TRANSITION: Use seating operation for SEATED');
    }
    if ((QueueService.LEGACY_STATUSES as string[]).includes(validated.newStatus)) {
      throw new Error(`INVALID_QUEUE_TRANSITION: ${validated.newStatus} is legacy`);
    }

    // Atomic DB transition (UPDATE + queue_events + outbox + audit + pg_notify in one transaction)
    const { data: updated, error: rpcErr } = await supabase.rpc('transition_queue_entry_atomic', {
      p_queue_entry_id: validated.entryId,
      p_target_status: validated.newStatus,
      p_actor_user_id: validated.actorUserId || null,
      p_reason: validated.reason || null,
    });

    if (rpcErr) {
      const msg = rpcErr.message || '';
      if (msg.includes('QUEUE_STATE_CONFLICT')) throw new Error('QUEUE_STATE_CONFLICT: Concurrent modification, please refresh');
      if (msg.includes('INVALID_QUEUE_TRANSITION')) throw new Error(msg);
      if (msg.includes('QUEUE_ENTRY_NOT_FOUND')) throw new Error('QUEUE_ENTRY_NOT_FOUND');
      throw new Error(msg || `Failed to update queue status: ${rpcErr.message}`);
    }

    return updated as unknown as typeof current;
  }

  /**
   * Atomically seats a queue entry at an available suitable table.
   *
   * Authorization: Requires queue.seat permission for the restaurant that owns
   * the queue entry. The authenticated user ID is derived from the session;
   * p_actor_user_id is passed through for audit logging but the DB function
   * independently verifies the permission via auth.uid().
   *
   * @throws AuthorizationError if caller lacks queue.seat permission
   * @throws Error with descriptive code if FSM state is invalid
   */
  static async seatQueueEntry(
    entryId: string,
    tableId: string,
    actorUserId?: string,
    actualGuests?: number,
    additionalTableIds?: string[]
  ) {
    const supabase = createAdminClient();

    // Step 1: Fetch entry to get restaurant_id for permission check
    const { data: entry, error: fetchErr } = await supabase
      .from('queue_entries')
      .select('restaurant_id, party_size, status')
      .eq('id', entryId)
      .single();

    if (fetchErr || !entry) {
      throw new Error('QUEUE_ENTRY_NOT_FOUND');
    }

    // Step 2: Enforce authorization — must have queue.seat permission
    const authContext = await AuthorizationService.requirePermission({
      userId: actorUserId,
      restaurantId: entry.restaurant_id,
      permission: PERMISSIONS.QUEUE_SEAT,
    });

    const seatingCount =
      Number.isInteger(actualGuests) && (actualGuests as number) > 0
        ? (actualGuests as number)
        : (entry as unknown as { party_size?: number }).party_size ?? 1;

    // Multi-table combination handling
    if (additionalTableIds && additionalTableIds.length > 0) {
      const allTableIds = [tableId, ...additionalTableIds];
      const { data: tables, error: tableErr } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, capacity, status, is_archived, restaurant_id')
        .in('id', allTableIds);

      if (tableErr || !tables || tables.length !== allTableIds.length) {
        throw new Error('TABLE_NOT_FOUND: One or more selected tables not found');
      }

      for (const t of tables) {
        if (t.restaurant_id !== entry.restaurant_id) throw new Error('TENANT_MISMATCH');
        if (t.is_archived) throw new Error('TABLE_ARCHIVED: Cannot seat at an archived table');
        if (t.status !== 'AVAILABLE') throw new Error('TABLE_NOT_AVAILABLE');
      }

      const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
      if (totalCapacity < seatingCount) {
        throw new Error('INSUFFICIENT_TABLE_CAPACITY');
      }

      const primaryTable = tables.find(t => t.id === tableId) || tables[0];
      if (!primaryTable) {
        throw new Error('PRIMARY_TABLE_NOT_FOUND');
      }

      // Atomically seat the entry with primary table
      const res = await supabase.rpc('seat_queue_entry_atomic', {
        p_queue_entry_id: entryId,
        p_table_id: tableId,
        p_actor_user_id: authContext.userId,
        p_actual_guests: Math.min(primaryTable.capacity, seatingCount),
      });

      if (res.error) {
        const errorMsg = res.error.message || '';
        if (errorMsg.includes('QUEUE_ENTRY_ALREADY_SEATED') || errorMsg.includes('SEATED')) {
          throw new Error('QUEUE_ENTRY_ALREADY_SEATED');
        }
        if (errorMsg.includes('QUEUE_ENTRY_NOT_SEATABLE')) {
          throw new Error('QUEUE_ENTRY_NOT_SEATABLE');
        }
        if (errorMsg.includes('TABLE_NOT_AVAILABLE')) {
          throw new Error('TABLE_NOT_AVAILABLE');
        }
        throw new Error(`Seating failed: ${errorMsg}`);
      }

      // Mark all additional tables as OCCUPIED
      const nowIso = new Date().toISOString();
      for (const addId of additionalTableIds) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'OCCUPIED', updated_at: nowIso })
          .eq('id', addId);
      }

      // Record total headcount and combined table metadata
      await supabase
        .from('queue_entries')
        .update({ actual_guests: seatingCount, updated_at: nowIso })
        .eq('id', entryId);

      const combinedNumbers = tables.map(t => t.table_number).join(' + ');

      await supabase.from('queue_events').insert({
        restaurant_id: entry.restaurant_id,
        queue_entry_id: entryId,
        event_type: 'QUEUE_SEATED',
        actor_user_id: authContext.userId,
        metadata: {
          table_id: tableId,
          additional_table_ids: additionalTableIds,
          combined_table_numbers: combinedNumbers,
          party_size: entry.party_size,
          actual_guests: seatingCount,
          total_capacity: totalCapacity,
        },
      });

      return {
        success: true,
        queueEntryId: entryId,
        tableId,
        additionalTableIds,
        combined_table_numbers: combinedNumbers,
        actualGuests: seatingCount,
      };
    }
    let rpcError: { message: string } | null = null;
    let data: unknown = null;
    {
      const res = await supabase.rpc('seat_queue_entry_atomic', {
        p_queue_entry_id: entryId,
        p_table_id: tableId,
        p_actor_user_id: authContext.userId,
        p_actual_guests: seatingCount,
      });
      data = res.data;
      rpcError = res.error as { message: string } | null;
      // Graceful fallback: if the migration adding p_actual_guests hasn't
      // been applied yet, retry with the legacy 3-arg signature.
      if (rpcError && /p_actual_guests|function.*does not exist/i.test(rpcError.message || '')) {
        const legacy = await supabase.rpc('seat_queue_entry_atomic', {
          p_queue_entry_id: entryId,
          p_table_id: tableId,
          p_actor_user_id: authContext.userId,
        });
        data = legacy.data;
        rpcError = legacy.error as { message: string } | null;
      }
    }
    const error = rpcError;

    if (error) {
      if (error.message.includes('QUEUE_ENTRY_TERMINAL')) {
        throw new Error('QUEUE_ENTRY_TERMINAL: Cannot seat a queue entry in a terminal state');
      }
      // Phase 3E: surface FSM rejections verbatim before the SEATED-substring
      // fallback below (which would otherwise mislabel them as ALREADY_SEATED).
      if (error.message.includes('INVALID_QUEUE_TRANSITION')) {
        throw new Error(error.message);
      }
      if (error.message.includes('QUEUE_ENTRY_ALREADY_SEATED') || error.message.includes('SEATED')) {
        throw new Error('QUEUE_ENTRY_ALREADY_SEATED');
      }
      if (error.message.includes('QUEUE_ENTRY_NOT_SEATABLE')) {
        throw new Error('QUEUE_ENTRY_NOT_SEATABLE');
      }
      if (error.message.includes('TABLE_NOT_AVAILABLE')) {
        throw new Error('TABLE_NOT_AVAILABLE');
      }
      if (error.message.includes('INSUFFICIENT_TABLE_CAPACITY')) {
        throw new Error('INSUFFICIENT_TABLE_CAPACITY');
      }
      if (error.message.includes('TENANT_MISMATCH')) {
        throw new Error('TENANT_MISMATCH');
      }
      if (error.message.includes('UNAUTHORIZED')) {
        throw new Error('UNAUTHORIZED: Insufficient permissions to seat queue entry');
      }
      if (error.message.includes('TABLE_ARCHIVED')) {
        throw new Error('TABLE_ARCHIVED: Cannot seat at an archived table');
      }
      throw new Error(`Seating failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Fetches available tables suitable for seating a party size.
   */
  static async getSeatableTables(restaurantId: string, partySize: number) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*, restaurant_zones(name)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'AVAILABLE')
      .eq('is_archived', false)
      .gte('capacity', partySize)
      .order('capacity', { ascending: true })
      .order('table_number', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch seatable tables: ${error.message}`);
    }

    return data;
  }

  /**
   * Returns active queue entries for a restaurant with real-time positions.
   * Filters out entries from before the daily 5 AM reset boundary.
   */
  static async getActiveQueue(restaurantId: string) {
    const supabase = createAdminClient();

    // Get timezone
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('timezone')
      .eq('id', restaurantId)
      .single();

    const { data: cutoffData, error: cutoffError } = await supabase.rpc('get_recent_5am_cutoff', {
      p_timezone: restaurant?.timezone || 'UTC'
    });

    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['WAITING', 'NOTIFIED', 'CALLED'])
      .order('joined_at', { ascending: true })
      .order('id', { ascending: true });
      
    if (!cutoffError && cutoffData) {
      query = query.gte('joined_at', cutoffData);
    }

    const { data: entries, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch active queue: ${error.message}`);
    }

    const priority: Record<string, number> = { CALLED: 0, NOTIFIED: 1, WAITING: 2 };
    entries.sort((a, b) => {
      const pa = priority[a.status] ?? 9;
      const pb = priority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime();
    });

    let activeCount = 0;
    const formatted = entries.map((entry) => {
      let position: number | null = null;
      let peopleAhead: number | null = null;

      if (['WAITING', 'NOTIFIED', 'CALLED'].includes(entry.status)) {
        activeCount += 1;
        position = activeCount;
        peopleAhead = activeCount - 1;
      }

      return {
        ...entry,
        position,
        peopleAhead,
      };
    });

    return formatted;
  }

  /**
   * Returns queue entries filtered by status and optional search term.
   */
  static async getAllQueueEntries(restaurantId: string, filterStatus?: string, search?: string) {
    const supabase = createAdminClient();

    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (filterStatus && filterStatus !== 'ALL') {
      if (filterStatus === 'ACTIVE' || filterStatus === 'WAITING' || filterStatus === 'CALLED' || filterStatus === 'NOTIFIED') {
        if (filterStatus === 'ACTIVE') {
          query = query.in('status', ['WAITING', 'NOTIFIED', 'CALLED']);
        } else {
          query = query.eq('status', filterStatus);
        }
        
        // Filter out active entries from previous days (before 5 AM cutoff)
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('timezone')
          .eq('id', restaurantId)
          .single();

        const { data: cutoffData, error: cutoffError } = await supabase.rpc('get_recent_5am_cutoff', {
          p_timezone: restaurant?.timezone || 'UTC'
        });
        
        if (!cutoffError && cutoffData) {
          query = query.gte('joined_at', cutoffData);
        }
      } else if (filterStatus === 'TERMINAL') {
        query = query.in('status', ['CANCELLED', 'NO_SHOW', 'EXPIRED', 'COMPLETED']);
      } else {
        query = query.eq('status', filterStatus);
      }
    }

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      query = query.or(`customer_name.ilike.${q},display_number.ilike.${q},customer_phone.ilike.${q}`);
    }

    const isActiveQuery = !filterStatus || filterStatus === 'ACTIVE' || filterStatus === 'WAITING' || filterStatus === 'CALLED' || filterStatus === 'NOTIFIED';
    
    if (isActiveQuery) {
      query = query.order('joined_at', { ascending: true }).order('id', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: entries, error } = await query.limit(200);

    if (error) {
      throw new Error(`Failed to list queue entries: ${error.message}`);
    }

    if (isActiveQuery) {
      const priority: Record<string, number> = { CALLED: 0, NOTIFIED: 1, WAITING: 2 };
      entries.sort((a, b) => {
        const pa = priority[a.status] ?? 9;
        const pb = priority[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime();
      });
    } else {
      entries.sort((a, b) => new Date(b.created_at || b.joined_at).getTime() - new Date(a.created_at || a.joined_at).getTime());
    }

    return entries;
  }

  /**
   * Fetches full timeline history of queue events for a specific queue entry.
   */
  static async getQueueEntryEvents(entryId: string) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('queue_events')
      .select('*')
      .eq('queue_entry_id', entryId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch queue events: ${error.message}`);
    }

    return data;
  }

  /**
   * Opens or closes the restaurant queue.
   */
  static async toggleQueueOpen(restaurantId: string, open: boolean, actorUserId: string) {
    const supabase = createAdminClient();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .update({
        queue_enabled: open,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId)
      .select('id, name, queue_enabled')
      .single();

    if (error) {
      throw new Error(`Failed to toggle queue state: ${error.message}`);
    }

    await supabase.from('audit_logs').insert({
      restaurant_id: restaurantId,
      actor_user_id: actorUserId,
      action: open ? 'queue_opened' : 'queue_closed',
      entity_type: 'restaurant',
      entity_id: restaurantId,
      metadata: {
        queueEnabled: open,
      },
    });

    return restaurant;
  }

  /**
   * Updates restaurant queue operating settings.
   */
  static async updateQueueSettings(restaurantId: string, settings: QueueSettingsInput, actorUserId: string) {
    const validated = QueueSettingsSchema.parse(settings);
    const supabase = createAdminClient();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.queueEnabled !== undefined) payload.queue_enabled = validated.queueEnabled;
    if (validated.maxQueueCapacity !== undefined) payload.max_queue_capacity = validated.maxQueueCapacity;
    if (validated.minPartySize !== undefined) payload.min_party_size = validated.minPartySize;
    if (validated.maxPartySize !== undefined) payload.max_party_size = validated.maxPartySize;
    if (validated.callTimeoutMinutes !== undefined) payload.call_timeout_minutes = validated.callTimeoutMinutes;

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurantId)
      .select('id, queue_enabled, max_queue_capacity, min_party_size, max_party_size, call_timeout_minutes')
      .single();

    if (error) {
      throw new Error(`Failed to update queue settings: ${error.message}`);
    }

    await supabase.from('audit_logs').insert({
      restaurant_id: restaurantId,
      actor_user_id: actorUserId,
      action: 'queue_settings_updated',
      entity_type: 'restaurant',
      entity_id: restaurantId,
      metadata: payload,
    });

    return updated;
  }

  /**
   * Updates restaurant ETA settings.
   */
  static async updateETASettings(restaurantId: string, settings: ETASettingsInput, actorUserId: string) {
    const validated = ETASettingsSchema.parse(settings);
    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update({
        avg_service_time_mins: validated.avgServiceTimeMins,
        service_capacity_units: validated.serviceCapacityUnits,
        eta_buffer_mins: validated.etaBufferMins,
        almost_your_turn_threshold: validated.almostYourTurnThreshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restaurantId)
      .select('id, avg_service_time_mins, service_capacity_units, eta_buffer_mins, almost_your_turn_threshold')
      .single();

    if (error) {
      throw new Error(`Failed to update ETA settings: ${error.message}`);
    }

    await supabase.from('audit_logs').insert({
      restaurant_id: restaurantId,
      actor_user_id: actorUserId,
      action: 'eta_settings_updated',
      entity_type: 'restaurant',
      entity_id: restaurantId,
      metadata: validated,
    });

    return updated;
  }

  /**
   * Get current queue operating state for restaurant (for public display)
   */
  static async getQueueOperatingState(restaurantId: string): Promise<{ operatingState: QueueOperatingState; queueEnabled: boolean; isFull: boolean }> {
    const supabase = createAdminClient();
    const { data: restaurant, error } = await supabase.from('restaurants').select('queue_enabled, queue_operating_state, max_queue_capacity').eq('id', restaurantId).single();
    if (error || !restaurant) throw new Error('Restaurant not found');
    const operatingState = (restaurant as unknown as { queue_operating_state: QueueOperatingState }).queue_operating_state || 'OPEN';
    const queueEnabled = restaurant.queue_enabled;
    const { count } = await supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).in('status', ['WAITING','NOTIFIED','CALLED']);
    const isFull = (count || 0) >= restaurant.max_queue_capacity;
    return { operatingState, queueEnabled, isFull };
  }

  /**
   * Set queue operating state (OPEN/PAUSED/CLOSING_SOON/CLOSED) — authoritative, idempotent, audited
   */
  static async setQueueOperatingState(restaurantId: string, newState: QueueOperatingState, actorUserId: string, reason?: string) {
    const supabase = createAdminClient();
    await AuthorizationService.requirePermission({ userId: actorUserId, restaurantId, permission: PERMISSIONS.QUEUE_MANAGE });
    const { data, error } = await supabase.rpc('set_queue_operating_state', {
      p_restaurant_id: restaurantId,
      p_new_state: newState,
      p_actor_user_id: actorUserId,
      p_reason: reason || null,
    });
    if (error) {
      if (error.message.includes('QUEUE_STATE_CONFLICT')) throw new Error('QUEUE_STATE_CONFLICT');
      if (error.message.includes('INVALID_OPERATING_STATE')) throw new Error('INVALID_OPERATING_STATE');
      throw new Error(`Failed to set queue operating state: ${error.message}`);
    }
    // Invalidate public cache so QR page reflects new state quickly
    try {
      const { CacheService, CacheKeys } = await import('@/lib/cache');
      // Find slug for cache invalidation
      const { data: rest } = await supabase.from('restaurants').select('slug').eq('id', restaurantId).single();
      if (rest) await CacheService.invalidate(CacheKeys.publicRestaurant(rest.slug));
    } catch {}
    return data;
  }

  /**
   * Expire overdue CALLED entries to NO_SHOW (server-authoritative, batch, idempotent)
   */
  static async expireOverdueCalledEntries(limit = 50): Promise<{ expiredCount: number; expiredIds: string[] }> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('expire_overdue_called_queue_entries', { p_limit: limit });
    if (error) throw new Error(`Failed to expire overdue: ${error.message}`);
    const row = Array.isArray(data) ? (data[0] as unknown as { expired_count: number; expired_ids: string[] }) : (data as unknown as { expired_count: number; expired_ids: string[] });
    return { expiredCount: row?.expired_count || 0, expiredIds: row?.expired_ids || [] };
  }

  /**
   * Recommend tables for a queue entry (supports both single tables and combined table pairs)
   */
  static async recommendTablesForQueueEntry(queueEntryId: string, actorUserId?: string) {
    const supabase = createAdminClient();
    // Validate queue entry is seatable and get restaurant
    const { data: entry, error: fetchErr } = await supabase.from('queue_entries').select('restaurant_id, party_size, status').eq('id', queueEntryId).single();
    if (fetchErr || !entry) throw new Error('QUEUE_ENTRY_NOT_FOUND');
    if (!['WAITING','NOTIFIED','CALLED'].includes(entry.status)) throw new Error('QUEUE_ENTRY_NOT_SEATABLE');
    // Permission check if actor provided - viewing recommendations requires queue.view
    if (actorUserId) {
      await AuthorizationService.requirePermission({ userId: actorUserId, restaurantId: entry.restaurant_id, permission: PERMISSIONS.QUEUE_VIEW });
    }

    // 1. Single table recommendations from DB RPC
    let singleRecs: Array<{
      table_id: string;
      table_number: string;
      capacity: number;
      zone_name: string | null;
      rank: number;
      reason: string;
      is_combination?: boolean;
      table_ids?: string[];
      combination_labels?: string[];
    }> = [];

    interface RpcRec {
      table_id: string;
      table_number: string;
      capacity: number;
      zone_name: string;
      rank: number;
      reason?: string;
    }

    try {
      const { data, error } = await supabase.rpc('recommend_tables_for_queue_entry', { p_queue_entry_id: queueEntryId });
      if (!error && Array.isArray(data)) {
        singleRecs = (data as unknown as RpcRec[]).map((r) => ({
          ...r,
          reason: r.reason || `Fits party size of ${entry.party_size}`,
          is_combination: false,
          table_ids: [r.table_id],
          combination_labels: [r.table_number],
        }));
      }
    } catch {
      // Fallback if RPC encounters error
    }

    // 2. Fetch available tables to calculate combinations
    const { data: availTables } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, capacity, zone_id, restaurant_zones(name)')
      .eq('restaurant_id', entry.restaurant_id)
      .eq('status', 'AVAILABLE')
      .eq('is_archived', false)
      .order('capacity', { ascending: true })
      .order('table_number', { ascending: true });

    const available = availTables || [];
    const partySize = entry.party_size || 1;
    const combinations: typeof singleRecs = [];

    const extractZoneName = (rz: unknown): string => {
      if (!rz) return '';
      if (Array.isArray(rz) && rz.length > 0) return String((rz[0] as { name?: unknown }).name || '');
      if (typeof rz === 'object' && rz !== null && 'name' in rz) return String((rz as { name?: unknown }).name || '');
      return '';
    };

    if (available.length >= 2) {
      interface PairCandidate {
        t1: typeof available[0];
        t2: typeof available[0];
        combinedCap: number;
        waste: number;
        sameZone: boolean;
      }
      const pairs: PairCandidate[] = [];

      for (let i = 0; i < available.length; i++) {
        for (let j = i + 1; j < available.length; j++) {
          const t1 = available[i];
          const t2 = available[j];
          if (!t1 || !t2) continue;
          const combinedCap = (t1.capacity || 0) + (t2.capacity || 0);
          if (combinedCap >= partySize) {
            const waste = combinedCap - partySize;
            const sameZone = t1.zone_id && t2.zone_id ? t1.zone_id === t2.zone_id : false;
            pairs.push({ t1, t2, combinedCap, waste, sameZone });
          }
        }
      }

      // Sort pairs: same zone first, then minimal waste, then lowest combined cap
      pairs.sort((a, b) => {
        if (a.sameZone !== b.sameZone) return a.sameZone ? -1 : 1;
        if (a.waste !== b.waste) return a.waste - b.waste;
        return a.combinedCap - b.combinedCap;
      });

      // Include top 3 combination candidates
      for (let idx = 0; idx < Math.min(3, pairs.length); idx++) {
        const pair = pairs[idx];
        if (!pair) continue;
        const zone1 = extractZoneName(pair.t1.restaurant_zones);
        const zone2 = extractZoneName(pair.t2.restaurant_zones);
        const zoneLabel = pair.sameZone ? (zone1 || 'Same Zone') : `${zone1 || 'Area 1'} + ${zone2 || 'Area 2'}`;

        combinations.push({
          table_id: `${pair.t1.id}+${pair.t2.id}`,
          table_number: `${pair.t1.table_number} + ${pair.t2.table_number}`,
          capacity: pair.combinedCap,
          zone_name: zoneLabel,
          rank: 20 + idx,
          reason: `Combine Table ${pair.t1.table_number} (${pair.t1.capacity} seats) + Table ${pair.t2.table_number} (${pair.t2.capacity} seats) = ${pair.combinedCap} seats`,
          is_combination: true,
          table_ids: [pair.t1.id, pair.t2.id],
          combination_labels: [pair.t1.table_number, pair.t2.table_number],
        });
      }
    }

    // If no single table can seat the party (e.g. 7 guests and two 4-person tables),
    // combinations take precedence at the top!
    if (singleRecs.length === 0) {
      return combinations;
    }

    return [...singleRecs, ...combinations];
  }

  /**
   * Get queue health - server-side aggregation, no browser fetching of all rows
   */
  static async getQueueHealth(restaurantId: string, actorUserId?: string): Promise<QueueHealth & { scheduledOpen: boolean; nextOpening: { dayOffset: number; dayLabel: string; opensAt: string; opensAt12h: string } | null }> {
    if (actorUserId) {
      await AuthorizationService.requirePermission({ userId: actorUserId, restaurantId, permission: PERMISSIONS.QUEUE_VIEW });
    }
    const supabase = createAdminClient();
    const { data: restaurant, error: restErr } = await supabase.from('restaurants').select('queue_enabled, queue_operating_state, max_queue_capacity, call_timeout_minutes, timezone, status').eq('id', restaurantId).single();
    if (restErr || !restaurant) throw new Error('Restaurant not found');
    const queueEnabled = restaurant.queue_enabled;
    const operatingState = (restaurant as unknown as { queue_operating_state: QueueOperatingState }).queue_operating_state || 'OPEN';
    const maxCapacity = restaurant.max_queue_capacity;
    const tz = (restaurant as unknown as { timezone?: string }).timezone || 'Asia/Kolkata';
    const lifecycle = (restaurant as unknown as { status?: string }).status || 'ACTIVE';

    // Parallel aggregates
    const [
      activeRes,
      waitingRes,
      notifiedRes,
      calledRes,
      seatedRes,
      noShowRes,
      oldestRes,
      tablesRes,
    ] = await Promise.all([
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).in('status', ['WAITING','NOTIFIED','CALLED']),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'WAITING'),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'NOTIFIED'),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'CALLED'),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'SEATED'),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'NO_SHOW').gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString()),
      supabase.from('queue_entries').select('joined_at').eq('restaurant_id', restaurantId).eq('status', 'WAITING').order('joined_at', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('restaurant_tables').select('status').eq('restaurant_id', restaurantId).eq('is_archived', false),
    ]);

    let overdueCount = 0;
    try {
      const timeoutMins = restaurant.call_timeout_minutes || 15;
      const { count } = await supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('status', 'CALLED').lt('called_at', new Date(Date.now() - timeoutMins*60*1000).toISOString());
      overdueCount = count || 0;
    } catch { overdueCount = 0; }

    const activeCount = activeRes.count || 0;
    const waitingCount = waitingRes.count || 0;
    const notifiedCount = notifiedRes.count || 0;
    const calledCount = calledRes.count || 0;
    const seatedCount = seatedRes.count || 0;
    const noShowCountToday = noShowRes.count || 0;
    // maybeSingle() returns { data: row | null } — the row itself holds joined_at
    const oldestRow = (oldestRes as unknown as { data: { joined_at: string } | null }).data;
    const oldestWaitingAgeMins = oldestRow?.joined_at ? Math.floor((Date.now() - new Date(oldestRow.joined_at).getTime())/60000) : null;
    const tables = (tablesRes as unknown as { data: Array<{ status: string }> | null })?.data || [];
    const availableTables = tables.filter((t: { status: string }) => t.status === 'AVAILABLE').length;
    const occupiedTables = tables.filter((t: { status: string }) => t.status === 'OCCUPIED').length;
    const cleaningTables = tables.filter((t: { status: string }) => t.status === 'CLEANING').length;
    const reservedTables = tables.filter((t: { status: string }) => t.status === 'RESERVED').length;
    const outOfServiceTables = tables.filter((t: { status: string }) => t.status === 'OUT_OF_SERVICE').length;
    const totalTables = tables.length;

    // Calculate avg wait via ETA service if needed (simplified: use oldest waiting)
    let avgWaitMins: number | null = null;
    if (activeCount > 0 && oldestWaitingAgeMins !== null) {
      avgWaitMins = oldestWaitingAgeMins;
    }

    const isFull = activeCount >= maxCapacity;

    // Scheduled hours (read-only for health; authoritative join still enforced in DB)
    let scheduledOpen = true;
    let nextOpening: { dayOffset: number; dayLabel: string; opensAt: string; opensAt12h: string } | null = null;
    try {
      const { QueueScheduleService } = await import('@/lib/services/queue-schedule-service');
      const schedule = await QueueScheduleService.getSchedule(restaurantId);
      const { getLocalDayTime, isOpenBySchedule } = await import('@/lib/services/queue-schedule-service');
      const { dow, minutes } = getLocalDayTime(tz);
      scheduledOpen = isOpenBySchedule(schedule, dow, minutes);
      nextOpening = QueueScheduleService.getNextOpening(schedule, tz);
    } catch { scheduledOpen = true; }

    // Health classification priority: lifecycle/disabled CLOSED > manual PAUSED > manual CLOSED > scheduled CLOSED > CRITICAL > BUSY > EMPTY > HEALTHY
    // Manual PAUSED/CLOSED take precedence over schedule (schedule never reopens a paused queue).
    let health: QueueHealthState = 'HEALTHY';
    let healthReason = 'Queue is healthy';
    if (lifecycle !== 'ACTIVE' || !queueEnabled || operatingState === 'CLOSED') {
      health = 'CLOSED';
      healthReason = lifecycle !== 'ACTIVE' ? 'Restaurant unavailable' : !queueEnabled ? 'Queue is closed' : 'Queue is closed';
    } else if (operatingState === 'PAUSED') {
      health = 'PAUSED';
      healthReason = 'Queue is paused';
    } else if (!scheduledOpen) {
      health = 'CLOSED';
      healthReason = nextOpening ? `Closed · Opens ${nextOpening.dayOffset === 0 ? 'today' : nextOpening.dayLabel} ${nextOpening.opensAt12h}` : 'Closed · Outside operating hours';
    } else if (activeCount === 0) {
      health = 'EMPTY';
      healthReason = 'No active queue';
    } else if (activeCount >= maxCapacity * 0.9 || overdueCount > 0 || (activeCount > 0 && availableTables === 0)) {
      health = 'CRITICAL';
      if (overdueCount > 0) healthReason = `${overdueCount} overdue called`;
      else if (availableTables === 0) healthReason = 'No available tables';
      else healthReason = `Queue ${Math.round(activeCount/maxCapacity*100)}% full`;
    } else if (activeCount >= maxCapacity * 0.6) {
      health = 'BUSY';
      healthReason = `Queue ${Math.round(activeCount/maxCapacity*100)}% full`;
    }

    return {
      activeCount, waitingCount, notifiedCount, calledCount, seatedCount, noShowCountToday,
      avgWaitMins, oldestWaitingAgeMins, overdueCount,
      availableTables, occupiedTables, cleaningTables, reservedTables, outOfServiceTables, totalTables,
      operatingState, queueEnabled, isFull, health, healthReason, scheduledOpen, nextOpening,
    };
  }

  /**
   * Today's business-day queue summary for dashboard secondary metrics.
   * Single lightweight query scoped to entries created since the 5 AM
   * business-day cutoff (falls back to local midnight). Guests seated uses
   * seat-time headcount (actual_guests) with party_size fallback.
   * Read-only aggregation — no permission beyond caller context needed.
   */
  static async getTodayQueueSummary(restaurantId: string): Promise<{
    seatedGroups: number;
    seatedGuests: number;
    noShows: number;
    cancelled: number;
  }> {
    const supabase = createAdminClient();
    let cutoffISO: string | null = null;
    try {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('timezone')
        .eq('id', restaurantId)
        .single();
      const { data: cutoff } = await supabase.rpc('get_recent_5am_cutoff', {
        p_timezone: (restaurant as unknown as { timezone?: string } | null)?.timezone || 'UTC',
      });
      if (cutoff) cutoffISO = cutoff as string;
    } catch {
      cutoffISO = null;
    }
    if (!cutoffISO) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      cutoffISO = start.toISOString();
    }

    const { data, error } = await supabase
      .from('queue_entries')
      .select('status, party_size, actual_guests')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', cutoffISO);
    if (error || !data) {
      return { seatedGroups: 0, seatedGuests: 0, noShows: 0, cancelled: 0 };
    }
    let seatedGroups = 0;
    let seatedGuests = 0;
    let noShows = 0;
    let cancelled = 0;
    for (const e of data as Array<{ status: string; party_size: number; actual_guests: number | null }>) {
      if (e.status === 'SEATED') {
        seatedGroups += 1;
        seatedGuests += e.actual_guests ?? e.party_size ?? 0;
      } else if (e.status === 'NO_SHOW') {
        noShows += 1;
      } else if (e.status === 'CANCELLED') {
        cancelled += 1;
      }
    }
    return { seatedGroups, seatedGuests, noShows, cancelled };
  }

  /**
   * Pure, dependency-free fallback health computed from already-fetched rows.
   * NEVER throws — used by pages so a health failure can never crash the UI.
   * Same classification priority as getQueueHealth, without schedule lookup
   * (scheduledOpen defaults to true when unknown).
   */
  static buildFallbackQueueHealth(input: {
    restaurant: {
      queue_enabled?: boolean | null;
      queue_operating_state?: string | null;
      max_queue_capacity?: number | null;
      call_timeout_minutes?: number | null;
      status?: string | null;
    };
    activeEntries: Array<{ status: string; joined_at?: string; called_at?: string | null; created_at?: string }>;
    tables: Array<{ status: string }>;
  }): QueueHealth & { scheduledOpen: boolean; nextOpening: null } {
    try {
      const queueEnabled = input.restaurant.queue_enabled ?? true;
      const operatingState = ((input.restaurant.queue_operating_state || 'OPEN') as QueueOperatingState);
      const maxCapacity = input.restaurant.max_queue_capacity ?? 100;
      const timeoutMins = input.restaurant.call_timeout_minutes ?? 15;
      const lifecycle = input.restaurant.status || 'ACTIVE';
      const now = Date.now();

      const entries = Array.isArray(input.activeEntries) ? input.activeEntries : [];
      const tables = Array.isArray(input.tables) ? input.tables : [];

      const waitingCount = entries.filter((e) => e.status === 'WAITING').length;
      const notifiedCount = entries.filter((e) => e.status === 'NOTIFIED').length;
      const calledCount = entries.filter((e) => e.status === 'CALLED').length;
      const activeCount = waitingCount + notifiedCount + calledCount;
      const seatedCount = entries.filter((e) => e.status === 'SEATED').length;
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const noShowCountToday = entries.filter((e) => {
        if (e.status !== 'NO_SHOW') return false;
        if (!e.created_at) return true;
        const t = new Date(e.created_at).getTime();
        return Number.isNaN(t) || t >= dayAgo;
      }).length;

      const waitingAges = entries
        .filter((e) => e.status === 'WAITING' && e.joined_at)
        .map((e) => now - new Date(e.joined_at as string).getTime())
        .filter((ms) => !Number.isNaN(ms) && ms >= 0);
      const oldestWaitingAgeMins = waitingAges.length > 0 ? Math.floor(Math.max(...waitingAges) / 60000) : null;

      const overdueCount = entries.filter((e) => {
        if (e.status !== 'CALLED' || !e.called_at) return false;
        const calledMs = new Date(e.called_at).getTime();
        if (Number.isNaN(calledMs)) return false;
        return now - calledMs > timeoutMins * 60 * 1000;
      }).length;

      const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
      const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
      const cleaningTables = tables.filter((t) => t.status === 'CLEANING').length;
      const reservedTables = tables.filter((t) => t.status === 'RESERVED').length;
      const outOfServiceTables = tables.filter((t) => t.status === 'OUT_OF_SERVICE').length;
      const totalTables = tables.length;

      const avgWaitMins = activeCount > 0 && oldestWaitingAgeMins !== null ? oldestWaitingAgeMins : null;
      const isFull = activeCount >= maxCapacity;

      let health: QueueHealthState = 'HEALTHY';
      let healthReason = 'Queue is healthy';
      if (lifecycle !== 'ACTIVE' || !queueEnabled || operatingState === 'CLOSED') {
        health = 'CLOSED';
        healthReason = lifecycle !== 'ACTIVE' ? 'Restaurant unavailable' : 'Queue is closed';
      } else if (operatingState === 'PAUSED') {
        health = 'PAUSED';
        healthReason = 'Queue is paused';
      } else if (activeCount === 0) {
        health = 'EMPTY';
        healthReason = 'No active queue';
      } else if (activeCount >= maxCapacity * 0.9 || overdueCount > 0 || (activeCount > 0 && availableTables === 0)) {
        health = 'CRITICAL';
        if (overdueCount > 0) healthReason = `${overdueCount} overdue called`;
        else if (availableTables === 0) healthReason = 'No available tables';
        else healthReason = `Queue ${Math.round((activeCount / maxCapacity) * 100)}% full`;
      } else if (activeCount >= maxCapacity * 0.6) {
        health = 'BUSY';
        healthReason = `Queue ${Math.round((activeCount / maxCapacity) * 100)}% full`;
      }

      return {
        activeCount, waitingCount, notifiedCount, calledCount, seatedCount, noShowCountToday,
        avgWaitMins, oldestWaitingAgeMins, overdueCount,
        availableTables, occupiedTables, cleaningTables, reservedTables, outOfServiceTables, totalTables,
        operatingState, queueEnabled, isFull, health, healthReason, scheduledOpen: true, nextOpening: null,
      };
    } catch {
      // Absolute last resort — a health card must never crash the page
      return {
        activeCount: 0, waitingCount: 0, notifiedCount: 0, calledCount: 0, seatedCount: 0, noShowCountToday: 0,
        avgWaitMins: null, oldestWaitingAgeMins: null, overdueCount: 0,
        availableTables: 0, occupiedTables: 0, cleaningTables: 0, reservedTables: 0, outOfServiceTables: 0, totalTables: 0,
        operatingState: 'OPEN' as QueueOperatingState, queueEnabled: true, isFull: false,
        health: 'EMPTY' as QueueHealthState, healthReason: 'No active queue',
        scheduledOpen: true, nextOpening: null,
      };
    }
  }
}
