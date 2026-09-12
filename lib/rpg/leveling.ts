/**
 * LIFEQUEST — Leveling Engine
 * ---------------------------------------------------------------------------
 * Deterministic, non-linear XP curve. Pure functions only — no I/O, no
 * randomness — so the same total XP always produces the same level, and
 * this module can be unit tested without a database or server.
 *
 * FORMULA
 * -------
 * XP required to go from level N to level N+1:
 *
 *     xpForLevel(N) = floor(BASE_XP * N^EXP_CURVE)
 *
 * With BASE_XP = 100 and EXP_CURVE = 1.5, the per-level cost grows like:
 *   L1 -> L2 :   100 XP
 *   L2 -> L3 :   283 XP
 *   L3 -> L4 :   520 XP
 *   L4 -> L5 :   800 XP
 *   L9 -> L10: 2,700 XP
 *
 * This gives early levels a fast, dopamine-friendly pace and later levels a
 * long, meaningful grind — standard RPG "power curve" shape.
 *
 * A character's level is derived from *total lifetime XP*, never stored as
 * an independently-mutable field, which is what prevents desync bugs (e.g.
 * client claims level 40 but only has enough total XP for level 12).
 */

export const BASE_XP = 100;
export const EXP_CURVE = 1.5;
export const MAX_LEVEL = 99;

/** XP cost to advance FROM `level` TO `level + 1`. */
export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level, EXP_CURVE));
}

/** Total cumulative XP required to REACH `level` (level 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

export interface LevelProgress {
  level: number;
  totalXp: number;
  /** XP earned so far within the current level. */
  xpIntoLevel: number;
  /** XP required to complete the current level. */
  xpToNextLevel: number;
  /** 0..1 progress bar fill for the current level. */
  progress: number;
  isMaxLevel: boolean;
}

/**
 * Derive a character's level + progress bar state purely from total XP.
 * This is the single source of truth — level is NEVER read from a stored
 * "level" column when calculating rewards; it's always recomputed from XP.
 */
export function getLevelProgress(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;

  while (level < MAX_LEVEL) {
    const cost = xpForLevel(level);
    if (remaining < cost) break;
    remaining -= cost;
    level += 1;
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const xpToNextLevel = isMaxLevel ? 0 : xpForLevel(level);

  return {
    level,
    totalXp: safeXp,
    xpIntoLevel: remaining,
    xpToNextLevel,
    progress: isMaxLevel ? 1 : xpToNextLevel === 0 ? 0 : remaining / xpToNextLevel,
    isMaxLevel,
  };
}

export interface LevelUpResult {
  before: LevelProgress;
  after: LevelProgress;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Compare progress before/after an XP award to detect level-ups. The caller
 * (a server action) uses this to decide whether to fire the level-up
 * animation and achievement checks — never the client.
 */
export function applyXpGain(currentTotalXp: number, xpGained: number): LevelUpResult {
  const safeGain = Math.max(0, Math.floor(xpGained));
  const before = getLevelProgress(currentTotalXp);
  const after = getLevelProgress(currentTotalXp + safeGain);
  return {
    before,
    after,
    leveledUp: after.level > before.level,
    levelsGained: after.level - before.level,
  };
}
