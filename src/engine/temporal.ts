/**
 * Calendar-day comparison, streak evaluation, and Dimensional Bleed attrition.
 * Pure logic — no React, no Supabase, no side effects.
 *
 * Attrition mirrors the standard Ward → Aether → HP `applyDamage` pipeline, dealing 1 point
 * of damage per missed day. After any damage lands the caller bumps the player to an
 * adjacent non-occupied hex; only when HP would hit 0 (without Defy Reality) does the player
 * fully retreat to startHex.
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
  /** Current Aether count. */
  aether: number;
  /** Current HP. */
  hp: number;
  /** Max HP (restored on knockback). */
  maxHp: number;
  /** True only when the player is currently parked on a hex with a hostile encounter that has not been cleared. */
  hexHasUnclearedEncounter: boolean;
  /** True when the player has Defy Reality (Gate-Crasher): consume 1 inventory to dodge a lethal hit. */
  hasDefyReality: boolean;
  /** Items the player can sacrifice via Defy Reality. */
  inventoryCount: number;
}

export interface ApplyAttritionResult {
  /** Wards consumed by Dimensional Bleed (0 when no attrition). */
  wardsSpent: number;
  /** Aether consumed once Wards run out. */
  aetherSpent: number;
  /** HP points lost once Wards and Aether are exhausted. */
  hpLost: number;
  newWards: number;
  newAether: number;
  newHp: number;
  /** Inventory items burnt by Defy Reality to dodge a lethal hit. */
  defyRealityItemsSpent: number;
  /** True iff HP would have hit 0 (without Defy Reality) — caller must retreat to startHex. */
  knockbackTriggered: boolean;
  /** True when any damage landed (and not knocked back) — caller bumps to an adjacent non-occupied hex. */
  bumpFromHex: boolean;
  /** Toast-ready explanation, or undefined when no attrition was applied. */
  message?: string;
}

export function applyAttrition(input: ApplyAttritionInput): ApplyAttritionResult {
  const noOp: ApplyAttritionResult = {
    wardsSpent: 0,
    aetherSpent: 0,
    hpLost: 0,
    newWards: input.wards,
    newAether: input.aether,
    newHp: input.hp,
    defyRealityItemsSpent: 0,
    knockbackTriggered: false,
    bumpFromHex: false,
  };

  if (input.missedCalendarDays <= 0) return noOp;
  if (!input.hexHasUnclearedEncounter) return noOp;

  let wards = Math.max(0, input.wards);
  let aether = Math.max(0, input.aether);
  let hp = input.hp;
  let wardsSpent = 0;
  let aetherSpent = 0;
  let hpLost = 0;
  let defyRealityItemsSpent = 0;
  let knockbackTriggered = false;
  let inventoryRemaining = Math.max(0, input.inventoryCount);

  for (let i = 0; i < input.missedCalendarDays; i++) {
    if (wards >= 1) {
      wards -= 1;
      wardsSpent += 1;
      continue;
    }
    if (aether >= 1) {
      aether -= 1;
      aetherSpent += 1;
      continue;
    }
    if (hp <= 1) {
      if (input.hasDefyReality && inventoryRemaining > 0) {
        inventoryRemaining -= 1;
        defyRealityItemsSpent += 1;
        hp = input.maxHp;
        continue;
      }
      hpLost += hp;
      hp = input.maxHp;
      knockbackTriggered = true;
      break;
    }
    hp -= 1;
    hpLost += 1;
  }

  const anyDamage =
    wardsSpent > 0 || aetherSpent > 0 || hpLost > 0 || defyRealityItemsSpent > 0;
  const bumpFromHex = anyDamage && !knockbackTriggered;

  let message: string | undefined;
  if (anyDamage) {
    const parts: string[] = [];
    if (wardsSpent > 0) parts.push(`${wardsSpent} Ward${wardsSpent === 1 ? '' : 's'}`);
    if (aetherSpent > 0) parts.push(`${aetherSpent} Aether`);
    if (hpLost > 0) parts.push(`${hpLost} HP`);
    if (defyRealityItemsSpent > 0) {
      parts.push(
        `${defyRealityItemsSpent} item${defyRealityItemsSpent === 1 ? '' : 's'} (Defy Reality)`
      );
    }
    const summary = parts.join(', ');
    const dayWord = input.missedCalendarDays === 1 ? 'day' : 'days';
    message = knockbackTriggered
      ? `Dimensional Bleed cost you ${summary} over ${input.missedCalendarDays} missed ${dayWord} — retreated to safety.`
      : `Dimensional Bleed cost you ${summary} for ${input.missedCalendarDays} missed ${dayWord}.`;
  }

  return {
    wardsSpent,
    aetherSpent,
    hpLost,
    newWards: wards,
    newAether: aether,
    newHp: hp,
    defyRealityItemsSpent,
    knockbackTriggered,
    bumpFromHex,
    message,
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
