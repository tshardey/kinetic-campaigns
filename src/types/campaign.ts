/**
 * Campaign package types. Each campaign/realm is defined by this interface,
 * stored entirely in Supabase. Images use Supabase Storage URLs.
 */

export interface Realm {
  id: string;
  name: string;
  theme_description: string;
  grid_radius: number;
  hero_image_url: string;
  map_background_url: string;
  loot_frame_url: string;
}

export type EncounterType = 'basic' | 'elite' | 'boss';

/** Combat encounter (basic, elite, boss) with image_url and loot. */
export interface Encounter {
  type: EncounterType;
  name: string;
  image_url?: string;
  strikes: number;
  gold: number;
}

export interface DimensionalAnomaly {
  id: string;
  name: string;
  image_url?: string;
  stat: string;
  cost: number;
  gold: number;
}

export interface NarrativeRift {
  id: string;
  name: string;
  description: string;
  image_url?: string;
}

export interface CampaignPackage {
  realm: Realm;
  encounters: Encounter[];
  anomalies: DimensionalAnomaly[];
  rifts: NarrativeRift[];
}

/** Encounter or anomaly placed on a hex for map display and engagement. */
export type MapEncounter =
  | { type: EncounterType; name: string; strikes: number; gold: number }
  | { type: 'anomaly'; name: string; stat: string; cost: number; gold: number };

/** Nexus Tent reward item (real-world reward for currency). */
export interface NexusReward {
  id: number | string;
  title: string;
  cost: number;
  icon: string;
  desc: string;
}
