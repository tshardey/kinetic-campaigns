/**
 * Single source of truth for whether env vars refer to a real Supabase project.
 * Must stay aligned with fallbacks in `supabase.ts` (`createClient` when env is unset).
 */

/** Default URL passed to `createClient` when `VITE_SUPABASE_URL` is missing (local CLI, tests). */
export const SUPABASE_DEFAULT_URL = 'http://127.0.0.1:54321';

/** Default publishable key when `VITE_SUPABASE_PUBLISHABLE_KEY` is missing — not a valid project key. */
export const SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY = 'public-anon-placeholder';

/**
 * True when both Vite env vars are set to non-empty values and the key is not the placeholder.
 * Rejects the same “unconfigured” cases as `campaign-loader` / `createClient` defaults.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return false;
  if (key === SUPABASE_PLACEHOLDER_PUBLISHABLE_KEY) return false;
  return true;
}
