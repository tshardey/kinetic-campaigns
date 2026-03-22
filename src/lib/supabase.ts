import { createClient } from '@supabase/supabase-js';
import { getSupabaseClientEnv } from '@/lib/supabase-config';

const { url: supabaseUrl, publishableKey: supabasePublishableKey } = getSupabaseClientEnv();

/**
 * Supabase client for auth, database, storage, and edge functions.
 * Configure via VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (.env locally;
 * GitHub Actions secrets for production builds). Use the publishable key (safe for browser).
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
