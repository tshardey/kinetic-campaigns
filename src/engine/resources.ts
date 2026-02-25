/**
 * Slipstream, Strikes, Wards, and Aether management. Pure logic, no UI.
 */

import type { CharacterResources, ActivityType } from '@/types/character';

/** Encounter cost shape used for affordability and spending. */
export interface EncounterCost {
  type: 'basic' | 'elite' | 'boss' | 'anomaly';
  strikes?: number;
  cost?: number; // aether for anomaly
}

/**
 * Apply a logged activity and return updated resources.
 */
export function applyActivity(
  current: CharacterResources,
  activity: ActivityType
): CharacterResources {
  const next = { ...current };
  switch (activity) {
    case 'cardio':
      next.slipstream += 1;
      break;
    case 'strength':
      next.strikes += 1;
      break;
    case 'yoga':
      next.wards += 1;
      break;
    case 'wellness':
      next.aether += 1;
      break;
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
 * Whether the player can afford to engage this encounter (strikes for combat, aether for anomaly).
 */
export function canAffordEncounter(
  resources: CharacterResources,
  encounter: EncounterCost
): boolean {
  if (encounter.type === 'anomaly') {
    const cost = encounter.cost ?? 0;
    return resources.aether >= cost;
  }
  const strikes = encounter.strikes ?? 0;
  return resources.strikes >= strikes;
}

/**
 * Spend resources required for the encounter. Returns new resources or null if insufficient.
 */
export function spendForEncounter(
  current: CharacterResources,
  encounter: EncounterCost
): CharacterResources | null {
  if (encounter.type === 'anomaly') {
    const cost = encounter.cost ?? 0;
    return spendAether(current, cost);
  }
  const strikes = encounter.strikes ?? 0;
  return spendStrikes(current, strikes);
}
