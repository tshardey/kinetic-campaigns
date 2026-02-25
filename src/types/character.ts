/**
 * Character, stats, resources, and progression types.
 */

export interface CharacterStats {
  brawn: number;
  flow: number;
  haste: number;
  focus: number;
}

export interface CharacterResources {
  slipstream: number;
  strikes: number;
  wards: number;
  aether: number;
}

export interface Progression {
  xp: number;
  level: number;
  currency: number;
}

export interface Character {
  id?: string;
  name?: string;
  stats: CharacterStats;
  resources: CharacterResources;
  progression: Progression;
}

export type ActivityType = 'cardio' | 'strength' | 'yoga' | 'wellness';
