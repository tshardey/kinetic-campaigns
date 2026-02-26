/**
 * Campaign package types. Each campaign/realm is defined by this interface,
 * stored entirely in Supabase. Images use Supabase Storage URLs.
 */

export interface Realm {
  id: string;
  name: string;
  theme_description: string;
  /** Circular grid radius (used when grid_cols/grid_rows not set). */
  grid_radius: number;
  /** Rectangular grid columns (16:9 map). When set with grid_rows, use rectangular grid. */
  grid_cols?: number;
  /** Rectangular grid rows. Use with grid_cols. */
  grid_rows?: number;
  hero_image_url: string;
  map_background_url: string;
  loot_frame_url: string;
}

export type EncounterType = 'basic' | 'elite' | 'boss';

/** Loot drop from an encounter (consumable or artifact). */
export interface EncounterLootDrop {
  id: string;
  name: string;
  kind: 'consumable' | 'artifact';
  description?: string;
  image_url?: string;
}

/** Combat encounter (basic, elite, boss) with image_url and loot. */
export interface Encounter {
  id: string;
  type: EncounterType;
  name: string;
  image_url?: string;
  strikes: number;
  gold: number;
  xp?: number;
  loot_drop?: EncounterLootDrop;
}

export interface DimensionalAnomaly {
  id: string;
  name: string;
  image_url?: string;
  stat: string;
  cost: number;
  gold: number;
}

/** A single stage of a narrative rift with a stat check. */
export interface NarrativeRiftStage {
  id: string;
  name: string;
  required_stat: string;
  description: string;
  image_url?: string;
}

export interface NarrativeRift {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  stages: NarrativeRiftStage[];
}

export interface CampaignPackage {
  realm: Realm;
  encounters: Encounter[];
  anomalies: DimensionalAnomaly[];
  rifts: NarrativeRift[];
}

/** Encounter or anomaly placed on a hex for map display and engagement. Optional id links to campaign data for artwork/loot. */
export type MapEncounter =
  | { id?: string; type: EncounterType; name: string; strikes: number; gold: number }
  | { id?: string; type: 'anomaly'; name: string; stat: string; cost: number; gold: number };

/** Nexus Tent reward item (real-world reward for currency). */
export interface NexusReward {
  id: number | string;
  title: string;
  cost: number;
  icon: string;
  desc: string;
}
