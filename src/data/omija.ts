/**
 * Campaign package: The Verdant Expanse of Omija
 * Sourced from realm_packages/Realm Package_ The Verdant Expanse of Omija (1).md
 *
 * Image paths reference public/campaign/omija/. 
 * We prepend BASE_URL so assets work under e.g. /kinetic-campaigns/ in both dev and prod.
 */
import type {
  CampaignPackage,
  Encounter,
  DimensionalAnomaly,
  NarrativeRift,
  NarrativeRiftStage,
  Realm,
} from '@/types/campaign';

const viteEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
const CAMPAIGN_BASE = `${(viteEnv?.BASE_URL ?? '/').replace(/\/+$/, '')}/campaign/omija`;

const realm: Realm = {
  id: 'omija',
  name: 'The Verdant Expanse of Omija',
  theme_description:
    'A whimsical, sun-drenched archipelago where the physical and spiritual worlds hold hands. Memories are tangible, and the locals use alchemy and martial artistry to maintain balance. The foul "Inkrot" anomaly has begun corrupting wildlife and kami—you must cleanse the island of the Abyssal Tide.',
  grid_radius: 4,
  grid_cols: 14,
  grid_rows: 9,
  hero_image_url: `${CAMPAIGN_BASE}/background/adventure-hero.png`,
  map_background_url: `${CAMPAIGN_BASE}/background/map-background.png`,
  loot_frame_url: `${CAMPAIGN_BASE}/loot/loot-frame.png`,
};

const encounters: Encounter[] = [
  // Basic (Tier 1 – 1 Strike)
  {
    id: 'mud-eel-scavenger',
    type: 'basic',
    name: 'Mud-Eel Scavenger',
    image_url: `${CAMPAIGN_BASE}/encounters/basic/mud-eel-scavenger.png`,
    strikes: 1,
    gold: 10,
  },
  {
    id: 'inkrot-puffer',
    type: 'basic',
    name: 'Inkrot Puffer',
    image_url: `${CAMPAIGN_BASE}/encounters/basic/inkrot-puffer.png`,
    strikes: 1,
    gold: 10,
  },
  {
    id: 'thief-of-echoes',
    type: 'basic',
    name: 'Thief of Echoes',
    image_url: `${CAMPAIGN_BASE}/encounters/basic/thief-of-echoes.png`,
    strikes: 1,
    gold: 10,
  },
  {
    id: 'gale-weed-sprite',
    type: 'basic',
    name: 'Gale-Weed Sprite',
    image_url: `${CAMPAIGN_BASE}/encounters/basic/gale-weed-sprite.png`,
    strikes: 1,
    gold: 10,
  },
  {
    id: 'awakened-automaton',
    type: 'basic',
    name: 'Awakened Automaton',
    image_url: `${CAMPAIGN_BASE}/encounters/basic/awakened-automaton.png`,
    strikes: 1,
    gold: 10,
  },
  // Elite (Tier 2 – 3 Strikes)
  {
    id: 'sovereigns-vanguard',
    type: 'elite',
    name: "The Sovereign's Vanguard",
    image_url: `${CAMPAIGN_BASE}/encounters/elite/sovereigns-vanguard.png`,
    strikes: 3,
    gold: 50,
    xp: 1,
    loot_drop: {
      id: 'vial-of-sun-catch',
      name: 'Vial of Sun-Catch',
      kind: 'consumable',
      description: 'Use: Instantly restores 1 Haste or 1 Flow point for map traversal.',
      image_url: `${CAMPAIGN_BASE}/loot/vial-of-sun-catch.png`,
    },
  },
  {
    id: 'master-of-the-crag',
    type: 'elite',
    name: 'Master of the Crag',
    image_url: `${CAMPAIGN_BASE}/encounters/elite/master-of-the-crag.png`,
    strikes: 3,
    gold: 50,
    xp: 1,
    loot_drop: {
      id: 'iron-silk-parasol',
      name: 'Iron-Silk Parasol',
      kind: 'consumable',
      description:
        'Use: Grants a 1-time shield that prevents the loss of your daily login streak or negates the penalty of a missed workout.',
      image_url: `${CAMPAIGN_BASE}/loot/iron-silk-parasol.png`,
    },
  },
  {
    id: 'echo-forgotten-shogun',
    type: 'elite',
    name: 'Echo of the Forgotten Shogun',
    image_url: `${CAMPAIGN_BASE}/encounters/elite/echo-of-forgotten-shogun.png`,
    strikes: 3,
    gold: 50,
    xp: 1,
    loot_drop: {
      id: 'memory-censer',
      name: 'Memory Censer',
      kind: 'consumable',
      description: 'Use: Clears mental fog, granting 1 free Strike against any Realm Encounter.',
      image_url: `${CAMPAIGN_BASE}/loot/memory-censer.png`,
    },
  },
  // Realm Boss (Tier 3 – 5 Strikes)
  {
    id: 'obsidian-tempest',
    type: 'boss',
    name: 'The Obsidian Tempest',
    image_url: `${CAMPAIGN_BASE}/encounters/boss/obsidian-tempest.png`,
    strikes: 5,
    gold: 200,
    xp: 3,
    loot_drop: {
      id: 'talon-of-the-west-wind',
      name: 'Talon of the West Wind',
      kind: 'artifact',
      description: 'Permanently buffs Haste.',
      image_url: `${CAMPAIGN_BASE}/loot/talon-of-the-west-wind.png`,
    },
  },
];

