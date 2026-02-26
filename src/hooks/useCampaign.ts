/**
 * Loads the active campaign package and provides stable encounter placement.
 * Map layout is deterministic per seed (stable per save).
 */

import { useMemo } from 'react';
import type { CampaignPackage } from '@/types/campaign';
import type { HexCell } from '@/types/hex';
import type { MapEncounter } from '@/types/campaign';
import { generateRectGrid } from '@/engine/hex-math';
import { placeEncounters, getDefaultStartHexId } from '@/engine/encounter-placement';
import { omijaCampaign } from '@/data/omija';

const PLACEMENT_SEED = 42;

export interface CampaignState {
  campaign: CampaignPackage;
  grid: HexCell[];
  placedEncounters: Record<string, MapEncounter>;
  startHexId: string;
  cols: number;
  rows: number;
  placementSeed: number;
}

/**
 * Returns the active campaign package with grid and seeded encounter placement.
 * For now uses Omija; later can load from Supabase via loadActiveCampaign().
 */
export function useCampaign(): CampaignState {
  return useMemo(() => {
    const campaign = omijaCampaign;
    const cols = campaign.realm.grid_cols ?? 14;
    const rows = campaign.realm.grid_rows ?? 9;
    const grid = generateRectGrid(cols, rows);
    const startHexId = getDefaultStartHexId(cols, rows);
    const placedEncounters = placeEncounters(
      { grid, cols, rows, seed: PLACEMENT_SEED, startHexId },
      campaign
    );
    return {
      campaign,
      grid,
      placedEncounters,
      startHexId,
      cols,
      rows,
      placementSeed: PLACEMENT_SEED,
    };
  }, []);
}
