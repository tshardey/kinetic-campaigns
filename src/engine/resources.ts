/**
 * Slipstream, Strikes, Wards, and Aether management. Pure logic, no UI.
 * Anomalies always cost aether + one other resource (strikes, wards, or slipstream).
 */

import type { CharacterResources, CharacterStats, ActivityType } from '@/types/character';
import type { AnomalyResourceType } from '@/types/campaign';

/** Options for applyActivity: stats enable the boost mechanic; startingMoveId enables playbook intercepts. */
export interface ApplyActivityOptions {
  stats: CharacterStats;
  startingMoveId?: string;
}

/** Stat mapped to each activity for the boost roll: Strength->Brawn, Cardio->Haste, Agility->Flow, Wellness->Focus. */
const ACTIVITY_STAT: Record<ActivityType, keyof CharacterStats> = {
  strength: 'brawn',
  cardio: 'haste',
  yoga: 'flow',
  wellness: 'focus',
};

/**
 * Boost roll: (statValue * 0.10) > Math.random() grants 1 extra resource, else 0.
 */
export function calculateBoost(statValue: number): number {
  return (statValue * 0.1) > Math.random() ? 1 : 0;
}

/** Encounter cost shape used for affordability and spending. */
export interface EncounterCost {
  type: 'basic' | 'elite' | 'boss' | 'anomaly';
  strikes?: number;
  /** Aether cost (anomalies only). */
  cost?: number;
  /** Secondary resource for anomaly (strikes, wards, or slipstream). */
  resource?: AnomalyResourceType;
  resource_amount?: number;
}

/** Minutes per 1 unit: 20 min cardio = 1 Slipstream, 15 min strength = 1 Strike, 20 min agility = 1 Ward, 15 min wellness = 1 Aether. */
export const ACTIVITY_MINUTES_PER_UNIT: Record<ActivityType, number> = {
  cardio: 20,
  strength: 15,
  yoga: 20,
  wellness: 15,
};

/**
 * Apply a logged activity and return updated resources.
 * When durationMinutes is provided, grants units by floor(durationMinutes / threshold) (e.g. 20 min cardio = 1 Slipstream).
 * When omitted, grants 1 unit (quick log). Under threshold grants 0.
 * When options.stats is provided, adds a boost roll (stat * 0.10 > random) per unit for the mapped stat (Strength->Brawn, Cardio->Haste, Agility->Flow, Wellness->Focus).
 * Playbook intercepts: Momentum Strike (strength) +1 Strike; Aether Cascade (agility) 50% +1 Aether.
 */
export function applyActivity(
  current: CharacterResources,
  activity: ActivityType,
  durationMinutes?: number,
  options?: ApplyActivityOptions
): CharacterResources {
  const next = { ...current };
  const units =
    durationMinutes != null && durationMinutes > 0
      ? Math.floor(durationMinutes / ACTIVITY_MINUTES_PER_UNIT[activity])
      : 1;
  if (units < 1) return next;

  const statKey = options?.stats ? ACTIVITY_STAT[activity] : null;
  const statValue = statKey != null ? options!.stats[statKey] ?? 0 : 0;
  let boostTotal = 0;
  if (options?.stats && statKey != null) {
    for (let i = 0; i < units; i++) {
      boostTotal += calculateBoost(statValue);
    }
  }

  switch (activity) {
    case 'cardio':
      next.slipstream += units + boostTotal;
      break;
    case 'strength':
      next.strikes += units + boostTotal;
      break;
    case 'yoga':
      next.wards += units + boostTotal;
      break;
    case 'wellness':
      next.aether += units + boostTotal;
      break;
  }

  // Playbook intercepts
  if (options?.startingMoveId === 'momentum-strike' && activity === 'strength') {
    next.strikes += 1;
  }
  if (options?.startingMoveId === 'aether-cascade' && activity === 'yoga' && Math.random() < 0.5) {
    next.aether += 1;
  }

  return next;
}

/**
 * Whether the player can afford to move (spend 1 Slipstream).
 */
export function canAffordMove(resources: CharacterResources): boolean {
  return resources.slipstream >= 1;
}

/**
 * Spend one Slipstream (e.g. for a move). Returns new resources or null if insufficient.
 */
export function spendSlipstream(
  current: CharacterResources,
  amount: number = 1
): CharacterResources | null {
  if (current.slipstream < amount) return null;
  return {
    ...current,
    slipstream: current.slipstream - amount,
  };
}

/**
 * Spend Strikes. Returns new resources or null if insufficient.
 */
export function spendStrikes(
  current: CharacterResources,
  amount: number
): CharacterResources | null {
  if (current.strikes < amount) return null;
  return {
    ...current,
    strikes: current.strikes - amount,
  };
}

/**
 * Spend Aether. Returns new resources or null if insufficient.
 */
export function spendAether(
  current: CharacterResources,
  amount: number
): CharacterResources | null {
  if (current.aether < amount) return null;
  return {
    ...current,
    aether: current.aether - amount,
  };
}

/**
 * Spend Wards. Returns new resources or null if insufficient.
 */
export function spendWards(
  current: CharacterResources,
  amount: number
): CharacterResources | null {
  if (current.wards < amount) return null;
  return {
    ...current,
    wards: current.wards - amount,
  };
}

/**
 * Whether the player can afford to engage this encounter (strikes for combat; aether + resource for anomaly).
 */
export function canAffordEncounter(
  resources: CharacterResources,
  encounter: EncounterCost
): boolean {
  if (encounter.type === 'anomaly') {
    const cost = encounter.cost ?? 0;
    const amount = encounter.resource_amount ?? 0;
    const key = encounter.resource;
    if (resources.aether < cost || !key || amount <= 0) return false;
    return resources[key] >= amount;
  }
  const strikes = encounter.strikes ?? 0;
  return resources.strikes >= strikes;
}

/**
 * Spend resources required for the encounter. Returns new resources or null if insufficient.
 * For anomalies, spends aether then the secondary resource (strikes, wards, or slipstream).
 */
export function spendForEncounter(
  current: CharacterResources,
  encounter: EncounterCost
): CharacterResources | null {
  if (encounter.type === 'anomaly') {
    const cost = encounter.cost ?? 0;
    const amount = encounter.resource_amount ?? 0;
    const key = encounter.resource;
    const afterAether = spendAether(current, cost);
    if (!afterAether || !key || amount <= 0) return null;
    if (key === 'strikes') return spendStrikes(afterAether, amount);
    if (key === 'wards') return spendWards(afterAether, amount);
    if (key === 'slipstream') return spendSlipstream(afterAether, amount);
    return null;
  }
  const strikes = encounter.strikes ?? 0;
  return spendStrikes(current, strikes);
}
