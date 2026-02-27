/**
 * Playbook definitions from the GDD: stats and starting moves.
 */

import type {
  Character,
  CharacterResources,
  PlaybookDefinition,
  Progression,
} from '@/types/character';

export const PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'rift-weaver',
    name: 'Rift-Weaver',
    description:
      'Manipulates the fabric of reality, fortifies the interdimensional basecamp, and evades danger using cosmic energy, magic, or advanced tech.',
    stats: { brawn: -1, flow: 2, haste: 0, focus: 1 },
    startingMoves: [
      {
        id: 'aether-shield',
        name: 'Aether Shield',
        description:
          'When an enemy retaliates, you may spend 1 Ward or 1 Aether to absorb the hit completely.',
      },
      {
        id: 'nexus-synthesizer',
        name: 'Nexus Synthesizer',
        description:
          'Spend 2 Aether to restore 3 HP.',
      },
      {
        id: 'dimensional-anchor',
        name: 'Dimensional Anchor',
        description:
          'Spend 2 Aether (once per encounter) to reduce an Elite or Boss\'s required Strikes by 1.',
      },
    ],
  },
  {
    id: 'gate-crasher',
    name: 'Gate-Crasher',
    description:
      'A front-line powerhouse who uses brute force, martial arts, or heavy weaponry to shatter the barriers between worlds and crush obstacles.',
    stats: { brawn: 2, flow: 0, haste: 1, focus: -1 },
    startingMoves: [
      {
        id: 'momentum-strike',
        name: 'Momentum Strike',
        description:
          'Logging a 45+ minute strength/martial arts class grants an automatic bonus +1 Strike to your target.',
      },
      {
        id: 'aura-of-conquest',
        name: 'Aura of Conquest',
        description:
          'When you defeat an encounter, gain +1 Ward.',
      },
      {
        id: 'defy-reality',
        name: 'Defy Reality',
        description:
          'If your HP would reach zero, sacrifice 1 piece of Loot to restore to full HP and avoid Knockback.',
      },
    ],
  },
  {
    id: 'wayfinder',
    name: 'Wayfinder',
    description:
      'Master of the multiverse grid, relying on steady momentum and reconnaissance to navigate the slipstream between timelines.',
    stats: { brawn: 0, flow: 1, haste: 2, focus: -1 },
    startingMoves: [
      {
        id: 'scout-the-multiverse',
        name: 'Scout the Multiverse',
        description:
          'Spend 1 Aether to reveal a hex in the next ring (2 steps away) without moving.',
      },
      {
        id: 'slipstream-surge',
        name: 'Slipstream Surge',
        description:
          'When you move onto a cleared or empty hex, you have a 30% chance to restore 1 HP.',
      },
      {
        id: 'phase-strike',
        name: 'Phase Strike',
        description:
          'Spend 3 Slipstream to deal 1 Strike to an enemy without triggering retaliation.',
      },
    ],
  },
];

const DEFAULT_RESOURCES: CharacterResources = {
  slipstream: 5,
  strikes: 2,
  wards: 0,
  aether: 1,
};

const DEFAULT_PROGRESSION: Progression = {
  xp: 0,
  level: 1,
  currency: 120,
};

export function getPlaybook(id: string): PlaybookDefinition | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/**
 * Build initial character from creation choices. Caller can persist to localStorage.
 */
export function buildCharacter(
  name: string,
  playbookId: string,
  startingMoveId: string
): Character {
  const playbook = getPlaybook(playbookId);
  if (!playbook) throw new Error(`Unknown playbook: ${playbookId}`);
  const move = playbook.startingMoves.find((m) => m.id === startingMoveId);
  if (!move) throw new Error(`Unknown starting move: ${startingMoveId} for playbook ${playbookId}`);

  return {
    name: name.trim() || 'Worldhopper',
    playbook: playbook.id,
    startingMoveId: move.id,
    stats: { ...playbook.stats },
    resources: { ...DEFAULT_RESOURCES },
    progression: { ...DEFAULT_PROGRESSION },
    hp: 5,
    maxHp: 5,
  };
}