const anomalies: DimensionalAnomaly[] = [
  {
    id: 'whispering-shrine',
    name: 'The Whispering Shrine',
    cost: 2,
    resource: 'wards',
    resource_amount: 1,
    gold: 30,
    lore_text: 'The shrine’s whispers still. You feel a surge of clarity—your Flow resonates with the realm.',
  },
  {
    id: 'tainted-tide-pool',
    name: 'The Tainted Tide-Pool',
    cost: 2,
    resource: 'strikes',
    resource_amount: 1,
    gold: 30,
    lore_text: 'You purge the corruption with raw force. The pool clears; the water reflects the sky again.',
  },
  {
    id: 'riddle-mask-maker',
    name: 'Riddle of the Mask-Maker',
    cost: 2,
    resource: 'slipstream',
    resource_amount: 1,
    gold: 30,
    lore_text: 'You solve the riddle. The mask-maker nods and fades, leaving a blessing of sharpened focus.',
  },
];

const riftStages: NarrativeRiftStage[] = [
  {
    id: 'shattered-guardian',
    name: 'The Shattered Guardian (Entry)',
    costs: [{ resource: 'strikes', amount: 2 }],
    description:
      'You stumble into a hidden glade bathed in unnaturally bright moonlight. The local feline spirits are in distress; the massive stone statue of their First Guardian has been shattered by a trespassing beast, its heavy granite pieces scattered across the grove. You must physically haul the massive stone fragments back to the center of the shrine to rebuild the monument.',
    image_url: `${CAMPAIGN_BASE}/scenes/shattered-guardian.png`,
  },
  {
    id: 'shadow-serpent',
    name: 'The Shadow Serpent (Conflict)',
    costs: [{ resource: 'slipstream', amount: 2 }],
    description:
      'As the final piece of the statue slides into place, the Inkrot seeps into the glade, taking the form of a shadowy, multi-headed serpent. It snaps at the moonlight, attempting to devour the spiritual energy before the statue can activate. You must move with perfect agility, rhythmically dodging its lunges and redirecting the moonlight off reflective surfaces to charge the stone Guardian.',
    image_url: `${CAMPAIGN_BASE}/scenes/shadow-serpent.png`,
  },
  {
    id: 'lunar-purification',
    name: 'Lunar Purification (Resolution)',
    costs: [
      { resource: 'strikes', amount: 1 },
      { resource: 'slipstream', amount: 1 },
      { resource: 'wards', amount: 1 },
    ],
    description:
      'With a deafening chime, the restored statue emits a blinding, purifying flare of lunar energy, instantly incinerating the shadow serpent. The tall grass parts, and dozens of awakened feline spirits emerge, bowing their heads in profound gratitude. They leave a token of their cosmic domain at your feet before vanishing into the shimmering night.',
    image_url: `${CAMPAIGN_BASE}/scenes/lunar-purification.png`,
  },
];

const rifts: NarrativeRift[] = [
  {
    id: 'moon-cats-vigil',
    name: "The Moon-Cat's Vigil",
    description:
      'A 3-stage mini-campaign in a hidden glade. Restore the shattered Guardian, face the Shadow Serpent, and receive the gratitude of the feline spirits.',
    stages: riftStages,
    completion_xp: 2,
    completion_loot: {
      id: 'moon-cat-coin',
      name: 'Moon-Cat Coin',
      kind: 'artifact',
      description: 'A token of the cosmic domain. Permanently buffs Focus.',
      image_url: `${CAMPAIGN_BASE}/loot/moon-cat-coin.png`,
    },
  },
];

export const omijaCampaign: CampaignPackage = {
  realm,
  encounters,
  anomalies,
  rifts,
};

export default omijaCampaign;
