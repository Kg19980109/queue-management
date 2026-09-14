import 'server-only';
import crypto from 'crypto';
import { createServerClient } from '@/lib/db/supabase/server';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  DomainError,
} from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { z } from 'zod';
import type { RestaurantStatus } from '@/types/database.types';
import { CacheService, CacheKeys } from '@/lib/cache';

// Zod Validation Schemas
export const createRestaurantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();

export const assignAdminSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type AssignAdminInput = z.infer<typeof assignAdminSchema>;

export class PlatformService {
  /**
   * Helper to record an audit log entry safely.
   */
  private static async logAuditAction(
    action: string,
    entityType: string,
    entityId: string,
    restaurantId: string | null,
    actorUserId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        restaurant_id: restaurantId,
        actor_user_id: actorUserId,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to insert audit log entry', {
        operation: 'audit_log',
        action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get live aggregate platform statistics for Super Admin dashboard.
   */
  static async getPlatformStats() {
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_VIEW });
    const supabase = await createServerClient();

    const { data: restaurants, error: rErr } = await supabase
      .from('restaurants')
      .select('status');

    if (rErr) throw new DomainError('Failed to fetch restaurant statistics');

    const totalRestaurants = restaurants.length;
    const activeRestaurants = restaurants.filter((r) => r.status === 'ACTIVE').length;
    const suspendedRestaurants = restaurants.filter((r) => r.status === 'SUSPENDED').length;
    const archivedRestaurants = restaurants.filter((r) => r.status === 'ARCHIVED').length;

    const { data: memberships, error: mErr } = await supabase
      .from('restaurant_memberships')
      .select('role, status')
      .eq('status', 'ACTIVE');

    if (mErr) throw new DomainError('Failed to fetch membership statistics');

    const totalAdmins = memberships.filter((m) => m.role === 'RESTAURANT_ADMIN').length;
    const totalStaff = memberships.filter((m) => m.role === 'STAFF').length;

