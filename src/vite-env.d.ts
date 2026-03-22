/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** When set, load this campaign id from Supabase; otherwise the first published campaign (by id) is used. */
  readonly VITE_CAMPAIGN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
