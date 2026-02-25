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
