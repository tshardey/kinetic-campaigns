import { describe, it, expect, vi } from 'vitest';
import {
  canAffordEncounter,
  spendForEncounter,
  spendAether,
  spendWards,
  applyActivity,
  calculateBoost,
  activityPointsFromMinutes,
  ACTIVITY_MINUTES_PER_POINT,
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

describe('activityPointsFromMinutes / ACTIVITY_MINUTES_PER_POINT', () => {
  it('uses 20 minutes per point for all activities', () => {
    expect(ACTIVITY_MINUTES_PER_POINT).toBe(20);
  });
  it('rounds down to nearest half or whole', () => {
    expect(activityPointsFromMinutes(5)).toBe(0);
    expect(activityPointsFromMinutes(10)).toBe(0.5);
    expect(activityPointsFromMinutes(15)).toBe(0.5);
    expect(activityPointsFromMinutes(20)).toBe(1);
    expect(activityPointsFromMinutes(30)).toBe(1.5);
    expect(activityPointsFromMinutes(40)).toBe(2);
    expect(activityPointsFromMinutes(39)).toBe(1.5);
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
  it('grants points by duration (20 min = 1, round down to nearest half)', () => {
    // 40 min cardio = 2 slipstream
    expect(applyActivity(baseResources, 'cardio', 40).slipstream).toBe(
      baseResources.slipstream + 2
    );
    // 30 min strength = 1.5 strikes (was 2 under old 15 min/unit)
    expect(applyActivity(baseResources, 'strength', 30).strikes).toBe(
      baseResources.strikes + 1.5
    );
    // 30 min cardio = 1.5 slipstream (was 1 under old 20 min/unit)
    expect(applyActivity(baseResources, 'cardio', 30).slipstream).toBe(
      baseResources.slipstream + 1.5
    );
    // 20 min yoga = 1 ward
    expect(applyActivity(baseResources, 'yoga', 20).wards).toBe(
      baseResources.wards + 1
    );
  });
  it('grants 0 points when duration under 10 min', () => {
    expect(applyActivity(baseResources, 'cardio', 5).slipstream).toBe(
      baseResources.slipstream
    );
    expect(applyActivity(baseResources, 'strength', 5).strikes).toBe(
      baseResources.strikes
    );
  });
  it('grants half point for 10–19 min', () => {
    expect(applyActivity(baseResources, 'cardio', 10).slipstream).toBe(
      baseResources.slipstream + 0.5
    );
    expect(applyActivity(baseResources, 'strength', 15).strikes).toBe(
      baseResources.strikes + 0.5
    );
  });
  it('rounds down to half so 39 min = 1.5 points', () => {
    expect(applyActivity(baseResources, 'cardio', 39).slipstream).toBe(
      baseResources.slipstream + 1.5
    );
  });
  it('adds boost from stats when options provided (one roll per full point)', () => {
    const stats: CharacterStats = { brawn: 2, flow: 0, haste: 1, focus: -1 };
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // 2 * 0.1 = 0.2 > 0.05 => +1 boost
    const next = applyActivity(baseResources, 'strength', 20, { stats }); // 1 full point => 1 boost roll
    expect(next.strikes).toBe(baseResources.strikes + 1 + 1); // 1 point + 1 boost
    vi.restoreAllMocks();
  });
  it('momentum-strike intercept grants +1 Strike on strength', () => {
    const stats: CharacterStats = { brawn: 0, flow: 0, haste: 0, focus: 0 };
    const next = applyActivity(baseResources, 'strength', 20, { stats, startingMoveId: 'momentum-strike' });
    expect(next.strikes).toBe(baseResources.strikes + 1 + 1); // 1 point + intercept
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
