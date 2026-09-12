// LIFEQUEST — RPG engine tests
//
// Run with:  node --experimental-strip-types --test tests/rpg.test.mjs
//
// These exercise the pure game-logic modules directly (no React, no
// Next.js, no Supabase, no network) so they run in any plain Node 22+
// environment, including CI, with zero installed dependencies.

import test from "node:test";
import assert from "node:assert/strict";

import {
  xpForLevel,
  totalXpForLevel,
  getLevelProgress,
  applyXpGain,
  MAX_LEVEL,
} from "../lib/rpg/leveling.ts";

import { calculateQuestReward, DAILY_QUEST_REWARD } from "../lib/rpg/rewards.ts";

import { recordActiveDay, getDisplayStreak, toDayKey } from "../lib/rpg/streaks.ts";

// ---------------------------------------------------------------------------
// Leveling
// ---------------------------------------------------------------------------

test("xpForLevel follows BASE_XP * level^1.5 and grows monotonically", () => {
  assert.equal(xpForLevel(1), 100);
  assert.equal(xpForLevel(2), 282); // floor(100 * 2^1.5) = floor(282.84) = 282
  assert.ok(xpForLevel(10) > xpForLevel(9));
  assert.ok(xpForLevel(50) > xpForLevel(10) * 5); // curve, not linear
});

test("getLevelProgress: 0 XP is level 1 with 0 progress", () => {
  const p = getLevelProgress(0);
  assert.equal(p.level, 1);
  assert.equal(p.xpIntoLevel, 0);
  assert.equal(p.progress, 0);
});

test("getLevelProgress: exact threshold lands precisely on the next level", () => {
  const costL1 = xpForLevel(1);
  const p = getLevelProgress(costL1);
  assert.equal(p.level, 2);
  assert.equal(p.xpIntoLevel, 0);
});

test("getLevelProgress: totalXpForLevel round-trips through getLevelProgress", () => {
  for (let lvl = 1; lvl <= 15; lvl++) {
    const total = totalXpForLevel(lvl);
    const p = getLevelProgress(total);
    assert.equal(p.level, lvl, `expected level ${lvl} at total XP ${total}, got ${p.level}`);
  }
});

test("getLevelProgress never exceeds MAX_LEVEL even with absurd XP", () => {
  const p = getLevelProgress(Number.MAX_SAFE_INTEGER / 1e6);
  assert.ok(p.level <= MAX_LEVEL);
  assert.equal(p.isMaxLevel, p.level >= MAX_LEVEL);
});

test("getLevelProgress rejects negative XP by clamping to 0", () => {
  const p = getLevelProgress(-500);
  assert.equal(p.level, 1);
  assert.equal(p.totalXp, 0);
});

test("applyXpGain detects a level-up crossing exactly one threshold", () => {
  const costL1 = xpForLevel(1);
  const result = applyXpGain(costL1 - 10, 10);
  assert.equal(result.leveledUp, true);
  assert.equal(result.levelsGained, 1);
  assert.equal(result.after.level, 2);
});

test("applyXpGain can gain multiple levels from one large reward", () => {
  const result = applyXpGain(0, totalXpForLevel(6));
  assert.equal(result.after.level, 6);
  assert.equal(result.leveledUp, true);
  assert.equal(result.levelsGained, 5);
});

test("applyXpGain with 0 gain never levels up", () => {
  const result = applyXpGain(1234, 0);
  assert.equal(result.leveledUp, false);
  assert.equal(result.levelsGained, 0);
});

// ---------------------------------------------------------------------------
// Rewards (server-authoritative economy)
// ---------------------------------------------------------------------------

test("calculateQuestReward is deterministic for the same inputs", () => {
  const a = calculateQuestReward("HARD", "KNOWLEDGE");
  const b = calculateQuestReward("HARD", "KNOWLEDGE");
  assert.deepEqual(a, b);
});

