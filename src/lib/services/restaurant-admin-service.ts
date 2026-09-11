import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@/lib/db/supabase/server';
import { createAdminClient } from '@/lib/db/supabase/admin';
import { requireAuth } from '@/lib/auth/session';
import { AuthorizationService } from '@/lib/services/authorization-service';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  DomainError,
} from '@/lib/errors';
import { logger } from '@/lib/logging/logger';
import { z } from 'zod';
import { CacheService, CacheKeys } from '@/lib/cache';


export const updateRestaurantProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
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

export const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

export type UpdateRestaurantProfileInput = z.infer<typeof updateRestaurantProfileSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * Module-level cached implementation of getAuthorizedRestaurantContext.
 * React cache() memoizes this per request — the membership DB query only fires once
 * even if multiple services call getAuthorizedRestaurantContext() in the same action.
 */
const _getAuthorizedRestaurantContext = cache(
  async (): Promise<{ userId: string; restaurantId: string }> => {
    const user = await requireAuth();
    const supabase = await createServerClient();

    const { data: membership, error } = await supabase
      .from('restaurant_memberships')
      .select('restaurant_id, role, status')
      .eq('user_id', user.id)
      .eq('role', 'RESTAURANT_ADMIN')
      .eq('status', 'ACTIVE')
      .not('restaurant_id', 'is', null)
      .maybeSingle();

    if (error || !membership || !membership.restaurant_id) {
      throw new AuthorizationError('Access denied. Active Restaurant Admin membership required.');
    }

    return {
      userId: user.id,
      restaurantId: membership.restaurant_id,
    };
  }
);

export class RestaurantAdminService {

  /**
   * Resolve authorized restaurant ID for current authenticated Restaurant Admin from DB.
   * NEVER trust restaurant_id from client requests.
   *
   * PERFORMANCE: Wrapped with React cache() via the module-level helper below.
   * The membership DB query is executed at most once per server action/render,
   * regardless of how many services call this method.
   */
  static getAuthorizedRestaurantContext = _getAuthorizedRestaurantContext;


