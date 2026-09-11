import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/config/env';

/**
 * PRIVILEGED SERVICE-ROLE SUPABASE CLIENT.
 *
 * CRITICAL ARCHITECTURE & SECURITY RULES:
 * 1. This client is protected by 'server-only' and MUST NEVER be imported into or bundled for client components.
 * 2. This client bypasses Row Level Security (RLS).
 * 3. DO NOT use this client as a shortcut for normal tenant or authenticated user operations.
 * 4. Normal application features MUST use `createServerClient()` which enforces RLS policies.
 * 5. This client is reserved strictly for privileged platform operations (e.g. system provisioning, background workers).
 */
export function createAdminClient() {
  const env = getEnv();

  if (!env.server.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required to initialize the admin client.'
    );
  }

  return createClient(
    env.public.NEXT_PUBLIC_SUPABASE_URL,
    env.server.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
