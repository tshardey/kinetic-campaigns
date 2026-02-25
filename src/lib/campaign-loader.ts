import type { CampaignPackage } from '@/types/campaign';
import { supabase } from './supabase';

/**
 * Fetches the active campaign package from Supabase.
 * Stub: actual schema and queries are a follow-up task.
 * @returns The campaign package or null if none loaded / not configured.
 */
export async function loadActiveCampaign(): Promise<CampaignPackage | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    return null;
  }
  // TODO: Replace with real Supabase query once schema exists
  void supabase;
  return null;
}
