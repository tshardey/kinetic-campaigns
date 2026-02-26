import { describe, it, expect } from 'vitest';
import {
  canAffordEncounter,
  spendForEncounter,
  spendAether,
  spendWards,
  applyActivity,
  canAffordMove,
  spendSlipstream,
  spendStrikes,
} from './resources';
import type { CharacterResources } from '@/types/character';

const baseResources: CharacterResources = {
  slipstream: 5,
  strikes: 3,
  wards: 1,
  aether: 2,
};

describe('canAffordEncounter', () => {
  describe('combat encounters', () => {
    it('returns true when player has enough strikes', () => {
      expect(
        canAffordEncounter(baseResources, { type: 'basic', strikes: 1 })
      ).toBe(true);
      expect(
        canAffordEncounter(baseResources, { type: 'elite', strikes: 3 })
      ).toBe(true);
    });

    it('returns false when player has insufficient strikes', () => {
      expect(
        canAffordEncounter(baseResources, { type: 'elite', strikes: 4 })
      ).toBe(false);
      expect(
        canAffordEncounter({ ...baseResources, strikes: 0 }, { type: 'basic', strikes: 1 })
      ).toBe(false);
    });
  });

  describe('anomaly encounters', () => {
    it('returns true when player has enough aether and secondary resource', () => {
      expect(
        canAffordEncounter(baseResources, {
          type: 'anomaly',
          cost: 2,
          resource: 'strikes',
          resource_amount: 1,
        })
      ).toBe(true);
      expect(
        canAffordEncounter(baseResources, {
          type: 'anomaly',
          cost: 1,
          resource: 'wards',
          resource_amount: 1,
        })
      ).toBe(true);
      expect(
        canAffordEncounter(baseResources, {
          type: 'anomaly',
          cost: 2,
          resource: 'slipstream',
          resource_amount: 1,
        })
      ).toBe(true);
    });

    it('returns false when player has insufficient aether', () => {
      expect(
        canAffordEncounter(
          { ...baseResources, aether: 0 },
          { type: 'anomaly', cost: 2, resource: 'strikes', resource_amount: 1 }
        )
      ).toBe(false);
    });

    it('returns false when player has insufficient secondary resource', () => {
      expect(
        canAffordEncounter(
          { ...baseResources, wards: 0 },
          { type: 'anomaly', cost: 2, resource: 'wards', resource_amount: 1 }
        )
      ).toBe(false);
      expect(
        canAffordEncounter(
          baseResources,
          { type: 'anomaly', cost: 2, resource: 'slipstream', resource_amount: 10 }
        )
      ).toBe(false);
    });
  });
});

describe('spendForEncounter', () => {
  it('spends strikes for combat encounters', () => {
    const result = spendForEncounter(baseResources, { type: 'basic', strikes: 1 });
    expect(result).toEqual({ ...baseResources, strikes: 2 });
    const elite = spendForEncounter(baseResources, { type: 'elite', strikes: 3 });
    expect(elite).toEqual({ ...baseResources, strikes: 0 });
  });

  it('returns null when insufficient strikes', () => {
    expect(
      spendForEncounter(baseResources, { type: 'elite', strikes: 4 })
    ).toBeNull();
  });

  it('spends aether and secondary resource for anomaly (strikes)', () => {
    const result = spendForEncounter(baseResources, {
      type: 'anomaly',
      cost: 2,
      resource: 'strikes',
      resource_amount: 1,
    });
    expect(result).toEqual({ ...baseResources, aether: 0, strikes: 2 });
  });

  it('spends aether and wards for anomaly (wards)', () => {
    const result = spendForEncounter(baseResources, {
      type: 'anomaly',
      cost: 1,
      resource: 'wards',
      resource_amount: 1,
    });
    expect(result).toEqual({ ...baseResources, aether: 1, wards: 0 });
  });

  it('spends aether and slipstream for anomaly (slipstream)', () => {
    const result = spendForEncounter(baseResources, {
      type: 'anomaly',
      cost: 1,
      resource: 'slipstream',
      resource_amount: 1,
    });
    expect(result).toEqual({ ...baseResources, aether: 1, slipstream: 4 });
  });

  it('returns null when insufficient aether for anomaly', () => {
    expect(
      spendForEncounter(baseResources, { type: 'anomaly', cost: 5, resource: 'strikes', resource_amount: 1 })
    ).toBeNull();
  });

  it('returns null when insufficient secondary resource for anomaly', () => {
    expect(
      spendForEncounter(
        { ...baseResources, wards: 0 },
        { type: 'anomaly', cost: 2, resource: 'wards', resource_amount: 1 }
      )
    ).toBeNull();
  });
});

describe('applyActivity', () => {
  it('increments slipstream for cardio', () => {
    expect(applyActivity(baseResources, 'cardio').slipstream).toBe(
      baseResources.slipstream + 1
    );
  });
  it('increments aether for wellness', () => {
    expect(applyActivity(baseResources, 'wellness').aether).toBe(
      baseResources.aether + 1
    );
  });
});

describe('canAffordMove / spendSlipstream', () => {
  it('canAffordMove returns true when slipstream >= 1', () => {
    expect(canAffordMove(baseResources)).toBe(true);
    expect(canAffordMove({ ...baseResources, slipstream: 0 })).toBe(false);
  });
  it('spendSlipstream deducts 1 and returns new resources', () => {
    const next = spendSlipstream(baseResources);
    expect(next).toEqual({ ...baseResources, slipstream: 4 });
    expect(spendSlipstream({ ...baseResources, slipstream: 0 })).toBeNull();
  });
});

describe('spendStrikes / spendAether / spendWards', () => {
  it('spendStrikes deducts amount', () => {
    expect(spendStrikes(baseResources, 2)).toEqual({
      ...baseResources,
      strikes: 1,
    });
    expect(spendStrikes(baseResources, 4)).toBeNull();
  });
  it('spendAether deducts amount', () => {
    expect(spendAether(baseResources, 2)).toEqual({
      ...baseResources,
      aether: 0,
    });
    expect(spendAether(baseResources, 3)).toBeNull();
  });
  it('spendWards deducts amount', () => {
    expect(spendWards(baseResources, 1)).toEqual({
      ...baseResources,
      wards: 0,
    });
    expect(spendWards(baseResources, 2)).toBeNull();
  });
});
