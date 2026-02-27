/**
 * Narrative rift stage checks: activity-based (resource) costs and legacy stat checks.
 */

import type { CharacterResources, CharacterStats } from '@/types/character';
import type { NarrativeRiftStage, RiftStageCost, AnomalyResourceType } from '@/types/campaign';
import { spendStrikes, spendSlipstream, spendWards } from '@/engine/resources';

const STAT_KEY_MAP: Record<string, keyof CharacterStats> = {
  Brawn: 'brawn',
  brawn: 'brawn',
  Flow: 'flow',
  flow: 'flow',
  Haste: 'haste',
  haste: 'haste',
  Focus: 'focus',
  focus: 'focus',
};

/** Effective list of costs for a stage (costs array, or single cost, or none). */
export function getRiftStageCosts(stage: NarrativeRiftStage): RiftStageCost[] {
  if (stage.costs?.length) return stage.costs;
  if (stage.cost) return [stage.cost];
  return [];
}

/**
 * Whether the player can afford to attempt this rift stage (resource cost(s) or legacy stat).
 */
export function canAffordRiftStage(
  resources: CharacterResources,
  stats: CharacterStats,
  stage: NarrativeRiftStage
): boolean {
  const costs = getRiftStageCosts(stage);
  if (costs.length > 0) {
    return costs.every(({ resource, amount }) => amount <= (resources[resource] ?? 0));
  }
  if (stage.required_stat) {
    const key = STAT_KEY_MAP[stage.required_stat] ?? (stage.required_stat.toLowerCase() as keyof CharacterStats);
    const value = key in stats ? stats[key as keyof CharacterStats] : 0;
    return value >= 1;
  }
  return true;
}

/**
 * Spend resources for attempting a rift stage. Returns new resources or null if insufficient.
 */
export function spendForRiftStage(
  current: CharacterResources,
  stage: NarrativeRiftStage
): CharacterResources | null {
  const costs = getRiftStageCosts(stage);
  let next = current;
  for (const { resource, amount } of costs) {
    if ((next[resource] ?? 0) < amount) return null;
    if (resource === 'strikes') next = spendStrikes(next, amount)!;
    else if (resource === 'slipstream') next = spendSlipstream(next, amount)!;
    else if (resource === 'wards') next = spendWards(next, amount)!;
    else return null;
  }
  return next;
}

const RESOURCE_LABELS: Record<AnomalyResourceType, (amount: number) => string> = {
  strikes: (n) => `Strike${n !== 1 ? 's' : ''} (log Strength)`,
  slipstream: () => `Slipstream (log Cardio)`,
  wards: (n) => `Ward${n !== 1 ? 's' : ''} (log Agility)`,
};

/**
 * Human-readable label for the stage cost(s) (resource names + activity hints).
 */
export function getRiftStageCostLabel(stage: NarrativeRiftStage): string {
  const costs = getRiftStageCosts(stage);
  if (costs.length === 0) {
    if (stage.required_stat) return `${getRequiredStatLabel(stage)} ≥ 1`;
    return 'No requirement';
  }
  return costs
    .map(({ resource, amount }) => `${amount} ${RESOURCE_LABELS[resource](amount)}`)
    .join(' + ');
}

/** Stat key for lookup in CharacterStats (legacy). */
export function getRequiredStatKey(stage: NarrativeRiftStage): keyof CharacterStats | null {
  if (!stage.required_stat) return null;
  const key = STAT_KEY_MAP[stage.required_stat] ?? (stage.required_stat?.toLowerCase() as keyof CharacterStats);
  return key in { brawn: 0, flow: 0, haste: 0, focus: 0 } ? key : null;
}

/** Human-readable label for required stat (legacy). */
export function getRequiredStatLabel(stage: NarrativeRiftStage): string {
  if (!stage.required_stat) return '';
  const labels: Record<string, string> = {
    brawn: 'Brawn',
    flow: 'Flow',
    haste: 'Haste',
    focus: 'Focus',
  };
  const key = stage.required_stat.toLowerCase();
  return labels[key] ?? stage.required_stat;
}

/** Legacy: whether the character's stat meets the stage requirement. Used when stage has no cost. */
export function canPassRiftStage(
  stats: CharacterStats,
  stage: NarrativeRiftStage
): boolean {
  if (getRiftStageCosts(stage).length > 0) return false; // caller should use canAffordRiftStage with resources
  if (!stage.required_stat) return true;
  const key = STAT_KEY_MAP[stage.required_stat] ?? (stage.required_stat.toLowerCase() as keyof CharacterStats);
  const value = key in stats ? stats[key as keyof CharacterStats] : 0;
  return value >= 1;
}
