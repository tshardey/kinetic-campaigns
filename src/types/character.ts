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

/** Playbook (class) identifier. */
export type PlaybookId = 'rift-weaver' | 'gate-crasher' | 'wayfinder';

/** A starting move option for a playbook. */
export interface StartingMove {
  id: string;
  name: string;
  description: string;
}

/** Playbook definition with stats and starting moves. */
export interface PlaybookDefinition {
  id: PlaybookId;
  name: string;
  description: string;
  stats: CharacterStats;
  startingMoves: StartingMove[];
}

/** A single inventory item (from encounter loot). Consumables can be used; artifacts apply buffs on acquisition. */
export interface InventoryItem {
  id: string;
  name: string;
  kind: 'consumable' | 'artifact';
  description?: string;
  image_url?: string;
}

export interface Character {
  id?: string;
  name: string;
  playbook: PlaybookId;
  startingMoveId: string;
  /** Move IDs learned on level-up (from same or other playbooks). */
  learnedMoveIds?: string[];
  stats: CharacterStats;
  resources: CharacterResources;
  progression: Progression;
  hp: number;
  maxHp: number;
  /** Loot collected from encounters. */
  inventory?: InventoryItem[];
}

export type ActivityType = 'cardio' | 'strength' | 'yoga' | 'wellness';

/** Choice made in the level-up modal (new move, cross-class move, or +1 stat). */
export type LevelUpChoice =
  | { type: 'new_move'; moveId: string }
  | { type: 'cross_class_move'; moveId: string }
  | { type: 'stat'; stat: keyof CharacterStats };
