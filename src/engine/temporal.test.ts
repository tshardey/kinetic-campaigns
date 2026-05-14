import { describe, it, expect } from 'vitest';
import {
  evaluateTemporal,
  streakMilestoneReached,
  STREAK_MILESTONES,
  applyAttrition,
  getStreakMilestoneCurrency,
  STREAK_MILESTONE_CURRENCY_PER_DAY,
} from './temporal';

const TZ = 'America/Los_Angeles';

describe('evaluateTemporal', () => {
  it('first activity: no prior timestamp returns nextStreak=1, isFirstActivity=true', () => {
    const result = evaluateTemporal({
      now: new Date('2026-05-11T15:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 0,
    });
    expect(result).toEqual({
      missedCalendarDays: 0,
      nextStreak: 1,
      streakReset: false,
      isFirstActivity: true,
    });
  });

  it('first activity: invalid ISO falls through as first activity', () => {
    const result = evaluateTemporal({
      lastActiveISO: 'not-a-date',
      now: new Date('2026-05-11T15:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 0,
    });
    expect(result.isFirstActivity).toBe(true);
    expect(result.nextStreak).toBe(1);
  });

  it('same calendar day: nextStreak unchanged, no missed days', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-11T08:00:00-07:00',
      now: new Date('2026-05-11T20:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 3,
    });
    expect(result).toEqual({
      missedCalendarDays: 0,
      nextStreak: 3,
      streakReset: false,
      isFirstActivity: false,
    });
  });

  it('consecutive days (yesterday → today): nextStreak increments by 1', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-10T22:00:00-07:00',
      now: new Date('2026-05-11T08:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 4,
    });
    expect(result).toEqual({
      missedCalendarDays: 0,
      nextStreak: 5,
      streakReset: false,
      isFirstActivity: false,
    });
  });

  it('gap of 2 calendar days: 1 missed day, streak resets to 1', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-09T12:00:00-07:00',
      now: new Date('2026-05-11T08:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 4,
    });
    expect(result).toEqual({
      missedCalendarDays: 1,
      nextStreak: 1,
      streakReset: true,
      isFirstActivity: false,
    });
  });

  it('gap of 5 calendar days: 4 missed days, streak resets to 1', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-06T12:00:00-07:00',
      now: new Date('2026-05-11T08:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 12,
    });
    expect(result.missedCalendarDays).toBe(4);
    expect(result.nextStreak).toBe(1);
    expect(result.streakReset).toBe(true);
  });

  it('handles spring-forward DST: PST 23:30 Mar 7 → PDT 09:00 Mar 8 is consecutive', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-03-07T23:30:00-08:00',
      now: new Date('2026-03-08T09:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 2,
    });
    expect(result.missedCalendarDays).toBe(0);
    expect(result.nextStreak).toBe(3);
  });

  it('handles fall-back DST: PDT 23:30 Nov 1 → PST 02:00 Nov 2 is consecutive', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-11-01T23:30:00-07:00',
      now: new Date('2026-11-02T02:00:00-08:00'),
      timeZone: TZ,
      currentStreak: 6,
    });
    expect(result.missedCalendarDays).toBe(0);
    expect(result.nextStreak).toBe(7);
  });

  it('TZ change: same UTC moment buckets into different local days based on player TZ', () => {
    // Last log was 2026-05-10 at 23:00 UTC.
    // In Los_Angeles (UTC-7) that bucketed as 2026-05-10 (16:00 PDT).
    // Now is 2026-05-11 at 02:00 UTC, which in Tokyo (UTC+9) is 2026-05-11 11:00 — same Tokyo day.
    // But viewed from LA (UTC-7), now is 2026-05-10 19:00 — same LA day as last log.
    const lastUtc = '2026-05-10T23:00:00Z';
    const nowUtc = new Date('2026-05-11T02:00:00Z');

    const inLA = evaluateTemporal({ lastActiveISO: lastUtc, now: nowUtc, timeZone: TZ, currentStreak: 1 });
    expect(inLA.missedCalendarDays).toBe(0);
    expect(inLA.nextStreak).toBe(1);

    const inTokyo = evaluateTemporal({
      lastActiveISO: lastUtc,
      now: nowUtc,
      timeZone: 'Asia/Tokyo',
      currentStreak: 1,
    });
    // Last in Tokyo: 2026-05-11 08:00, now in Tokyo: 2026-05-11 11:00 — same day
    expect(inTokyo.missedCalendarDays).toBe(0);
  });

  it('currentStreak=0 + consecutive day: nextStreak becomes 1', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-10T08:00:00-07:00',
      now: new Date('2026-05-11T08:00:00-07:00'),
      timeZone: TZ,
      currentStreak: 0,
    });
    expect(result.nextStreak).toBe(1);
  });

  it('clamps negative currentStreak to 0 floor', () => {
    const result = evaluateTemporal({
      lastActiveISO: '2026-05-11T08:00:00-07:00',
      now: new Date('2026-05-11T20:00:00-07:00'),
      timeZone: TZ,
      currentStreak: -5,
    });
    expect(result.nextStreak).toBe(0);
  });
});

