/**
 * Character persistence: Supabase when authenticated + configured, else localStorage.
 */

import type { Character } from '@/types/character';
import { supabase } from '@/lib/supabase';
import { ensureCharacterHp } from '@/lib/game-state-storage';
import { isSupabaseConfigured } from '@/lib/supabase-config';

const STORAGE_KEY = 'kinetic-campaigns-character';

export function loadCharacterLocal(): Character | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Character;
    if (!data.name || !data.playbook || !data.startingMoveId || !data.stats) return null;
    return ensureCharacterHp(data);
  } catch {
    return null;
  }
}

export function saveCharacterLocal(character: Character): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
}

/**
 * Load character for the active campaign (localStorage or Supabase `characters.payload`).
 */
export async function loadCharacter(campaignId: string): Promise<Character | null> {
  if (!isSupabaseConfigured()) {
    return loadCharacterLocal();
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return loadCharacterLocal();
  }

  const { data, error } = await supabase
    .from('characters')
    .select('payload')
    .eq('user_id', user.id)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (error) {
    console.error('[character-storage] load failed:', error.message);
    return null;
  }

  const payload = data?.payload as Character | undefined;
  if (!payload?.name || !payload.playbook || !payload.startingMoveId || !payload.stats) {
    return null;
  }
  return ensureCharacterHp(payload);
}

/**
 * Upsert character row for this user + campaign (full character JSON in `payload`).
 */
export async function saveCharacter(character: Character, campaignId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveCharacterLocal(character);
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    saveCharacterLocal(character);
    return;
  }

  const { error } = await supabase.from('characters').upsert(
    {
      user_id: user.id,
      campaign_id: campaignId,
      payload: character,
    },
    { onConflict: 'user_id,campaign_id' }
  );

  if (error) {
    console.error('[character-storage] save failed:', error.message);
    saveCharacterLocal(character);
    console.warn('[character-storage] saved to localStorage after cloud failure');
  }
}
