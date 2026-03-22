import { createClient } from '@supabase/supabase-js';

/** Placeholders satisfy createClient when env is unset (tests, CI); real URLs/keys come from .env in dev/prod. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'public-anon-placeholder';

/**
 * Supabase client for auth, database, storage, and edge functions.
 * Configure via VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.
 * Use the publishable key (safe for browser); do not use the secret key here.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
