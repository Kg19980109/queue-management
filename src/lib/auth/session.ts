import 'server-only';
import { createServerClient } from '@/lib/db/supabase/server';
import { AuthenticationError } from '@/lib/errors';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Retrieve current active session from Supabase server client.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return null;
  }
  return session;
}

/**
 * Retrieve currently authenticated user from Supabase server client.
 * Uses `getUser()` to validate token authenticity with Supabase server.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * Enforce authentication. Throws AuthenticationError if user is not logged in.
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new AuthenticationError('User is not authenticated');
  }
  return user;
}
