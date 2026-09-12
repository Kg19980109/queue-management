import { createAdminClient } from '@/lib/db/supabase/admin';
import { QueueStatus } from '@/types/database.types';
import { generateQueueToken, hashQueueToken } from '@/lib/utils/token-utils';
import { ETAService, RestaurantETAConfig } from '@/lib/services/eta-service';
import { OutboxService } from '@/lib/services/outbox-service';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { logger } from '@/lib/logging/logger';
import { z } from 'zod';

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

    // Publish Outbox Event for background notifications
    try {
      await OutboxService.publishEvent({
        restaurantId: validated.restaurantId,
        eventType: 'QUEUE_JOINED',
        aggregateType: 'QUEUE',
        aggregateId: entry.id,
        payload: {
          customerName: validated.customerName,
          partySize: validated.partySize,
          queueNumber: entry.queue_number,
          displayNumber: entry.display_number,
        },
      });
    } catch (outboxErr) {
      logger.error('Outbox publish failed on joinQueue — event may be lost', {
        operation: 'queue_join_outbox',
        metadata: { error: outboxErr instanceof Error ? outboxErr.message : String(outboxErr) },
      });
    }

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

    if (entry.status === 'WAITING' || entry.status === 'NOTIFIED') {
      // Dynamic position calculation: count active WAITING entries ahead
      const { count, error: countError } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', entry.restaurant_id)
        .eq('status', 'WAITING')
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

    return {
      entryId: entry.id,
      restaurantId: entry.restaurant_id,
      restaurantName: restaurantObj?.name || 'Restaurant',
      customerName: entry.customer_name,
      partySize: entry.party_size,
      status: entry.status,
      position,
      peopleAhead,
      displayNumber: entry.display_number,
      joinedAt: entry.joined_at,
      calledAt: entry.called_at || entry.notified_at,
      seatedAt: entry.seated_at,
      estimatedWaitMins: etaResult.estimatedWaitMins,
      formattedETA: etaResult.formattedETA,
      isAlmostYourTurn: etaResult.isAlmostYourTurn,
    };
  }

  /**
   * Updates queue entry status with centralized FSM state transition validation.
   */
  static async updateQueueStatus(input: UpdateQueueStatusInput) {
    const validated = UpdateQueueStatusSchema.parse(input);
    const supabase = createAdminClient();

    // 1. Fetch current entry
    const { data: current, error: fetchErr } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', validated.entryId)
      .single();

    if (fetchErr || !current) {
      throw new Error('QUEUE_ENTRY_NOT_FOUND');
    }

    // 2. Validate FSM State Transition Rules
    const currentStatus = current.status;
    const targetStatus = validated.newStatus;

    if (currentStatus === targetStatus) {
      return current; // No-op if already in target state
    }

    const isTerminal = ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(currentStatus);
    if (isTerminal) {
      throw new Error(`INVALID_QUEUE_TRANSITION: Cannot transition from terminal state ${currentStatus} to ${targetStatus}`);
    }

    if (currentStatus === 'WAITING') {
      const allowed = ['NOTIFIED', 'CALLED', 'CANCELLED', 'EXPIRED'];
      if (!allowed.includes(targetStatus)) {
        throw new Error(`INVALID_QUEUE_TRANSITION: WAITING can transition to NOTIFIED, CALLED, CANCELLED, or EXPIRED. Received: ${targetStatus}`);
      }
    } else if (currentStatus === 'NOTIFIED') {
      const allowed = ['CALLED', 'SEATED', 'CANCELLED', 'EXPIRED'];
      if (!allowed.includes(targetStatus)) {
        throw new Error(`INVALID_QUEUE_TRANSITION: NOTIFIED can transition to CALLED, SEATED, CANCELLED, or EXPIRED. Received: ${targetStatus}`);
      }
    } else if (currentStatus === 'CALLED') {
      const allowed = ['SEATED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'];
      if (!allowed.includes(targetStatus)) {
        throw new Error(`INVALID_QUEUE_TRANSITION: CALLED can transition to SEATED, NO_SHOW, CANCELLED, or EXPIRED. Received: ${targetStatus}`);
      }
    }

    // 3. Prepare update payload with appropriate timestamps
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: now,
    };

    let eventType = `QUEUE_${targetStatus}`;
    if (targetStatus === 'NOTIFIED') {
      updatePayload.notified_at = now;
      eventType = 'QUEUE_NOTIFIED';
    } else if (targetStatus === 'CALLED') {
      updatePayload.called_at = now;
      if (!current.notified_at) updatePayload.notified_at = now;
      eventType = 'QUEUE_CALLED';
    } else if (targetStatus === 'SEATED') {
      updatePayload.seated_at = now;
      eventType = 'QUEUE_SEATED';
    } else if (targetStatus === 'CANCELLED') {
      updatePayload.cancelled_at = now;
      eventType = 'QUEUE_CANCELLED';
    } else if (targetStatus === 'NO_SHOW') {
      eventType = 'QUEUE_NO_SHOW';
    } else if (targetStatus === 'EXPIRED') {
      updatePayload.expired_at = now;
      eventType = 'QUEUE_EXPIRED';
    }

    // 4. Update queue entry
    const { data: updated, error: updateErr } = await supabase
      .from('queue_entries')
      .update(updatePayload)
      .eq('id', validated.entryId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to update queue status: ${updateErr.message}`);
    }

    // 5. Append queue event
    await supabase.from('queue_events').insert({
      restaurant_id: current.restaurant_id,
      queue_entry_id: current.id,
      event_type: eventType,
      actor_user_id: validated.actorUserId || null,
      metadata: {
        previous_status: currentStatus,
        new_status: targetStatus,
        reason: validated.reason || null,
      },
    });

    // 5b. Publish Outbox Event for background notification dispatch
    try {
      await OutboxService.publishEvent({
        restaurantId: current.restaurant_id,
        eventType,
        aggregateType: 'QUEUE',
        aggregateId: current.id,
        payload: {
          previousStatus: currentStatus,
          newStatus: targetStatus,
          customerName: current.customer_name,
          displayNumber: current.display_number,
        },
      });
    } catch (outboxErr) {
      logger.error('Outbox publish failed on updateQueueStatus — event may be lost', {
        operation: 'queue_status_outbox',
        metadata: { error: outboxErr instanceof Error ? outboxErr.message : String(outboxErr) },
      });
    }

    // 6. Audit log for staff administrative operations
    if (validated.actorUserId) {
      await supabase.from('audit_logs').insert({
        restaurant_id: current.restaurant_id,
        actor_user_id: validated.actorUserId,
        action: `queue_entry_${targetStatus.toLowerCase()}`,
        entity_type: 'queue_entry',
        entity_id: current.id,
        metadata: {
          previousStatus: currentStatus,
          newStatus: targetStatus,
          customerName: current.customer_name,
          displayNumber: current.display_number,
        },
      });
    }

    return updated;
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
  static async seatQueueEntry(entryId: string, tableId: string, actorUserId?: string) {
    const supabase = createAdminClient();

    // Step 1: Fetch entry to get restaurant_id for permission check
    const { data: entry, error: fetchErr } = await supabase
      .from('queue_entries')
      .select('restaurant_id')
      .eq('id', entryId)
      .single();

    if (fetchErr || !entry) {
      throw new Error('QUEUE_ENTRY_NOT_FOUND');
    }

    // Step 2: Enforce authorization — must have queue.seat permission
    // This check happens in application code (service layer) AND inside the
    // DB function (defense in depth). Neither can be bypassed independently.
    const authContext = await AuthorizationService.requirePermission({
      userId: actorUserId,
      restaurantId: entry.restaurant_id,
      permission: PERMISSIONS.QUEUE_SEAT,
    });

    // Step 3: Call atomic DB function (also verifies permission internally)
    const { data, error } = await supabase.rpc('seat_queue_entry_atomic', {
      p_queue_entry_id: entryId,
      p_table_id: tableId,
      p_actor_user_id: authContext.userId,
    });

    if (error) {
      if (error.message.includes('QUEUE_ENTRY_TERMINAL')) {
        throw new Error('QUEUE_ENTRY_TERMINAL: Cannot seat a queue entry in a terminal state');
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

    let waitingCount = 0;
    const formatted = entries.map((entry) => {
      let position: number | null = null;
      let peopleAhead: number | null = null;

      if (entry.status === 'WAITING' || entry.status === 'NOTIFIED') {
        waitingCount += 1;
        position = waitingCount;
        peopleAhead = waitingCount - 1;
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
      if (filterStatus === 'ACTIVE') {
        query = query.in('status', ['WAITING', 'NOTIFIED', 'CALLED']);
        
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
        query = query.in('status', ['SEATED', 'CANCELLED', 'NO_SHOW', 'EXPIRED']);
      } else {
        query = query.eq('status', filterStatus);
      }
    }

    if (search && search.trim() !== '') {
      const q = `%${search.trim()}%`;
      query = query.or(`customer_name.ilike.${q},display_number.ilike.${q},customer_phone.ilike.${q}`);
    }

    const { data: entries, error } = await query
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(`Failed to list queue entries: ${error.message}`);
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
}