    return {
      totalRestaurants,
      activeRestaurants,
      suspendedRestaurants,
      archivedRestaurants,
      totalAdmins,
      totalStaff,
    };
  }

  /**
   * Fetch paginated list of restaurants with search and status filters.
   */
  static async listRestaurants(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: RestaurantStatus;
  }) {
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_VIEW });
    const supabase = await createServerClient();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('restaurants')
      .select('*, restaurant_memberships(role, user_profiles(display_name, email))', {
        count: 'exact',
      });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.search && params.search.trim() !== '') {
      const term = `%${params.search.trim()}%`;
      query = query.or(`name.ilike.${term},slug.ilike.${term},city.ilike.${term}`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new DomainError('Failed to retrieve restaurants');

    const restaurants = (data || []).map((r) => {
      const adminMembership = (r.restaurant_memberships || []).find(
        (m: { role: string }) => m.role === 'RESTAURANT_ADMIN'
      );
      const adminProfile = adminMembership
        ? (adminMembership as { user_profiles: { display_name: string; email: string } | null })
            .user_profiles
        : null;

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        phone: r.phone,
        email: r.email,
        city: r.city,
        state: r.state,
        status: r.status,
        timezone: r.timezone,
        currency: r.currency,
        createdAt: r.created_at,
        assignedAdmin: adminProfile
          ? { name: adminProfile.display_name, email: adminProfile.email }
          : null,
      };
    });

    return {
      restaurants,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Get single restaurant details by ID along with operational counts.
   */
  static async getRestaurantById(id: string) {
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_VIEW });
    const supabase = await createServerClient();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*, restaurant_memberships(role, status, user_profiles(id, display_name, email, phone))')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      throw new NotFoundError(`Restaurant with ID ${id} not found`);
    }

    const adminMembership = (restaurant.restaurant_memberships || []).find(
      (m: { role: string; status: string }) =>
        m.role === 'RESTAURANT_ADMIN' && m.status === 'ACTIVE'
    );
    const adminProfile = adminMembership
      ? (adminMembership as { user_profiles: { id: string; display_name: string; email: string; phone: string } | null })
          .user_profiles
      : null;

    // Operational counts
    const [tablesRes, staffRes, menuRes, queueRes, ordersRes] = await Promise.all([
      supabase.from('restaurant_tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
      supabase.from('restaurant_memberships').select('id', { count: 'exact', head: true }).eq('restaurant_id', id).eq('role', 'STAFF').eq('status', 'ACTIVE'),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', id),
    ]);

    return {
      ...restaurant,
      assignedAdmin: adminProfile,
      counts: {
        tables: tablesRes.count || 0,
        staff: staffRes.count || 0,
        menuItems: menuRes.count || 0,
        queueEntries: queueRes.count || 0,
        orders: ordersRes.count || 0,
      },
    };
  }

  /**
   * Create a new restaurant.
   */
  static async createRestaurant(input: CreateRestaurantInput) {
    const userContext = await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_CREATE });

    const parseResult = createRestaurantSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid restaurant creation data', {
        errors: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const normalizedSlug = data.slug.toLowerCase().trim();
    const supabase = await createServerClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (existing) {
      throw new ConflictError(`Restaurant slug '${normalizedSlug}' is already taken`);
    }

    const { data: newRestaurant, error } = await supabase
      .from('restaurants')
      .insert({
        name: data.name.trim(),
        slug: normalizedSlug,
        description: data.description?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        timezone: data.timezone || 'UTC',
        currency: data.currency || 'USD',
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (error || !newRestaurant) {
      throw new DomainError('Failed to create restaurant record');
    }

    await this.logAuditAction(
      'restaurant_created',
      'restaurant',
      newRestaurant.id,
      newRestaurant.id,
      userContext.userId,
      { name: newRestaurant.name, slug: newRestaurant.slug }
    );

    return newRestaurant;
  }

  /**
   * Update restaurant metadata.
   */
  static async updateRestaurant(id: string, input: UpdateRestaurantInput) {
    const userContext = await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_UPDATE });

    const parseResult = updateRestaurantSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid update data', {
        errors: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const supabase = await createServerClient();

    // Check existence
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundError(`Restaurant ${id} not found`);
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug.toLowerCase().trim() !== existing.slug) {
      const normalizedSlug = data.slug.toLowerCase().trim();
      const { data: slugMatch } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', normalizedSlug)
        .neq('id', id)
        .maybeSingle();

      if (slugMatch) {
        throw new ConflictError(`Slug '${normalizedSlug}' is already taken`);
      }
      data.slug = normalizedSlug;
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
    if (data.email !== undefined) updatePayload.email = data.email?.trim() || null;
    if (data.address !== undefined) updatePayload.address = data.address?.trim() || null;
    if (data.city !== undefined) updatePayload.city = data.city?.trim() || null;
    if (data.state !== undefined) updatePayload.state = data.state?.trim() || null;
    if (data.country !== undefined) updatePayload.country = data.country?.trim() || null;
    if (data.timezone !== undefined) updatePayload.timezone = data.timezone;
    if (data.currency !== undefined) updatePayload.currency = data.currency;

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DomainError(`Failed to update restaurant: ${error.message}`);
    }

    const updatedRestaurant = updated;

    // Invalidate the public customer-facing cache
    await CacheService.invalidate(CacheKeys.publicRestaurant(updatedRestaurant.slug));

    await this.logAuditAction(
      'restaurant_updated',
      'restaurant',
      id,
      id,
      userContext.userId,
      updatePayload
    );

    return updated;
  }

  /**
   * Controlled state machine status updates (ACTIVE ↔ SUSPENDED, ACTIVE/SUSPENDED → ARCHIVED).
   */
  static async updateRestaurantStatus(id: string, targetStatus: RestaurantStatus) {
    const userContext = await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_LIFECYCLE });

    const supabase = await createServerClient();
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (!restaurant) {
      throw new NotFoundError(`Restaurant ${id} not found`);
    }

    const currentStatus = restaurant.status as RestaurantStatus;

    if (currentStatus === targetStatus) {
      throw new DomainError(`Restaurant is already in '${targetStatus}' status`);
    }

    // State Machine Validation Rules
    if (currentStatus === 'ARCHIVED') {
      throw new DomainError('Archived restaurants cannot be reactivated or updated');
    }

    const validTransitions: Record<RestaurantStatus, RestaurantStatus[]> = {
      ACTIVE: ['SUSPENDED', 'ARCHIVED'],
      SUSPENDED: ['ACTIVE', 'ARCHIVED'],
      ARCHIVED: [],
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      throw new DomainError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'`
      );
    }

    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (targetStatus === 'ARCHIVED') {
      updatePayload.archived_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new DomainError(`Failed to transition restaurant status to ${targetStatus}`);
    }

    const actionMap: Record<RestaurantStatus, string> = {
      ACTIVE: 'restaurant_activated',
      SUSPENDED: 'restaurant_suspended',
      ARCHIVED: 'restaurant_archived',
    };

    await this.logAuditAction(
      actionMap[targetStatus],
      'restaurant',
      id,
      id,
      userContext.userId,
      { previousStatus: currentStatus, newStatus: targetStatus }
    );

    return updated;
  }

  /**
   * Assign or invite a Restaurant Admin user to a restaurant.
   */
  static async assignRestaurantAdmin(input: AssignAdminInput) {
    const userContext = await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_RESTAURANTS_UPDATE });

    const parseResult = assignAdminSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid admin assignment input', {
        errors: parseResult.error.format(),
      });
    }

    const { restaurantId, email, displayName, password } = parseResult.data;
    const adminClient = createAdminClient();

    // Verify restaurant exists
    const { data: restaurant } = await adminClient
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .maybeSingle();

    if (!restaurant) {
      throw new NotFoundError(`Restaurant ${restaurantId} not found`);
    }

    let targetUserId: string;

    // Check if user exists
    const { data: existingUser } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      // Create user via Supabase Auth Admin API.
      // Phase 3E: never fall back to a guessable default password. When the
      // platform operator omits one, generate a cryptographic random value —
      // the account owner sets a real password via recovery/invitation.
      const effectivePassword =
        password && password.length >= 6
          ? password
          : crypto.randomBytes(24).toString('hex');
      const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: effectivePassword,
        email_confirm: true,
        user_metadata: {
          role: 'RESTAURANT_ADMIN',
          restaurant_id: restaurantId,
        },
      });

      if (authErr || !authUser.user) {
        throw new DomainError(`Failed to create Auth user for ${email}: ${authErr?.message}`);
      }

      targetUserId = authUser.user.id;

      // Upsert profile
      await adminClient.from('user_profiles').upsert({
        id: targetUserId,
        display_name: displayName.trim(),
        email: email.toLowerCase().trim(),
      });
    }

    // Deactivate existing RESTAURANT_ADMIN memberships for this restaurant
    await adminClient
      .from('restaurant_memberships')
      .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
      .eq('restaurant_id', restaurantId)
      .eq('role', 'RESTAURANT_ADMIN');

    // Create or activate membership
    const { data: membership, error: mErr } = await adminClient
      .from('restaurant_memberships')
      .upsert(
        {
          user_id: targetUserId,
          restaurant_id: restaurantId,
          role: 'RESTAURANT_ADMIN',
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,restaurant_id,role' }
      )
      .select()
      .single();

    if (mErr || !membership) {
      throw new DomainError('Failed to record restaurant admin membership');
    }

    await this.logAuditAction(
      'restaurant_admin_assigned',
      'restaurant_membership',
      membership.id,
      restaurantId,
      userContext.userId,
      { assignedUserId: targetUserId, email, displayName }
    );

    return { success: true, targetUserId, membershipId: membership.id };
  }

  /**
   * Retrieve paginated administrative audit logs.
   */
  static async listAuditLogs(params: {
    page?: number;
    limit?: number;
    restaurantId?: string;
    action?: string;
  }) {
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.PLATFORM_AUDIT_VIEW });
    const supabase = await createServerClient();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('audit_logs')
      .select('*, user_profiles(display_name, email), restaurants(name, slug)', { count: 'exact' });

    if (params.restaurantId) {
      query = query.eq('restaurant_id', params.restaurantId);
    }

    if (params.action) {
      query = query.eq('action', params.action);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new DomainError('Failed to retrieve audit logs');

    const logs = (data || []).map((l) => {
      const userProfile = l.user_profiles as unknown as { display_name: string; email: string } | null;
      const restaurant = l.restaurants as unknown as { name: string; slug: string } | null;

      return {
        id: l.id,
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        createdAt: l.created_at,
        metadata: l.metadata,
        actor: userProfile
          ? { name: userProfile.display_name, email: userProfile.email }
          : null,
        restaurant: restaurant
          ? { name: restaurant.name, slug: restaurant.slug }
          : null,
      };
    });

    return {
      logs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }
}
