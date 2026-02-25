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
          '20 mins of Yoga grants 1 Ward. Spend a Ward to absorb a local entity\'s attack completely.',
      },
      {
        id: 'nexus-synthesizer',
        name: 'Nexus Synthesizer',
        description:
          'Log a healthy home-cooked meal to convert local drops into a Restorative Consumable (Refills Aether or grants +1 Haste for next cardio session).',
      },
      {
        id: 'dimensional-anchor',
        name: 'Dimensional Anchor',
        description:
          'Spend 1 Focus (earned via meditation) to lock down an Elite/Boss, reducing its required Strikes by 1.',
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
          'Logging an in-person, professional class forces all adjacent basic mobs to flee, leaving their loot behind.',
      },
      {
        id: 'defy-reality',
        name: 'Defy Reality',
        description:
          'If your HP reaches zero, permanently sacrifice 1 piece of Loot to stay at 1 HP and immediately strike back.',
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
          'Taking a pet on a dedicated walk generates a Scout Token, allowing you to reveal an adjacent hex without moving into it.',
      },
      {
        id: 'slipstream-surge',
        name: 'Slipstream Surge',
        description:
          'When biking, activate this to leap 2 hexes in a straight line, ignoring basic encounter tiles in your path.',
      },
      {
        id: 'phase-strike',
        name: 'Phase Strike',
        description:
          'Spend 2 Slipstream Tokens (Cardio) to deal 1 Strike to an obstacle through interdimensional evasion, bypassing the need for a Strength workout.',
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
  };
}
