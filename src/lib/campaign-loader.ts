import type {
  CampaignPackage,
  DimensionalAnomaly,
  Encounter,
  EncounterLootDrop,
  NarrativeRift,
  NarrativeRiftStage,
  Realm,
} from '@/types/campaign';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { supabase } from './supabase';

/** DB row shape for `public.campaigns` (subset used by the app). */
export interface CampaignRow {
  id: string;
  name: string;
  theme_description: string;
  grid_radius: number;
  grid_cols: number | null;
  grid_rows: number | null;
  starting_hex: unknown;
  hero_image_url: string;
  map_background_url: string;
  loot_frame_url: string;
}

export interface LootItemRow {
  campaign_id: string;
  id: string;
  name: string;
  kind: 'consumable' | 'artifact';
  description: string | null;
  image_url: string | null;
}

export interface EncounterRow {
  campaign_id: string;
  id: string;
  type: 'basic' | 'elite' | 'boss';
  name: string;
  strikes: number;
  gold: number;
  xp: number | null;
  image_url: string | null;
  loot_item_id: string | null;
  sort_order: number;
}

export interface RiftRow {
  campaign_id: string;
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  stages: unknown;
  completion_xp: number | null;
  completion_loot_item_id: string | null;
  sort_order: number;
}

export interface DimensionalAnomalyRow {
  campaign_id: string;
  id: string;
  name: string;
  image_url: string | null;
  cost: number;
  resource: 'strikes' | 'wards' | 'slipstream';
  resource_amount: number;
  gold: number;
  lore_text: string | null;
  sort_order: number;
}

function parseStartingHex(raw: unknown): { q: number; r: number } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.q === 'number' && typeof o.r === 'number') return { q: o.q, r: o.r };
  return undefined;
}

function toRealm(row: CampaignRow): Realm {
  return {
    id: row.id,
    name: row.name,
    theme_description: row.theme_description,
    grid_radius: row.grid_radius,
    grid_cols: row.grid_cols ?? undefined,
    grid_rows: row.grid_rows ?? undefined,
    startingHex: parseStartingHex(row.starting_hex),
    hero_image_url: row.hero_image_url,
    map_background_url: row.map_background_url,
    loot_frame_url: row.loot_frame_url,
  };
}

function lootRowToDrop(row: LootItemRow): EncounterLootDrop {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    description: row.description ?? undefined,
    image_url: row.image_url ?? undefined,
  };
}

function parseRiftStages(raw: unknown): NarrativeRiftStage[] {
  if (!Array.isArray(raw)) return [];
  return raw as NarrativeRiftStage[];
}

/**
 * Maps Supabase campaign content rows into a `CampaignPackage`.
 * Exported for unit tests; production code uses `loadActiveCampaign`.
 */
export function campaignRowsToCampaignPackage(
  campaign: CampaignRow,
  lootRows: LootItemRow[],
  encounterRows: EncounterRow[],
  riftRows: RiftRow[],
  anomalyRows: DimensionalAnomalyRow[]
): CampaignPackage {
  const lootById = new Map<string, LootItemRow>();
  for (const row of lootRows) {
    lootById.set(row.id, row);
  }

  const encounters: Encounter[] = [...encounterRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const loot_drop = row.loot_item_id
        ? lootById.has(row.loot_item_id)
          ? lootRowToDrop(lootById.get(row.loot_item_id)!)
          : undefined
        : undefined;
      const enc: Encounter = {
        id: row.id,
        type: row.type,
        name: row.name,
        strikes: row.strikes,
        gold: row.gold,
        image_url: row.image_url ?? undefined,
        loot_drop,
      };
      if (row.xp != null) enc.xp = row.xp;
      return enc;
    });

  const anomalies: DimensionalAnomaly[] = [...anomalyRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      name: row.name,
      image_url: row.image_url ?? undefined,
      cost: row.cost,
      resource: row.resource,
      resource_amount: row.resource_amount,
      gold: row.gold,
      lore_text: row.lore_text ?? undefined,
    }));

  const rifts: NarrativeRift[] = [...riftRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => {
      const rift: NarrativeRift = {
        id: row.id,
        name: row.name,
        description: row.description,
        image_url: row.image_url ?? undefined,
        stages: parseRiftStages(row.stages),
      };
      if (row.completion_xp != null) rift.completion_xp = row.completion_xp;
      if (row.completion_loot_item_id && lootById.has(row.completion_loot_item_id)) {
        rift.completion_loot = lootRowToDrop(lootById.get(row.completion_loot_item_id)!);
      }
      return rift;
    });

  return {
    realm: toRealm(campaign),
    encounters,
    anomalies,
    rifts,
  };
}

async function fetchPublishedCampaignRow(): Promise<CampaignRow | null> {
  const explicitId = import.meta.env.VITE_CAMPAIGN_ID as string | undefined;
  if (explicitId) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', explicitId)
      .eq('is_published', true)
      .maybeSingle();
    if (error) {
      console.error('[campaign-loader] campaigns by id:', error.message);
      return null;
    }
    return data as CampaignRow | null;
  }
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_published', true)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[campaign-loader] campaigns list:', error.message);
    return null;
  }
  return data as CampaignRow | null;
}

/**
 * Fetches the active campaign package from Supabase (published campaign + related rows).
 * Returns `null` when env is not configured, no matching campaign exists, or a query fails.
 */
export async function loadActiveCampaign(): Promise<CampaignPackage | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  /** Unit tests (Vitest) use bundled campaign data; integration can mock this module. */
  if (import.meta.env.MODE === 'test') {
    return null;
  }

  const campaign = await fetchPublishedCampaignRow();
  if (!campaign) {
    return null;
  }

  const cid = campaign.id;

  const [lootRes, encRes, riftRes, anomRes] = await Promise.all([
    supabase.from('loot_items').select('*').eq('campaign_id', cid),
    supabase.from('encounters').select('*').eq('campaign_id', cid).order('sort_order', { ascending: true }),
    supabase.from('rifts').select('*').eq('campaign_id', cid).order('sort_order', { ascending: true }),
    supabase
      .from('dimensional_anomalies')
      .select('*')
      .eq('campaign_id', cid)
      .order('sort_order', { ascending: true }),
  ]);

  if (lootRes.error) {
    console.error('[campaign-loader] loot_items:', lootRes.error.message);
    return null;
  }
  if (encRes.error) {
    console.error('[campaign-loader] encounters:', encRes.error.message);
    return null;
  }
  if (riftRes.error) {
    console.error('[campaign-loader] rifts:', riftRes.error.message);
    return null;
  }
  if (anomRes.error) {
    console.error('[campaign-loader] dimensional_anomalies:', anomRes.error.message);
    return null;
  }

  return campaignRowsToCampaignPackage(
    campaign,
    (lootRes.data ?? []) as LootItemRow[],
    (encRes.data ?? []) as EncounterRow[],
    (riftRes.data ?? []) as RiftRow[],
    (anomRes.data ?? []) as DimensionalAnomalyRow[]
  );
}
