'use server';

import { createServerClient } from '@/lib/db/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const parseResult = loginSchema.safeParse({ email, password });
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Please enter a valid email and password.',
    };
  }

  const supabase = await createServerClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: 'Invalid credentials. Please check your email and password.',
    };
  }

  const userId = authData.user.id;

  // 1. Check Super Admin Role
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', {
    p_user_id: userId,
  });

  if (isSuperAdmin) {
    redirect('/platform');
  }

  // 2. Query Restaurant Memberships for RESTAURANT_ADMIN or STAFF
  const { data: memberships } = await supabase
    .from('restaurant_memberships')
    .select('role, status, restaurant_id')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');

  const adminMembership = memberships?.find((m) => m.role === 'RESTAURANT_ADMIN');
  if (adminMembership) {
    redirect('/dashboard');
  }

  const staffMembership = memberships?.find((m) => m.role === 'STAFF');
  if (staffMembership) {
    redirect('/dashboard/operational');
  }

  // No active authorized role found
  await supabase.auth.signOut();
  return {
    success: false,
    error: 'No active role assignment found for this account.',
  };
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
