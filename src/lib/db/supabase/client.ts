import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { getEnv } from '@/lib/config/env';

/**
 * Creates a browser-side Supabase client for client components.
 * Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createBrowserClient() {
  const env = getEnv();
  return createSupabaseBrowserClient(
    env.public.NEXT_PUBLIC_SUPABASE_URL,
    env.public.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
