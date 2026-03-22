import { getSupabaseClientEnv, isSupabaseConfigured } from '@/lib/supabase-config';

/** Must match `supabase/migrations/*campaign_assets*` and upload destination. */
export const CAMPAIGN_ASSETS_BUCKET = 'campaign-assets';

/** Object prefix inside the bucket (mirrors `public/campaign/omija/`). */
export const OMIJA_STORAGE_PREFIX = 'campaign/omija';

/**
 * When `VITE_CAMPAIGN_ASSETS_USE_PUBLIC` is not `"false"`, unconfigured Supabase falls back to
 * files under `public/campaign/omija/`. Set to `"false"` to always use Storage URLs (no repo images).
 */
export function campaignAssetsUsePublicFolder(): boolean {
  return import.meta.env.VITE_CAMPAIGN_ASSETS_USE_PUBLIC !== 'false';
}

function supabaseStoragePublicObjectUrl(relativePath: string): string {
  const base = getSupabaseClientEnv().url.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${CAMPAIGN_ASSETS_BUCKET}/${OMIJA_STORAGE_PREFIX}/${relativePath}`;
}

/**
 * Absolute URL for an Omija campaign image.
 * - Default: Storage when Supabase env is configured; otherwise `public/campaign/omija/` via BASE_URL.
 * - `VITE_CAMPAIGN_ASSETS_USE_PUBLIC=false`: always Storage public URLs (set `VITE_SUPABASE_URL` or use local CLI default).
 */
export function campaignOmijaAssetUrl(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '');
  if (campaignAssetsUsePublicFolder() && !isSupabaseConfigured()) {
    const viteEnv = import.meta as unknown as { env?: { BASE_URL?: string } };
    const appBase = `${viteEnv?.env?.BASE_URL ?? '/'}`.replace(/\/+$/, '');
    return `${appBase}/campaign/omija/${trimmed}`;
  }
  return supabaseStoragePublicObjectUrl(trimmed);
}
