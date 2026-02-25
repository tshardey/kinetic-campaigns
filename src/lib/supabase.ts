import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/**
 * Supabase client for auth, database, storage, and edge functions.
 * Configure via VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.
 * Use the publishable key (safe for browser); do not use the secret key here.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
