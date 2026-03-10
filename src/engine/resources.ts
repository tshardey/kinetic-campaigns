/**
 * Slipstream, Strikes, Wards, and Aether management. Pure logic, no UI.
 * Anomalies always cost aether + one other resource (strikes, wards, or slipstream).
 */

import type { CharacterResources, CharacterStats, ActivityType } from '@/types/character';
import type { AnomalyResourceType } from '@/types/campaign';

/** Options for applyActivity: stats enable boosts; activeMoveIds enables move intercepts. */
export interface ApplyActivityOptions {
  stats: CharacterStats;
  activeMoveIds?: string[];
  /** @deprecated Prefer activeMoveIds; kept for backward compatibility in tests/callers. */
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

/** Round to nearest half (0.5) to keep resource values as whole or half only. */
function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
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

/** All activities use the same baseline: 20 minutes = 1 point. Points can be half-increments (0.5, 1, 1.5, 2, ...). */
export const ACTIVITY_MINUTES_PER_POINT = 20;

/**
 * Activity points from duration: 20 min = 1 point. Rounds down to the nearest half or whole (no finer fractions).
 * e.g. 10 min → 0.5, 20 min → 1, 30 min → 1.5, 40 min → 2.
 */
export function activityPointsFromMinutes(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.floor((minutes / ACTIVITY_MINUTES_PER_POINT) * 2) / 2;
}

/**
 * Apply a logged activity and return updated resources.
 * All activities use 20 min = 1 point; points round down to nearest half (0.5, 1, 1.5, 2, ...).
 * When durationMinutes is provided, grants that many points. When omitted, grants 1 point (quick log). Under 10 min grants 0.
 * When options.stats is provided, adds a boost roll (stat * 0.10 > random) per full point for the mapped stat.
 * Playbook intercepts: Momentum Strike (strength) +1 Strike; Aether Cascade (agility) 50% +1 Aether.
 */
export function applyActivity(
  current: CharacterResources,
  activity: ActivityType,
  durationMinutes?: number,
  options?: ApplyActivityOptions
): CharacterResources {
  const next = { ...current };
  const activeMoves = new Set<string>([
    ...(options?.activeMoveIds ?? []),
    ...(options?.startingMoveId ? [options.startingMoveId] : []),
  ]);
  const points =
    durationMinutes != null && durationMinutes > 0
      ? activityPointsFromMinutes(durationMinutes)
      : 1;
  if (points < 0.5) return next;

  const statKey = options?.stats ? ACTIVITY_STAT[activity] : null;
  const statValue = statKey != null ? options!.stats[statKey] ?? 0 : 0;
  let boostTotal = 0;
  const fullPoints = Math.floor(points);
  if (options?.stats && statKey != null && fullPoints > 0) {
    for (let i = 0; i < fullPoints; i++) {
      boostTotal += calculateBoost(statValue);
    }
  }

  const total = points + boostTotal;
  switch (activity) {
    case 'cardio':
      next.slipstream = roundToHalf(next.slipstream + total);
      break;
    case 'strength':
      next.strikes = roundToHalf(next.strikes + total);
      break;
    case 'yoga':
      next.wards = roundToHalf(next.wards + total);
      break;
    case 'wellness':
      next.aether = roundToHalf(next.aether + total);
      break;
  }

  // Playbook intercepts
  if (activeMoves.has('momentum-strike') && activity === 'strength') {
    next.strikes += 1;
  }
  if (activeMoves.has('aether-cascade') && activity === 'yoga' && Math.random() < 0.5) {
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
