/**
 * Seeded encounter placement for rectangular hex maps.
 * Places encounters by column bands (boss right, elites mid, basics/anomalies scattered).
 */

import type { HexCell } from '@/types/hex';
import type { CampaignPackage, MapEncounter, Encounter, DimensionalAnomaly } from '@/types/campaign';
import { axialToOffset } from './hex-math';

/** Seeded RNG: returns next float in [0, 1). */
function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fff_ffff;
    return s / 0x7fff_ffff;
  };
}

/** Fisher–Yates shuffle in place using seeded RNG. */
function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Pick n distinct random items from arr; arr may be modified (shuffled). */
function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  shuffle(arr, rng);
  return arr.slice(0, Math.min(n, arr.length));
}

export interface PlacementConfig {
  /** Hex cells from generateRectGrid(cols, rows). */
  grid: HexCell[];
  /** Number of columns in the grid. */
  cols: number;
  /** Number of rows in the grid. */
  rows: number;
  /** Seed for reproducible placement. */
  seed: number;
  /** Optional hex id where the player starts (no encounter placed here). */
  startHexId?: string;
  /** Number of basic encounters to place (default from campaign). */
  numBasics?: number;
  /** Number of anomalies to place (default 3). */
  numAnomalies?: number;
}

/**
 * Place encounters from a campaign onto a rectangular hex grid.
 * Boss at far right, elites at mid columns, basics and anomalies scattered.
 * Returns a stable layout for the given seed.
 */
export function placeEncounters(
  config: PlacementConfig,
  campaign: CampaignPackage
): Record<string, MapEncounter> {
  const { grid, cols, seed, startHexId, numBasics = 18, numAnomalies = 3 } = config;
  const rng = createSeededRng(seed);
  const result: Record<string, MapEncounter> = {};

  const startSet = startHexId ? new Set([startHexId]) : new Set<string>();

  type HexWithCol = { hex: HexCell; col: number };
  const withCol: HexWithCol[] = grid.map((hex) => ({
    hex,
    col: axialToOffset(hex.q, hex.r).col,
  }));

  const byColumn = (minCol: number, maxCol: number): HexCell[] =>
    withCol
      .filter(({ hex, col }) => col >= minCol && col <= maxCol && !startSet.has(hex.id))
      .map(({ hex }) => hex);

  const basics = campaign.encounters.filter((e) => e.type === 'basic');
  const elites = campaign.encounters.filter((e) => e.type === 'elite');
  const bosses = campaign.encounters.filter((e) => e.type === 'boss');
  const anomalies = campaign.anomalies ?? [];

  if (bosses.length > 0) {
    const rightHexes = byColumn(cols - 2, cols - 1);
    const [bossHex] = pickN([...rightHexes], 1, rng);
    if (bossHex) {
      const boss = bosses[Math.floor(rng() * bosses.length)];
      result[bossHex.id] = toMapEncounter(boss);
      startSet.add(bossHex.id);
    }
  }

  if (elites.length >= 3) {
    const midLeft = Math.max(0, Math.floor(cols / 2) - 2);
    const midRight = Math.min(cols - 1, Math.floor(cols / 2) + 2);
    const midHexes = byColumn(midLeft, midRight);
    const eliteHexes = pickN([...midHexes], 3, rng);
    const elitePool = [...elites];
    shuffle(elitePool, rng);
    eliteHexes.forEach((hex, i) => {
      if (elitePool[i]) result[hex.id] = toMapEncounter(elitePool[i]);
      startSet.add(hex.id);
    });
  }

  const restHexes = withCol
    .filter(({ hex }) => !startSet.has(hex.id))
    .map(({ hex }) => hex);

  const basicPool = basics.length > 0 ? [...basics] : [];
  const basicHexes = pickN([...restHexes], Math.min(numBasics, restHexes.length), rng);
  const basicChoices = basicPool.length ? Array.from({ length: basicHexes.length }, () => basicPool[Math.floor(rng() * basicPool.length)]) : [];
  basicHexes.forEach((hex, i) => {
    if (basicChoices[i]) result[hex.id] = toMapEncounter(basicChoices[i]);
  });
  basicHexes.forEach((h) => startSet.add(h.id));

  const anomalyPool = anomalies.slice(0, numAnomalies);
  const remainingHexes = withCol.filter(({ hex }) => !startSet.has(hex.id)).map(({ hex }) => hex);
  const anomalyHexes = pickN([...remainingHexes], Math.min(numAnomalies, anomalyPool.length, remainingHexes.length), rng);
  const anomalyChoices = pickN([...anomalyPool], anomalyHexes.length, rng);
  anomalyHexes.forEach((hex, i) => {
    if (anomalyChoices[i]) result[hex.id] = toMapAnomaly(anomalyChoices[i]);
  });

  return result;
}

function toMapEncounter(e: Encounter): MapEncounter {
  return {
    id: e.id,
    type: e.type,
    name: e.name,
    strikes: e.strikes,
    gold: e.gold,
  };
}

function toMapAnomaly(a: DimensionalAnomaly): MapEncounter {
  return {
    id: a.id,
    type: 'anomaly',
    name: a.name,
    stat: a.stat,
    cost: a.cost,
    gold: a.gold,
  };
}

/**
 * Suggested start hex for a rectangular grid (left-center): column 1, center row.
 */
export function getDefaultStartHexId(_cols: number, rows: number): string {
  const centerRow = Math.floor(rows / 2);
  const col = 1;
  const r = centerRow;
  const q = col - (r - (r & 1)) / 2;
  return `${q},${r}`;
}
