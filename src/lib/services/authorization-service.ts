import 'server-only';

import { createAdminClient } from '@/lib/db/supabase/admin';
import { requireAuth } from '@/lib/auth/session';
import { AuthorizationError } from '@/lib/errors';
import { PERMISSIONS, PermissionKey, ROLE_DEFAULT_PERMISSIONS } from '@/lib/auth/permissions';
import { logger } from '@/lib/logging/logger';

export interface AuthorizeOptions {
  userId?: string;
  restaurantId?: string;
  permission: PermissionKey;
}

export interface EffectivePermissionsOptions {
  userId?: string;
  restaurantId?: string;
}

export interface AuthorizedContext {
  userId: string;
  role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN' | 'STAFF';
  restaurantId?: string;
  membershipId?: string;
}

export class AuthorizationService {
  /**
   * Evaluates if a user holds a specific permission in a given tenant context.
   * Deny-by-default model.
   */
  static async hasPermission(options: AuthorizeOptions): Promise<boolean> {
    try {
      let targetUserId = options.userId;

      if (!targetUserId) {
        const authUser = await requireAuth();
        targetUserId = authUser.id;
      }

      if (!targetUserId) {
        return false;
      }

      const adminClient = createAdminClient();

      // 1. Check Super Admin status
      const { data: superAdminMembership } = await adminClient
        .from('restaurant_memberships')
        .select('id, role, status')
        .eq('user_id', targetUserId)
        .eq('role', 'SUPER_ADMIN')
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (superAdminMembership) {
        return true;
      }

      // Non-Super-Admins CANNOT hold any platform.* permissions
      if (options.permission.startsWith('platform.')) {
        return false;
      }

      // 2. Resolve Active Membership for restaurant
      let membershipQuery = adminClient
        .from('restaurant_memberships')
        .select('id, restaurant_id, role, status')
        .eq('user_id', targetUserId);

      if (options.restaurantId) {
        membershipQuery = membershipQuery.eq('restaurant_id', options.restaurantId);
      }

      const { data: memberships } = await membershipQuery;

      if (!memberships || memberships.length === 0) {
        return false;
      }

      // Strict INACTIVE check: filter for ACTIVE status only
      const activeMembership = memberships.find((m: { status: string }) => m.status === 'ACTIVE');

      if (!activeMembership) {
        logger.info('Authorization denied for inactive membership', {
          operation: 'hasPermission',
          userId: targetUserId,
          restaurantId: options.restaurantId,
          permission: options.permission,
        });
        return false;
      }

      // 3. Check Staff Permission Overrides (Explicit DENY > Explicit ALLOW)
      const { data: override } = await adminClient
        .from('staff_permission_overrides')
        .select('effect, permissions!inner(key)')
        .eq('membership_id', activeMembership.id)
        .eq('permissions.key', options.permission)
        .maybeSingle();

      if (override) {
        if (override.effect === 'DENY') {
          return false;
        }
        if (override.effect === 'ALLOW') {
          return true;
        }
      }

      // 4. Check Role Permission Matrix from Database
      const { data: rolePermission } = await adminClient
        .from('role_permissions')
        .select('id, permissions!inner(key)')
        .eq('role', activeMembership.role)
        .eq('permissions.key', options.permission)
        .maybeSingle();

      if (rolePermission) {
        return true;
      }

      // Fallback check against canonical in-memory matrix if database table unseeded
      const fallbackRolePermissions = ROLE_DEFAULT_PERMISSIONS[activeMembership.role as keyof typeof ROLE_DEFAULT_PERMISSIONS] || [];
      return fallbackRolePermissions.includes(options.permission);
    } catch (error) {
      logger.error('Error checking permission in AuthorizationService', {
        operation: 'hasPermission',
        error: error instanceof Error ? error.message : String(error),
        permission: options.permission,
      });
      return false;
    }
  }

