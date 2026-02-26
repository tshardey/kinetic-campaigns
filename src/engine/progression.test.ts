import { describe, it, expect } from 'vitest';
import {
  getXpCap,
  addXp,
  addCurrency,
  applyEncounterReward,
  applyEncounterRewardWithLevelUpFlow,
  spendCurrency,
} from './progression';
import type { Progression } from '@/types/character';

const base: Progression = { xp: 0, level: 1, currency: 100 };

describe('getXpCap', () => {
  it('returns 10 for level 1', () => {
    expect(getXpCap(1)).toBe(10);
  });
  it('returns 20 for level 2', () => {
    expect(getXpCap(2)).toBe(20);
  });
  it('doubles each level', () => {
    expect(getXpCap(3)).toBe(40);
    expect(getXpCap(4)).toBe(80);
  });
});

describe('addXp', () => {
  it('adds xp without leveling when under cap', () => {
    expect(addXp(base, 3)).toEqual({ ...base, xp: 3, level: 1 });
  });
  it('levels up and carries over excess xp when at cap', () => {
    const atCap = { ...base, xp: 9 };
    const result = addXp(atCap, 5);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(4); // 9 + 5 = 14, cap 10, remainder 4
  });
  it('levels once per call and carries over excess xp', () => {
    const result = addXp(base, 35); // cap 10 -> level 2, xp = 25 (single level per call)
    expect(result.level).toBe(2);
    expect(result.xp).toBe(25);
  });
});

describe('addCurrency', () => {
  it('adds amount to currency', () => {
    expect(addCurrency(base, 50)).toEqual({ ...base, currency: 150 });
  });
});

describe('applyEncounterReward', () => {
  it('adds gold and xp without leveling', () => {
    const result = applyEncounterReward(base, 30, 2);
    expect(result.currency).toBe(130);
    expect(result.xp).toBe(2);
    expect(result.level).toBe(1);
  });
  it('adds gold and xp and levels when at cap', () => {
    const atCap = { ...base, xp: 8 };
    const result = applyEncounterReward(atCap, 10, 5);
    expect(result.currency).toBe(110);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(3);
  });
});

describe('applyEncounterRewardWithLevelUpFlow', () => {
  it('returns normal progression and leveledUp false when xp does not reach cap', () => {
    const result = applyEncounterRewardWithLevelUpFlow(base, 20, 3);
    expect(result.leveledUp).toBe(false);
    expect(result.nextProgressionAfterLevelUp).toBeNull();
    expect(result.progression).toEqual({ ...base, currency: 120, xp: 3, level: 1 });
  });

  it('returns progression at cap and nextProgressionAfterLevelUp when reward would level', () => {
    const atCap = { ...base, xp: 8, currency: 100 };
    const result = applyEncounterRewardWithLevelUpFlow(atCap, 0, 5);
    expect(result.leveledUp).toBe(true);
    expect(result.progression).toEqual({ ...atCap, xp: 10 }); // held at cap
    expect(result.nextProgressionAfterLevelUp).not.toBeNull();
    expect(result.nextProgressionAfterLevelUp!.level).toBe(2);
    expect(result.nextProgressionAfterLevelUp!.xp).toBe(3); // 8+5=13, cap 10, remainder 3
  });

  it('includes gold in both progression and nextProgressionAfterLevelUp when leveling', () => {
    const atCap = { ...base, xp: 9, currency: 80 };
    const result = applyEncounterRewardWithLevelUpFlow(atCap, 20, 2);
    expect(result.leveledUp).toBe(true);
    expect(result.progression.currency).toBe(100);
    expect(result.progression.xp).toBe(10);
    expect(result.nextProgressionAfterLevelUp!.currency).toBe(100);
    expect(result.nextProgressionAfterLevelUp!.level).toBe(2);
    expect(result.nextProgressionAfterLevelUp!.xp).toBe(1);
  });
});

describe('spendCurrency', () => {
  it('returns new progression when affordable', () => {
    expect(spendCurrency(base, 30)).toEqual({ ...base, currency: 70 });
  });
  it('returns null when insufficient', () => {
    expect(spendCurrency(base, 150)).toBeNull();
  });
});