test("calculateQuestReward scales up with difficulty", () => {
  const easy = calculateQuestReward("EASY", "FITNESS");
  const normal = calculateQuestReward("NORMAL", "FITNESS");
  const hard = calculateQuestReward("HARD", "FITNESS");
  const epic = calculateQuestReward("EPIC", "FITNESS");
  assert.ok(easy.xp < normal.xp);
  assert.ok(normal.xp < hard.xp);
  assert.ok(hard.xp < epic.xp);
});

test("calculateQuestReward maps category to the correct attribute", () => {
  assert.equal(calculateQuestReward("EASY", "KNOWLEDGE").attribute, "intelligence");
  assert.equal(calculateQuestReward("EASY", "FITNESS").attribute, "strength");
  assert.equal(calculateQuestReward("EASY", "DISCIPLINE").attribute, "discipline");
  assert.equal(calculateQuestReward("EASY", "CREATIVITY").attribute, "creativity");
  assert.equal(calculateQuestReward("EASY", "WELLNESS").attribute, "vitality");
});

test("calculateQuestReward never exceeds the hard reward ceiling", () => {
  const epic = calculateQuestReward("EPIC", "KNOWLEDGE");
  assert.ok(epic.xp <= 300);
  assert.ok(epic.gold <= 100);
});

test("DAILY_QUEST_REWARD is a small flat reward", () => {
  assert.equal(DAILY_QUEST_REWARD.xp, 30);
  assert.equal(DAILY_QUEST_REWARD.gold, 10);
});

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

test("toDayKey formats consistently as YYYY-MM-DD", () => {
  const key = toDayKey(new Date("2026-09-12T15:00:00Z"), "UTC");
  assert.equal(key, "2026-09-12");
});

test("recordActiveDay: first ever activity starts streak at 1", () => {
  const state = recordActiveDay({ currentStreak: 0, longestStreak: 0, lastActiveDay: null }, "2026-09-10");
  assert.equal(state.currentStreak, 1);
  assert.equal(state.longestStreak, 1);
});

test("recordActiveDay: consecutive day increments streak", () => {
  let state = recordActiveDay({ currentStreak: 0, longestStreak: 0, lastActiveDay: null }, "2026-09-10");
  state = recordActiveDay(state, "2026-09-11");
  state = recordActiveDay(state, "2026-09-12");
  assert.equal(state.currentStreak, 3);
  assert.equal(state.longestStreak, 3);
});

test("recordActiveDay: same day twice does not double-count", () => {
  let state = recordActiveDay({ currentStreak: 0, longestStreak: 0, lastActiveDay: null }, "2026-09-10");
  state = recordActiveDay(state, "2026-09-10");
  state = recordActiveDay(state, "2026-09-10");
  assert.equal(state.currentStreak, 1);
});

test("recordActiveDay: a gap of 2+ days resets streak to 1, but preserves longest", () => {
  let state = recordActiveDay({ currentStreak: 0, longestStreak: 0, lastActiveDay: null }, "2026-09-01");
  state = recordActiveDay(state, "2026-09-02");
  state = recordActiveDay(state, "2026-09-03"); // streak = 3
  state = recordActiveDay(state, "2026-09-07"); // gap -> reset to 1
  assert.equal(state.currentStreak, 1);
  assert.equal(state.longestStreak, 3);
});

test("recordActiveDay: an out-of-order backfill in the past is ignored", () => {
  let state = recordActiveDay({ currentStreak: 0, longestStreak: 0, lastActiveDay: null }, "2026-09-10");
  const before = state;
  state = recordActiveDay(state, "2026-09-05"); // earlier than lastActiveDay
  assert.deepEqual(state, before);
});

test("getDisplayStreak reports 0 once more than a day has passed with no activity", () => {
  const state = { currentStreak: 5, longestStreak: 5, lastActiveDay: "2026-09-01" };
  assert.equal(getDisplayStreak(state, "2026-09-02"), 5); // 1 day later: still alive
  assert.equal(getDisplayStreak(state, "2026-09-03"), 0); // 2 days later: broken
});
