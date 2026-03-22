/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCampaign } from './useCampaign';

describe('useCampaign', () => {
  it('returns campaign with realm, grid, placedEncounters, and dimensions', async () => {
    const { result } = renderHook(() => useCampaign());
    await waitFor(() => {
      expect(result.current.isCampaignReady).toBe(true);
    });
    if (!result.current.isCampaignReady) throw new Error('expected ready');
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

  it('startHexId is a valid hex id in the grid', async () => {
    const { result } = renderHook(() => useCampaign());
    await waitFor(() => expect(result.current.isCampaignReady).toBe(true));
    if (!result.current.isCampaignReady) throw new Error('expected ready');
    const { grid, startHexId } = result.current;
    const ids = new Set(grid.map((h) => h.id));
    expect(ids.has(startHexId)).toBe(true);
  });

  it('returns stable placement across multiple calls', async () => {
    const { result: result1 } = renderHook(() => useCampaign());
    const { result: result2 } = renderHook(() => useCampaign());

    await waitFor(() => expect(result1.current.isCampaignReady).toBe(true));
    await waitFor(() => expect(result2.current.isCampaignReady).toBe(true));
    if (!result1.current.isCampaignReady || !result2.current.isCampaignReady) throw new Error('expected ready');

    const keys1 = Object.keys(result1.current.placedEncounters).sort();
    const keys2 = Object.keys(result2.current.placedEncounters).sort();
    expect(keys1).toEqual(keys2);

    const a = result1.current;
    const b = result2.current;
    expect(a.isCampaignReady && b.isCampaignReady).toBe(true);
    if (!a.isCampaignReady || !b.isCampaignReady) throw new Error('expected ready');
    keys1.forEach((id) => {
      expect(a.placedEncounters[id].name).toBe(b.placedEncounters[id].name);
    });
  });

  it('places at least one boss and multiple basics', async () => {
    const { result } = renderHook(() => useCampaign());
    await waitFor(() => expect(result.current.isCampaignReady).toBe(true));
    if (!result.current.isCampaignReady) throw new Error('expected ready');
    const encounters = Object.values(result.current.placedEncounters);
    const bosses = encounters.filter((e) => e.type === 'boss');
    const basics = encounters.filter((e) => e.type === 'basic');
    expect(bosses.length).toBeGreaterThanOrEqual(1);
    expect(basics.length).toBeGreaterThan(0);
  });
});
