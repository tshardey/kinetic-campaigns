/**
 * XP, leveling, and currency calculations. Pure logic, no UI.
 */

import type { Progression } from '@/types/character';

/**
 * XP required to level up from current level (total XP for next level).
 */
export function getXpCap(level: number): number {
  return 10 * Math.pow(2, level - 1);
}

/**
 * Add XP and apply level-up logic; may increment level and carry over excess XP.
 */
export function addXp(current: Progression, xpGain: number): Progression {
  let newXp = current.xp + xpGain;
  let newLevel = current.level;
  const xpCap = getXpCap(current.level);

  if (newXp >= xpCap) {
    newLevel += 1;
    newXp -= xpCap;
  }

  return {
    ...current,
    xp: newXp,
    level: newLevel,
  };
}

/**
 * Add currency (gold) to progression.
 */
export function addCurrency(
  current: Progression,
  amount: number
): Progression {
  return {
    ...current,
    currency: current.currency + amount,
  };
}

/**
 * Apply encounter reward: add gold and optional XP (with level-up).
 */
export function applyEncounterReward(
  current: Progression,
  gold: number,
  xpGain: number = 0
): Progression {
  const withCurrency = addCurrency(current, gold);
  return addXp(withCurrency, xpGain);
}

/**
 * Result of computing encounter reward when level-up flow is used:
 * if leveledUp, progression is held at cap and caller should show level-up modal.
 */
export interface EncounterRewardResult {
  /** Progression after adding gold only (xp held at cap if would level). */
  progression: Progression;
  /** True if this reward would level up (modal should be shown). */
  leveledUp: boolean;
  /** Progression to apply after user completes level-up choice (only when leveledUp). */
  nextProgressionAfterLevelUp: Progression | null;
}

/**
 * Compute encounter reward; when it would level up, return progression at cap
 * and the progression to apply after level-up choice (for level-up flow).
 */
export function applyEncounterRewardWithLevelUpFlow(
  current: Progression,
  gold: number,
  xpGain: number
): EncounterRewardResult {
  const withCurrency = addCurrency(current, gold);
  const xpCap = getXpCap(withCurrency.level);
  const wouldLevel = withCurrency.xp + xpGain >= xpCap;
  if (wouldLevel) {
    return {
      progression: { ...withCurrency, xp: xpCap },
      leveledUp: true,
      nextProgressionAfterLevelUp: addXp(withCurrency, xpGain),
    };
  }
  return {
    progression: addXp(withCurrency, xpGain),
    leveledUp: false,
    nextProgressionAfterLevelUp: null,
  };
}

/**
 * Spend currency (e.g. Nexus purchase). Returns new progression or null if insufficient.
 */
export function spendCurrency(
  current: Progression,
  amount: number
): Progression | null {
  if (current.currency < amount) return null;
  return {
    ...current,
    currency: current.currency - amount,
  };
}
