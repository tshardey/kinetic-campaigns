/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCampaign } from './useCampaign';

describe('useCampaign', () => {
  it('returns campaign with realm, grid, placedEncounters, and dimensions', () => {
    const { result } = renderHook(() => useCampaign());
    const state = result.current;

    expect(state.campaign).toBeDefined();
    expect(state.campaign.realm).toBeDefined();
    expect(state.campaign.realm.name).toBe('The Verdant Expanse of Omija');
    expect(state.campaign.realm.grid_cols).toBe(14);
    expect(state.campaign.realm.grid_rows).toBe(9);

    expect(state.cols).toBe(14);
    expect(state.rows).toBe(9);
    expect(state.grid).toHaveLength(state.cols * state.rows);
    expect(state.startHexId).toBeDefined();
    expect(state.placementSeed).toBe(42);
    expect(typeof state.placedEncounters).toBe('object');
  });

  it('startHexId is a valid hex id in the grid', () => {
    const { result } = renderHook(() => useCampaign());
    const { grid, startHexId } = result.current;
    const ids = new Set(grid.map((h) => h.id));
    expect(ids.has(startHexId)).toBe(true);
  });

  it('returns stable placement across multiple calls', () => {
    const { result: result1 } = renderHook(() => useCampaign());
    const { result: result2 } = renderHook(() => useCampaign());

    const keys1 = Object.keys(result1.current.placedEncounters).sort();
    const keys2 = Object.keys(result2.current.placedEncounters).sort();
    expect(keys1).toEqual(keys2);

    keys1.forEach((id) => {
      expect(result1.current.placedEncounters[id].name).toBe(
        result2.current.placedEncounters[id].name
      );
    });
  });

  it('places at least one boss and multiple basics', () => {
    const { result } = renderHook(() => useCampaign());
    const encounters = Object.values(result.current.placedEncounters);
    const bosses = encounters.filter((e) => e.type === 'boss');
    const basics = encounters.filter((e) => e.type === 'basic');
    expect(bosses.length).toBeGreaterThanOrEqual(1);
    expect(basics.length).toBeGreaterThan(0);
  });
});
