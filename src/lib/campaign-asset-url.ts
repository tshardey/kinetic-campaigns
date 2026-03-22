import { isSupabaseConfigured } from '@/lib/supabase-config';

/** Must match `supabase/migrations/*campaign_assets*` and upload destination. */
export const CAMPAIGN_ASSETS_BUCKET = 'campaign-assets';

/** Object prefix inside the bucket (mirrors `public/campaign/omija/`). */
export const OMIJA_STORAGE_PREFIX = 'campaign/omija';

/**
 * Absolute URL for an Omija campaign image.
 * With Supabase env configured, uses Storage public URLs; otherwise Vite-served `public/` paths.
 */
export function campaignOmijaAssetUrl(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '');
  if (isSupabaseConfigured()) {
    const base = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
    return `${base}/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/${trimmed}`;
  }
  const viteEnv = import.meta as unknown as { env?: { BASE_URL?: string } };
  const appBase = `${viteEnv?.env?.BASE_URL ?? '/'}`.replace(/\/+$/, '');
  return `${appBase}/campaign/omija/${trimmed}`;
}