describe('streakMilestoneReached', () => {
  it('returns the milestone when crossed by an increment', () => {
    expect(streakMilestoneReached(2, 3)).toBe(3);
    expect(streakMilestoneReached(6, 7)).toBe(7);
    expect(streakMilestoneReached(13, 14)).toBe(14);
  });

  it('returns undefined when no milestone is crossed', () => {
    expect(streakMilestoneReached(3, 4)).toBeUndefined();
    expect(streakMilestoneReached(0, 1)).toBeUndefined();
  });

  it('returns undefined on streak reset / non-advancing transitions', () => {
    expect(streakMilestoneReached(7, 1)).toBeUndefined();
    expect(streakMilestoneReached(5, 5)).toBeUndefined();
  });

  it('returns the first crossed milestone when jumping past several', () => {
    expect(streakMilestoneReached(0, 8)).toBe(3);
    expect(streakMilestoneReached(2, 10)).toBe(3);
  });

  it('exposes the documented milestone ladder', () => {
    expect(STREAK_MILESTONES).toEqual([3, 7, 14, 30, 60, 100]);
  });
});

describe('getStreakMilestoneCurrency', () => {
  it('scales linearly with the milestone', () => {
    expect(getStreakMilestoneCurrency(3)).toBe(3 * STREAK_MILESTONE_CURRENCY_PER_DAY);
    expect(getStreakMilestoneCurrency(7)).toBe(7 * STREAK_MILESTONE_CURRENCY_PER_DAY);
    expect(getStreakMilestoneCurrency(30)).toBe(30 * STREAK_MILESTONE_CURRENCY_PER_DAY);
  });
});

