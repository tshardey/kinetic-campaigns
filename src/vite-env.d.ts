/// <reference types="vite/client" />

/**
 * Vite injects `VITE_*` at dev/build time. Production (GitHub Pages): set matching
 * repository secrets so the deploy workflow passes them into `npm run build`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /**
   * Set to `"false"` to never serve images from `public/campaign/omija/` — only Supabase Storage
   * (`campaign-assets` bucket). Use when removing image files from the repo; pair with upload + `VITE_SUPABASE_URL`.
   */
  readonly VITE_CAMPAIGN_ASSETS_USE_PUBLIC?: string;
  /** When set, load this campaign id from Supabase; otherwise the first published campaign (by id) is used. */
  readonly VITE_CAMPAIGN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
