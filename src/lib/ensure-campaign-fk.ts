/**
 * Ensures `public.campaigns` has a row for the bundled Omija id so `characters` / `game_states`
 * FK succeeds. Uses RPC from `supabase/migrations/*ensure_omija_campaign_row_rpc*`.
 */

import { OMIJA_CAMPAIGN_ID } from '@/constants/campaign-ids';
import { supabase } from '@/lib/supabase';

/**
 * @returns `true` if cloud upsert may proceed (`false` when Omija RPC failed — do not upsert or you will hit FK errors).
 */
export async function ensureCampaignRowForPersist(campaignId: string): Promise<boolean> {
  if (campaignId !== OMIJA_CAMPAIGN_ID) return true;
  const { error } = await supabase.rpc('ensure_omija_campaign_row');
  if (error) {
    console.error('[persist] ensure_omija_campaign_row failed:', error.message);
    return false;
  }
  return true;
}