describe('applyAttrition', () => {
  const baseInput = {
    missedCalendarDays: 0,
    wards: 5,
    aether: 5,
    hp: 5,
    maxHp: 5,
    hexHasUnclearedEncounter: true,
    hasDefyReality: false,
    inventoryCount: 0,
  };

  it('no-op when missedCalendarDays is 0', () => {
    const r = applyAttrition({ ...baseInput, missedCalendarDays: 0 });
    expect(r.wardsSpent).toBe(0);
    expect(r.aetherSpent).toBe(0);
    expect(r.hpLost).toBe(0);
    expect(r.knockbackTriggered).toBe(false);
    expect(r.bumpFromHex).toBe(false);
    expect(r.message).toBeUndefined();
  });

  it('no-op when hex has no uncleared encounter', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 3,
      hexHasUnclearedEncounter: false,
    });
    expect(r.wardsSpent).toBe(0);
    expect(r.aetherSpent).toBe(0);
    expect(r.hpLost).toBe(0);
    expect(r.bumpFromHex).toBe(false);
    expect(r.message).toBeUndefined();
  });

  it('1 missed day with sufficient Wards: spends 1 Ward, bumps to adjacent', () => {
    const r = applyAttrition({ ...baseInput, missedCalendarDays: 1, wards: 3 });
    expect(r.wardsSpent).toBe(1);
    expect(r.aetherSpent).toBe(0);
    expect(r.newWards).toBe(2);
    expect(r.bumpFromHex).toBe(true);
    expect(r.knockbackTriggered).toBe(false);
    expect(r.message).toMatch(/1 Ward/);
  });

  it('multi-day with sufficient Wards: drains required Wards, bumps once', () => {
    const r = applyAttrition({ ...baseInput, missedCalendarDays: 3, wards: 5 });
    expect(r.wardsSpent).toBe(3);
    expect(r.newWards).toBe(2);
    expect(r.bumpFromHex).toBe(true);
    expect(r.knockbackTriggered).toBe(false);
    expect(r.message).toMatch(/3 Wards/);
  });

  it('spills into Aether when Wards exhausted (Aether Shield universalized)', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 4,
      wards: 1,
      aether: 5,
    });
    expect(r.wardsSpent).toBe(1);
    expect(r.aetherSpent).toBe(3);
    expect(r.newWards).toBe(0);
    expect(r.newAether).toBe(2);
    expect(r.hpLost).toBe(0);
    expect(r.bumpFromHex).toBe(true);
    expect(r.knockbackTriggered).toBe(false);
    expect(r.message).toMatch(/1 Ward.*3 Aether/);
  });

  it('spills into HP after Wards and Aether are spent', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 4,
      wards: 1,
      aether: 1,
      hp: 5,
      maxHp: 5,
    });
    expect(r.wardsSpent).toBe(1);
    expect(r.aetherSpent).toBe(1);
    expect(r.hpLost).toBe(2);
    expect(r.newHp).toBe(3);
    expect(r.bumpFromHex).toBe(true);
    expect(r.knockbackTriggered).toBe(false);
  });

  it('zero resources: HP damage only, knockback at 0 HP', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 6,
      wards: 0,
      aether: 0,
      hp: 5,
      maxHp: 5,
    });
    expect(r.wardsSpent).toBe(0);
    expect(r.aetherSpent).toBe(0);
    // 4 days of -1 HP brings hp 5→1; 5th day at hp=1 triggers knockback (counted as hpLost += hp).
    expect(r.hpLost).toBe(5);
    expect(r.newHp).toBe(5);
    expect(r.knockbackTriggered).toBe(true);
    expect(r.bumpFromHex).toBe(false);
    expect(r.message).toMatch(/retreated to safety/);
  });

  it('Defy Reality dodges the lethal hit and consumes 1 inventory item', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 5,
      wards: 0,
      aether: 0,
      hp: 2,
      maxHp: 5,
      hasDefyReality: true,
      inventoryCount: 1,
    });
    // hp 2→1; then at hp=1 Defy Reality fires, sacrificing 1 item and restoring hp to maxHp.
    // After Defy: hp=5; remaining 3 days drain hp 5→2.
    expect(r.hpLost).toBe(1 + 3);
    expect(r.defyRealityItemsSpent).toBe(1);
    expect(r.newHp).toBe(2);
    expect(r.knockbackTriggered).toBe(false);
    expect(r.bumpFromHex).toBe(true);
    expect(r.message).toMatch(/Defy Reality/);
  });

  it('Defy Reality with no inventory: lethal hit still knocks back', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 2,
      wards: 0,
      aether: 0,
      hp: 1,
      maxHp: 5,
      hasDefyReality: true,
      inventoryCount: 0,
    });
    expect(r.knockbackTriggered).toBe(true);
    expect(r.defyRealityItemsSpent).toBe(0);
    expect(r.newHp).toBe(5);
    expect(r.bumpFromHex).toBe(false);
  });

  it('reports no Currency penalty (removed in v2)', () => {
    const r = applyAttrition({
      ...baseInput,
      missedCalendarDays: 5,
      wards: 0,
      aether: 0,
      hp: 5,
    });
    expect(r).not.toHaveProperty('currencyPenalty');
  });
});
