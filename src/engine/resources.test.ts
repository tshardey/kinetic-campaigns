import { describe, it, expect, vi } from 'vitest';
import {
  canAffordEncounter,
  spendForEncounter,
  spendAether,
  spendWards,
  applyActivity,
  calculateBoost,
  ACTIVITY_MINUTES_PER_UNIT,
  canAffordMove,
  spendSlipstream,
  spendStrikes,
} from './resources';
import type { CharacterResources, CharacterStats } from '@/types/character';

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

describe('ACTIVITY_MINUTES_PER_UNIT', () => {
  it('defines thresholds for each activity type', () => {
    expect(ACTIVITY_MINUTES_PER_UNIT.cardio).toBe(20);
    expect(ACTIVITY_MINUTES_PER_UNIT.strength).toBe(15);
    expect(ACTIVITY_MINUTES_PER_UNIT.yoga).toBe(20);
    expect(ACTIVITY_MINUTES_PER_UNIT.wellness).toBe(15);
  });
});

describe('applyActivity', () => {
  it('increments slipstream for cardio (no duration = 1 unit)', () => {
    expect(applyActivity(baseResources, 'cardio').slipstream).toBe(
      baseResources.slipstream + 1
    );
  });
  it('increments aether for wellness (no duration = 1 unit)', () => {
    expect(applyActivity(baseResources, 'wellness').aether).toBe(
      baseResources.aether + 1
    );
  });
  it('grants units by duration when durationMinutes provided', () => {
    // 40 min cardio = 2 slipstream
    expect(applyActivity(baseResources, 'cardio', 40).slipstream).toBe(
      baseResources.slipstream + 2
    );
    // 30 min strength = 2 strikes (15 min per unit)
    expect(applyActivity(baseResources, 'strength', 30).strikes).toBe(
      baseResources.strikes + 2
    );
    // 20 min yoga = 1 ward
    expect(applyActivity(baseResources, 'yoga', 20).wards).toBe(
      baseResources.wards + 1
    );
  });
  it('grants 0 units when duration below threshold', () => {
    expect(applyActivity(baseResources, 'cardio', 10).slipstream).toBe(
      baseResources.slipstream
    );
    expect(applyActivity(baseResources, 'strength', 5).strikes).toBe(
      baseResources.strikes
    );
  });
  it('uses floor so partial threshold does not grant extra unit', () => {
    expect(applyActivity(baseResources, 'cardio', 39).slipstream).toBe(
      baseResources.slipstream + 1
    );
  });
  it('adds boost from stats when options provided', () => {
    const stats: CharacterStats = { brawn: 2, flow: 0, haste: 1, focus: -1 };
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // 2 * 0.1 = 0.2 > 0.05 => +1 boost
    const next = applyActivity(baseResources, 'strength', 15, { stats });
    expect(next.strikes).toBe(baseResources.strikes + 1 + 1); // 1 unit + 1 boost
    vi.restoreAllMocks();
  });
  it('momentum-strike intercept grants +1 Strike on strength', () => {
    const stats: CharacterStats = { brawn: 0, flow: 0, haste: 0, focus: 0 };
    const next = applyActivity(baseResources, 'strength', 15, { stats, startingMoveId: 'momentum-strike' });
    expect(next.strikes).toBe(baseResources.strikes + 1 + 1); // 1 unit + intercept
  });
  it('aether-cascade intercept grants +1 Aether on yoga when roll < 0.5', () => {
    const stats: CharacterStats = { brawn: 0, flow: 0, haste: 0, focus: 0 };
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const next = applyActivity(baseResources, 'yoga', 20, { stats, startingMoveId: 'aether-cascade' });
    expect(next.wards).toBe(baseResources.wards + 1);
    expect(next.aether).toBe(baseResources.aether + 1);
    vi.restoreAllMocks();
  });
});

describe('calculateBoost', () => {
  it('returns 1 when (statValue * 0.10) > Math.random()', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    expect(calculateBoost(2)).toBe(1);
    vi.restoreAllMocks();
  });
  it('returns 0 when (statValue * 0.10) <= Math.random()', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(calculateBoost(2)).toBe(0);
    vi.restoreAllMocks();
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
