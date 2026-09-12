/**
 * LIFEQUEST — Streak Engine
 * ---------------------------------------------------------------------------
 * A "streak" counts consecutive CALENDAR DAYS (in the user's own local
 * timezone) on which at least one quest was completed. It is derived from
 * the `daily_activity` table (one row per user per local day that has at
 * least one completion) — never incremented ad hoc — so a duplicate
 * completion request or a retried network call can't inflate it.
 *
 * All date math here operates on plain "YYYY-MM-DD" day-keys computed in the
 * CALLER's chosen timezone (see toDayKey), which keeps this module pure and
 * trivially testable without faking system time.
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
}

/** Convert a Date to a YYYY-MM-DD key in a given IANA timezone. */
export function toDayKey(date: Date, timeZone: string): string {
  // en-CA locale formats as YYYY-MM-DD, which is exactly the sortable,
  // comparable key format we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Number of whole calendar days between two YYYY-MM-DD keys (b - a). */
function dayDiff(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * Recompute streak state after a new active day is recorded.
 *
 * Rules:
 *  - First-ever activity: streak = 1.
 *  - Same day as last activity: no change (already counted today).
 *  - Exactly 1 day after last activity: streak continues (+1).
 *  - More than 1 day gap: streak resets to 1 (today counts as a fresh start).
 *  - Out-of-order backfill (today is BEFORE lastActiveDay) is ignored for
 *    streak purposes — it can't be used to retroactively inflate a streak.
 */
export function recordActiveDay(state: StreakState, todayKey: string): StreakState {
  if (!state.lastActiveDay) {
    return { currentStreak: 1, longestStreak: Math.max(1, state.longestStreak), lastActiveDay: todayKey };
  }

  const diff = dayDiff(state.lastActiveDay, todayKey);

  if (diff === 0) {
    // Already logged today — idempotent, no double counting.
    return state;
  }

  if (diff < 0) {
    // A completion timestamped in the past relative to our last recorded
    // day. Don't let it change the streak; just leave state untouched.
    return state;
  }

  const newStreak = diff === 1 ? state.currentStreak + 1 : 1;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    lastActiveDay: todayKey,
  };
}

/**
 * A streak "breaks" (should be reset to 0, not just left stale) once more
 * than one full day has elapsed since the last active day with no new
 * activity. Call this on read (e.g. when loading the dashboard) so a streak
 * doesn't display as alive forever if the user simply hasn't opened the app.
 */
export function getDisplayStreak(state: StreakState, todayKey: string): number {
  if (!state.lastActiveDay) return 0;
  const diff = dayDiff(state.lastActiveDay, todayKey);
  return diff <= 1 ? state.currentStreak : 0;
}
