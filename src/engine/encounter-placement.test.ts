import { describe, it, expect } from 'vitest';
import { generateRectGrid } from './hex-math';
import { placeEncounters, getDefaultStartHexId } from './encounter-placement';
import type { CampaignPackage } from '@/types/campaign';

const minimalCampaign: CampaignPackage = {
  realm: {
    id: 'test',
    name: 'Test',
    theme_description: '',
    grid_radius: 3,
    hero_image_url: '',
    map_background_url: '',
    loot_frame_url: '',
  },
  encounters: [
    { id: 'b1', type: 'basic', name: 'Basic 1', strikes: 1, gold: 10 },
    { id: 'b2', type: 'basic', name: 'Basic 2', strikes: 1, gold: 10 },
    { id: 'e1', type: 'elite', name: 'Elite 1', strikes: 3, gold: 50 },
    { id: 'e2', type: 'elite', name: 'Elite 2', strikes: 3, gold: 50 },
    { id: 'e3', type: 'elite', name: 'Elite 3', strikes: 3, gold: 50 },
    { id: 'boss1', type: 'boss', name: 'Boss', strikes: 5, gold: 200 },
  ],
  anomalies: [
    { id: 'a1', name: 'Anomaly 1', cost: 2, resource: 'strikes', resource_amount: 1, gold: 30 },
    { id: 'a2', name: 'Anomaly 2', cost: 2, resource: 'wards', resource_amount: 1, gold: 30 },
    { id: 'a3', name: 'Anomaly 3', cost: 2, resource: 'slipstream', resource_amount: 1, gold: 30 },
  ],
  rifts: [],
};

describe('getDefaultStartHexId', () => {
  it('returns hex id for column 1, center row', () => {
    // 14 cols, 9 rows: center row 4, col 1 -> q = 1 - (4-0)/2 = -1, r = 4
    expect(getDefaultStartHexId(14, 9)).toBe('-1,4');
    // 13 cols, 7 rows: center row 3, col 1 -> q = 1 - (3-1)/2 = 0, r = 3
    expect(getDefaultStartHexId(13, 7)).toBe('0,3');
  });

  it('format is q,r', () => {
    const id = getDefaultStartHexId(10, 6);
    expect(id).toMatch(/^-?\d+,-?\d+$/);
  });
});

describe('placeEncounters', () => {
  const cols = 14;
  const rows = 9;
  const grid = generateRectGrid(cols, rows);
  const startHexId = getDefaultStartHexId(cols, rows);

  it('returns same layout for same seed', () => {
    const a = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    const b = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
    for (const id of Object.keys(a)) {
      expect(a[id].name).toBe(b[id].name);
      expect(a[id].type).toBe(b[id].type);
    }
  });

  it('different seed can produce different layout', () => {
    const a = placeEncounters(
      { grid, cols, rows, seed: 1, startHexId },
      minimalCampaign
    );
    const b = placeEncounters(
      { grid, cols, rows, seed: 999, startHexId },
      minimalCampaign
    );
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    // At least some hex ids or encounter assignments may differ
    const sameKeys = keysA.length === keysB.length && keysA.every((k, i) => k === keysB[i]);
    const commonIds = keysA.filter((k) => k in b);
    const sameNames = commonIds.length > 0 && commonIds.every((id) => a[id].name === b[id].name);
    expect(sameKeys && sameNames).toBe(false);
  });

  it('does not place encounter on start hex', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    expect(result[startHexId]).toBeUndefined();
  });

  it('places exactly one boss', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    const bosses = Object.values(result).filter((e) => e.type === 'boss');
    expect(bosses).toHaveLength(1);
  });

  it('places 3 elites when campaign has 3+ elites', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    const elites = Object.values(result).filter((e) => e.type === 'elite');
    expect(elites).toHaveLength(3);
  });

  it('places anomalies when campaign has them', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId, numAnomalies: 3 },
      minimalCampaign
    );
    const anomalies = Object.values(result).filter((e) => e.type === 'anomaly');
    expect(anomalies.length).toBeLessThanOrEqual(3);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
  });

  it('respects numBasics limit', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId, numBasics: 5 },
      minimalCampaign
    );
    const basics = Object.values(result).filter((e) => e.type === 'basic');
    expect(basics.length).toBeLessThanOrEqual(5);
  });

  it('map encounter has required fields for combat', () => {
    const result = placeEncounters(
      { grid, cols, rows, seed: 42, startHexId },
      minimalCampaign
    );
    for (const [, enc] of Object.entries(result)) {
      expect(enc.name).toBeDefined();
      if (enc.type === 'anomaly') {
        expect('cost' in enc && 'resource' in enc && 'resource_amount' in enc).toBe(true);
      } else {
        expect('strikes' in enc && 'gold' in enc).toBe(true);
      }
    }
  });
});