  /**
   * Enforces permission requirement. Throws AuthorizationError if denied.
   */
  static async requirePermission(options: AuthorizeOptions): Promise<AuthorizedContext> {
    let targetUserId = options.userId;

    if (!targetUserId) {
      const authUser = await requireAuth();
      targetUserId = authUser.id;
    }

    const isAuthorized = await this.hasPermission({
      userId: targetUserId,
      restaurantId: options.restaurantId,
      permission: options.permission,
    });

    if (!isAuthorized) {
      throw new AuthorizationError(
        `Permission denied. Required permission: ${options.permission}`
      );
    }

    const adminClient = createAdminClient();

    // Resolve context for returned payload
    const { data: superAdminMembership } = await adminClient
      .from('restaurant_memberships')
      .select('id, role, restaurant_id')
      .eq('user_id', targetUserId)
      .eq('role', 'SUPER_ADMIN')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (superAdminMembership) {
      return {
        userId: targetUserId,
        role: 'SUPER_ADMIN',
        restaurantId: options.restaurantId,
        membershipId: superAdminMembership.id,
      };
    }

    let membershipQuery = adminClient
      .from('restaurant_memberships')
      .select('id, restaurant_id, role, status')
      .eq('user_id', targetUserId)
      .eq('status', 'ACTIVE');

    if (options.restaurantId) {
      membershipQuery = membershipQuery.eq('restaurant_id', options.restaurantId);
    }

    const { data: membership } = await membershipQuery.single();

    if (!membership) {
      throw new AuthorizationError('No active membership found for authorization context');
    }

    return {
      userId: targetUserId,
      role: membership.role as 'RESTAURANT_ADMIN' | 'STAFF',
      restaurantId: membership.restaurant_id,
      membershipId: membership.id,
    };
  }

  /**
   * Resolves list of all effective permissions for a user in a tenant context.
   */
  static async getEffectivePermissions(options: EffectivePermissionsOptions): Promise<PermissionKey[]> {
    let targetUserId = options.userId;

    if (!targetUserId) {
      const authUser = await requireAuth();
      targetUserId = authUser.id;
    }

    if (!targetUserId) {
      return [];
    }

    const adminClient = createAdminClient();

    // 1. Super Admin holds all permissions
    const { data: superAdmin } = await adminClient
      .from('restaurant_memberships')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role', 'SUPER_ADMIN')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (superAdmin) {
      return Object.values(PERMISSIONS);
    }

    // 2. Resolve Active Membership
    let membershipQuery = adminClient
      .from('restaurant_memberships')
      .select('id, role, status')
      .eq('user_id', targetUserId)
      .eq('status', 'ACTIVE');

    if (options.restaurantId) {
      membershipQuery = membershipQuery.eq('restaurant_id', options.restaurantId);
    }

    const { data: memberships } = await membershipQuery;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const activeMembership = memberships.find((m: { status: string }) => m.status === 'ACTIVE') || memberships[0];

    if (!activeMembership) {
      return [];
    }

    // 3. Query base role permissions
    const { data: rolePerms } = await adminClient
      .from('role_permissions')
      .select('permissions!inner(key)')
      .eq('role', activeMembership.role);

    const basePermissions = new Set<PermissionKey>();

    if (rolePerms && rolePerms.length > 0) {
      for (const item of rolePerms) {
        const key = (item.permissions as unknown as { key: PermissionKey })?.key;
        if (key) basePermissions.add(key);
      }
    } else {
      const defaults = ROLE_DEFAULT_PERMISSIONS[activeMembership.role as keyof typeof ROLE_DEFAULT_PERMISSIONS] || [];
      defaults.forEach((k) => basePermissions.add(k));
    }

    // 4. Apply Staff Overrides
    const { data: overrides } = await adminClient
      .from('staff_permission_overrides')
      .select('effect, permissions!inner(key)')
      .eq('membership_id', activeMembership.id);

    if (overrides) {
      for (const ov of overrides) {
        const key = (ov.permissions as unknown as { key: PermissionKey })?.key;
        if (!key) continue;
        if (ov.effect === 'DENY') {
          basePermissions.delete(key);
        } else if (ov.effect === 'ALLOW') {
          basePermissions.add(key);
        }
      }
    }

    return Array.from(basePermissions);
  }
}
