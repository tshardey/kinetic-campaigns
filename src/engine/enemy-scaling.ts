/**
 * Level-based enemy HP scaling. HP is rolled on first contact with an encounter
 * using weighted probability tables that shift by player level.
 */

import type { EncounterType } from '@/types/campaign';

export interface EnemyHpScaling {
  possibleHp: number[];
  probabilityByLevel: Record<number, number[]>;
}

const SCALING: Record<EncounterType, EnemyHpScaling> = {
  basic: {
    possibleHp: [1, 2, 3],
    probabilityByLevel: {
      1: [1, 0, 0],
      2: [0.6, 0.4, 0],
      3: [0.3, 0.5, 0.2],
      4: [0.1, 0.4, 0.5],
      5: [0, 0.3, 0.7],
    },
  },
  elite: {
    possibleHp: [3, 4, 5],
    probabilityByLevel: {
      1: [1, 0, 0],
      2: [0.5, 0.5, 0],
      3: [0.2, 0.5, 0.3],
      4: [0, 0.4, 0.6],
      5: [0, 0.2, 0.8],
    },
  },
  boss: {
    possibleHp: [5, 7, 9],
    probabilityByLevel: {
      1: [1, 0, 0],
      2: [0.6, 0.4, 0],
      3: [0.2, 0.5, 0.3],
      4: [0, 0.4, 0.6],
      5: [0, 0.1, 0.9],
    },
  },
};

/**
 * Roll enemy HP for a combat encounter based on type and player level.
 * For levels beyond the max defined in the table, uses the highest level's distribution.
 */
export function rollEnemyHp(type: EncounterType, level: number): number {
  const scaling = SCALING[type];
  const levels = Object.keys(scaling.probabilityByLevel).map(Number).sort((a, b) => a - b);
  const clampedLevel = Math.min(level, levels.length > 0 ? levels[levels.length - 1]! : 1);
  const probs = scaling.probabilityByLevel[clampedLevel] ?? scaling.probabilityByLevel[1]!;
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i]!;
    if (r < acc) return scaling.possibleHp[i]!;
  }
  return scaling.possibleHp[scaling.possibleHp.length - 1]!;
}
