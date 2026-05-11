/**
 * Calendar-day comparison, streak evaluation, and Dimensional Bleed attrition.
 * Pure logic — no React, no Supabase, no side effects.
 *
 * Attrition deliberately diverges from the standard Ward → Aether → HP `applyDamage` pipeline:
 * idle penalty drains Wards only, then retreats + spends Currency. Aether and HP are not touched.
 */

export interface EvaluateTemporalInput {
  /** ISO 8601 timestamp of the most recent logged activity. Absent on the player's first-ever evaluation. */
  lastActiveISO?: string;
  /** Reference "now". Taken as a parameter so tests can pin clocks. */
  now: Date;
  /** IANA time zone (e.g. "America/Los_Angeles") used to bucket both timestamps into calendar days. */
  timeZone: string;
  /** Currently-persisted streak length. */
  currentStreak: number;
}

export interface EvaluateTemporalResult {
  /** Calendar days the player skipped between `lastActiveISO` and `now`. 0 for same-day or consecutive-day. */
  missedCalendarDays: number;
  /**
   * Streak the player would have IF they logged activity at `now`.
   * Hydrate/attrition callers should NOT persist this — only logWorkout commits it.
   */
  nextStreak: number;
  /** True when at least one full calendar day was skipped (streak should reset on next log). */
  streakReset: boolean;
  /** True when no prior `lastActiveISO` was supplied. */
  isFirstActivity: boolean;
}

/** Default milestone ladder — wiring code decides the reward payload per milestone. */
export const STREAK_MILESTONES: readonly number[] = [3, 7, 14, 30, 60, 100];

/** Currency granted per day-of-streak when a milestone is reached. */
export const STREAK_MILESTONE_CURRENCY_PER_DAY = 25;

/** Currency reward for hitting a streak milestone (proportional to milestone size). */
export function getStreakMilestoneCurrency(milestone: number): number {
  return milestone * STREAK_MILESTONE_CURRENCY_PER_DAY;
}

export function evaluateTemporal(input: EvaluateTemporalInput): EvaluateTemporalResult {
  const { lastActiveISO, now, timeZone, currentStreak } = input;

  if (!lastActiveISO) {
    return { missedCalendarDays: 0, nextStreak: 1, streakReset: false, isFirstActivity: true };
  }

  const lastDate = new Date(lastActiveISO);
  if (Number.isNaN(lastDate.getTime())) {
    return { missedCalendarDays: 0, nextStreak: 1, streakReset: false, isFirstActivity: true };
  }

  const dayDiff = calendarDayDiff(lastDate, now, timeZone);

  if (dayDiff <= 0) {
    return {
      missedCalendarDays: 0,
      nextStreak: Math.max(currentStreak, 0),
      streakReset: false,
      isFirstActivity: false,
    };
  }
  if (dayDiff === 1) {
    return {
      missedCalendarDays: 0,
      nextStreak: Math.max(currentStreak, 0) + 1,
      streakReset: false,
      isFirstActivity: false,
    };
  }
  return {
    missedCalendarDays: dayDiff - 1,
    nextStreak: 1,
    streakReset: true,
    isFirstActivity: false,
  };
}

/**
 * Returns the milestone value crossed by going from `prevStreak` to `nextStreak`,
 * or `undefined` if no milestone was crossed (or the streak did not advance).
 */
export function streakMilestoneReached(prevStreak: number, nextStreak: number): number | undefined {
  if (nextStreak <= prevStreak) return undefined;
  for (const m of STREAK_MILESTONES) {
    if (prevStreak < m && nextStreak >= m) return m;
  }
  return undefined;
}

export interface ApplyAttritionInput {
  /** From `evaluateTemporal`. Must be >= 1 for any effect. */
  missedCalendarDays: number;
  /** Current Ward count. */
  wards: number;
  /** True only when the player is currently parked on a hex with a hostile encounter that has not been cleared. */
  hexHasUnclearedEncounter: boolean;
  /** Realm starting hex — destination when retreat is triggered. */
  startHex: { q: number; r: number };
  /** Current Currency balance — penalty cannot drive this below zero. */
  currency: number;
}

export interface ApplyAttritionResult {
  /** Wards consumed by Dimensional Bleed (0 when no attrition). */
  wardsSpent: number;
  newWards: number;
  /** True iff the player must be moved to `startHex`. */
  retreatTriggered: boolean;
  newPlayerHex?: { q: number; r: number };
  currencyPenalty: number;
  newCurrency: number;
  /** Toast-ready explanation, or undefined when no attrition was applied. */
  message?: string;
}

/** Currency drained per missed day once Wards run out. Tunable; wiring task may parameterize. */
export const ATTRITION_CURRENCY_PER_MISSED_DAY = 50;

export function applyAttrition(input: ApplyAttritionInput): ApplyAttritionResult {
  const noOp: ApplyAttritionResult = {
    wardsSpent: 0,
    newWards: input.wards,
    retreatTriggered: false,
    currencyPenalty: 0,
    newCurrency: input.currency,
  };

  if (input.missedCalendarDays <= 0) return noOp;
  if (!input.hexHasUnclearedEncounter) return noOp;

  const wardsAvailable = Math.max(0, input.wards);
  const wardsSpent = Math.min(wardsAvailable, input.missedCalendarDays);
  const remainingDays = input.missedCalendarDays - wardsSpent;
  const newWards = Math.max(0, input.wards - wardsSpent);

  if (remainingDays === 0) {
    return {
      wardsSpent,
      newWards,
      retreatTriggered: false,
      currencyPenalty: 0,
      newCurrency: input.currency,
      message: `Dimensional Bleed cost you ${wardsSpent} Ward${wardsSpent === 1 ? '' : 's'} for ${input.missedCalendarDays} missed day${input.missedCalendarDays === 1 ? '' : 's'}.`,
    };
  }

  const currencyPenalty = Math.min(
    Math.max(0, input.currency),
    remainingDays * ATTRITION_CURRENCY_PER_MISSED_DAY
  );
  const newCurrency = Math.max(0, input.currency - currencyPenalty);

  return {
    wardsSpent,
    newWards,
    retreatTriggered: true,
    newPlayerHex: { ...input.startHex },
    currencyPenalty,
    newCurrency,
    message:
      wardsSpent > 0
        ? `Wards depleted (${wardsSpent} spent) — Dimensional Bleed retreated you to safety and drained ${currencyPenalty} Currency.`
        : `Dimensional Bleed retreated you to safety and drained ${currencyPenalty} Currency for ${input.missedCalendarDays} missed day${input.missedCalendarDays === 1 ? '' : 's'}.`,
  };
}

function calendarDayDiff(a: Date, b: Date, timeZone: string): number {
  const aDay = ymdInTimeZone(a, timeZone);
  const bDay = ymdInTimeZone(b, timeZone);
  const aMs = Date.UTC(aDay.year, aDay.month - 1, aDay.day);
  const bMs = Date.UTC(bDay.year, bDay.month - 1, bDay.day);
  return Math.round((bMs - aMs) / 86_400_000);
}

function ymdInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  return { year, month, day };
}
