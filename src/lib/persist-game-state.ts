/**
 * Supabase persistence for character + map/game state (split across `characters` and `game_states`).
 */

import type { Progression } from '@/types/character';
import { ensureCampaignRowForPersist } from '@/lib/ensure-campaign-fk';
import { supabase } from '@/lib/supabase';
import {
  ensureCharacterDefaults,
  getDefaultMapState,
  saveGameStateLocal,
  type MapState,
  type PersistedGameState,
} from '@/lib/game-state-storage';

function normalizeMapState(raw: MapState, cols: number, rows: number, startingHex?: { q: number; r: number }): MapState {
  const base = getDefaultMapState(cols, rows, startingHex);
  return {
    ...base,
    ...raw,
    encounterHealth: raw.encounterHealth ?? {},
    campaignStatus: raw.campaignStatus ?? 'active',
    anchorUses: raw.anchorUses ?? {},
    contactedHexes: raw.contactedHexes ?? [],
    riftProgress: raw.riftProgress ?? {},
  };
}

export async function loadPersistedGameStateFromSupabase(params: {
  userId: string;
  campaignId: string;
  cols: number;
  rows: number;
  startingHex?: { q: number; r: number };
}): Promise<PersistedGameState | null> {
  const { userId, campaignId, cols, rows, startingHex } = params;

  const { data: charRow, error: charErr } = await supabase
    .from('characters')
    .select('payload')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (charErr) {
    console.error('[persist] load character failed:', charErr.message);
    return null;
  }

  const payload = charRow?.payload as PersistedGameState['character'] | undefined;
  if (!payload?.name || !payload.playbook || !payload.startingMoveId || !payload.stats) {
    return null;
  }

  const character = ensureCharacterDefaults(payload);

  const { data: gsRow, error: gsErr } = await supabase
    .from('game_states')
    .select('map_state, pending_level_up, pending_progression_after_level_up')
    .eq('user_id', userId)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (gsErr) {
    console.error('[persist] load game_states failed:', gsErr.message);
    return {
      character,
      mapState: getDefaultMapState(cols, rows, startingHex),
    };
  }

  const mapState = gsRow?.map_state
    ? normalizeMapState(gsRow.map_state as MapState, cols, rows, startingHex)
    : getDefaultMapState(cols, rows, startingHex);

  const pendingProgression = gsRow?.pending_progression_after_level_up as Progression | null | undefined;

  return {
    character,
    mapState,
    pendingLevelUp: gsRow?.pending_level_up ?? false,
    pendingProgressionAfterLevelUp: pendingProgression ?? undefined,
  };
}

export async function persistGameStateToSupabase(params: {
  userId: string;
  campaignId: string;
  state: PersistedGameState;
}): Promise<void> {
  const { userId, campaignId, state } = params;
  const campaignReady = await ensureCampaignRowForPersist(campaignId);
  if (!campaignReady) {
    saveGameStateLocal(state);
    console.warn('[persist] skipping cloud save after ensure_omija_campaign_row failure; saved to localStorage');
    return;
  }
  const characterPayload = {
    ...state.character,
    resources: state.character.resources,
    progression: state.character.progression,
    inventory: state.character.inventory ?? [],
  };

  const { error: charErr } = await supabase.from('characters').upsert(
    {
      user_id: userId,
      campaign_id: campaignId,
      payload: characterPayload,
    },
    { onConflict: 'user_id,campaign_id' }
  );

  if (charErr) {
    console.error('[persist] upsert characters failed:', charErr.message);
    if (charErr.message.includes('characters_campaign_id_fkey')) {
      console.warn(
        '[persist] Hint: add a matching row to public.campaigns for this campaign_id (see supabase/migrations and README), or run pending migrations.'
      );
    }
    saveGameStateLocal(state);
    console.warn('[persist] saved full game state to localStorage after cloud failure');
    return;
  }

  const { error: gsErr } = await supabase.from('game_states').upsert(
    {
      user_id: userId,
      campaign_id: campaignId,
      map_state: state.mapState,
      pending_level_up: state.pendingLevelUp ?? false,
      pending_progression_after_level_up: state.pendingProgressionAfterLevelUp ?? null,
    },
    { onConflict: 'user_id,campaign_id' }
  );

  if (gsErr) {
    console.error('[persist] upsert game_states failed:', gsErr.message);
    saveGameStateLocal(state);
    console.warn('[persist] saved full game state to localStorage after cloud failure');
  }
}