  /**
   * Log an audit action safely.
   */
  private static async logAuditAction(
    action: string,
    entityType: string,
    entityId: string,
    restaurantId: string,
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
      logger.error('Failed to insert audit log', {
        operation: 'audit_log',
        action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get restaurant admin dashboard stats & metadata.
   */
  static async getRestaurantDashboardStats() {
    const { restaurantId } = await this.getAuthorizedRestaurantContext();
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.RESTAURANT_VIEW, restaurantId });
    const supabase = await createServerClient();

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      throw new NotFoundError(`Restaurant ${restaurantId} not found`);
    }

    const [tablesRes, staffRes, menuRes, queueRes, ordersRes] = await Promise.all([
      supabase.from('restaurant_tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('restaurant_memberships').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('role', 'STAFF').eq('status', 'ACTIVE'),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('queue_entries').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
    ]);

    return {
      restaurant,
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
   * Update restaurant profile metadata (permitted fields only).
   */
  static async updateRestaurantProfile(input: UpdateRestaurantProfileInput) {
    const { userId, restaurantId } = await this.getAuthorizedRestaurantContext();
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.RESTAURANT_UPDATE, restaurantId });

    const parseResult = updateRestaurantProfileSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid profile data', {
        errors: parseResult.error.format(),
      });
    }

    const data = parseResult.data;
    const adminClient = createAdminClient();

    const updatePayload = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      country: data.country?.trim() || null,
      timezone: data.timezone,
      currency: data.currency,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await adminClient
      .from('restaurants')
      .update(updatePayload)
      .eq('id', restaurantId)
      .select('slug')
      .single();

    if (error) {
      throw new DomainError(`Failed to update restaurant profile: ${error.message}`);
    }

    const updatedRestaurant = updated;
    await CacheService.invalidate(CacheKeys.publicRestaurant(updatedRestaurant.slug));

    await this.logAuditAction(
      'profile_updated',
      'restaurant',
      restaurantId,
      restaurantId,
      userId,
      updatePayload
    );
  }

  /**
   * Fetch paginated list of staff members for authorized restaurant.
   */
  static async listStaff(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const { restaurantId } = await this.getAuthorizedRestaurantContext();
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.STAFF_VIEW, restaurantId });
    const supabase = await createServerClient();

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('restaurant_memberships')
      .select('*, user_profiles(display_name, email, phone)', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .eq('role', 'STAFF');

    if (params.status) {
      query = query.eq('status', params.status);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new DomainError('Failed to retrieve staff members');

    let staff = (data || []).map((m) => {
      const profile = (m.user_profiles as unknown) as {
        display_name: string;
        email: string;
        phone: string;
      } | null;

      return {
        id: m.id,
        userId: m.user_id,
        name: profile?.display_name || 'Staff Member',
        email: profile?.email || '-',
        phone: profile?.phone || '-',
        role: m.role,
        status: m.status,
        createdAt: m.created_at,
      };
    });

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim().toLowerCase();
      staff = staff.filter(
        (s) =>
          s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
      );
    }

    return {
      staff,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * Create / Invite a new Staff member (strictly role STAFF).
   */
  static async createStaff(input: CreateStaffInput) {
    const { userId, restaurantId } = await this.getAuthorizedRestaurantContext();
    await AuthorizationService.requirePermission({ permission: PERMISSIONS.STAFF_CREATE, restaurantId });

    const parseResult = createStaffSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid staff creation input', {
        errors: parseResult.error.format(),
      });
    }

    const { email, displayName } = parseResult.data;
    const adminClient = createAdminClient();

    let targetUserId: string;

    const { data: existingUser } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      targetUserId = existingUser.id;
    } else {
      const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        email_confirm: true,
        user_metadata: {
          role: 'STAFF',
          restaurant_id: restaurantId,
        },
      });

      if (authErr || !authUser.user) {
        throw new DomainError(`Failed to create Auth user: ${authErr?.message}`);
      }

      targetUserId = authUser.user.id;

      await adminClient.from('user_profiles').upsert({
        id: targetUserId,
        display_name: displayName.trim(),
        email: email.toLowerCase().trim(),
      });
    }

    // Insert or activate STAFF membership (Role is hard-coded to STAFF)
    const { data: membership, error: mErr } = await adminClient
      .from('restaurant_memberships')
      .upsert(
        {
          user_id: targetUserId,
          restaurant_id: restaurantId,
          role: 'STAFF',
          status: 'ACTIVE',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,restaurant_id,role' }
      )
      .select()
      .single();

    if (mErr || !membership) {
      throw new DomainError('Failed to record staff membership');
    }

    await this.logAuditAction(
      'staff_created',
      'restaurant_membership',
      membership.id,
      restaurantId,
      userId,
      { staffUserId: targetUserId, email, displayName }
    );

    return { success: true, targetUserId, membershipId: membership.id };
  }

  /**
   * Activate or deactivate a staff member in authorized restaurant.
   */
  static async updateStaffStatus(targetUserId: string, newStatus: 'ACTIVE' | 'INACTIVE') {
    const { userId, restaurantId } = await this.getAuthorizedRestaurantContext();
    const requiredPerm = newStatus === 'ACTIVE' ? PERMISSIONS.STAFF_ACTIVATE : PERMISSIONS.STAFF_DEACTIVATE;
    await AuthorizationService.requirePermission({ permission: requiredPerm, restaurantId });
    const adminClient = createAdminClient();

    // Verify staff membership belongs to current restaurant and has role STAFF
    const { data: existing } = await adminClient
      .from('restaurant_memberships')
      .select('id, status, role')
      .eq('user_id', targetUserId)
      .eq('restaurant_id', restaurantId)
      .eq('role', 'STAFF')
      .maybeSingle();

    if (!existing) {
      throw new NotFoundError('Staff membership not found for this restaurant');
    }

    if (existing.status === newStatus) {
      throw new DomainError(`Staff member is already ${newStatus}`);
    }

    const { data: updated, error } = await adminClient
      .from('restaurant_memberships')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !updated) {
      throw new DomainError(`Failed to update staff status to ${newStatus}`);
    }

    const actionName = newStatus === 'ACTIVE' ? 'staff_activated' : 'staff_deactivated';

    await this.logAuditAction(
      actionName,
      'restaurant_membership',
      existing.id,
      restaurantId,
      userId,
      { targetUserId, previousStatus: existing.status, newStatus }
    );

    return updated;
  }
}
