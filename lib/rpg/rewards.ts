/**
 * LIFEQUEST — Reward Engine (SERVER-AUTHORITATIVE)
 * ---------------------------------------------------------------------------
 * This is the single place in the entire codebase that decides how much
 * XP/Gold a quest is worth. It is imported ONLY by server actions / route
 * handlers (actions/quests.ts, app/api/quests/complete). The client may
 * *display* a reward estimate (e.g. in the quest-creation preview), but the
 * value that is actually persisted is always recomputed here, server-side,
 * at completion time — a modified client payload cannot change what a user
 * is paid.
 *
 * Reward = difficulty base * category multiplier, with small deterministic
 * variance removed entirely (no randomness) so completions are reproducible
 * and testable.
 */

import type { QuestCategory, QuestDifficulty } from "@/types/database";

/** Base reward table indexed by difficulty. Tunable in one place. */
const DIFFICULTY_BASE: Record<QuestDifficulty, { xp: number; gold: number }> = {
  EASY: { xp: 25, gold: 8 },
  NORMAL: { xp: 60, gold: 18 },
  HARD: { xp: 120, gold: 35 },
  EPIC: { xp: 220, gold: 70 },
};

/**
 * Category multiplier. Keeps e.g. long study sessions and quick chores from
 * paying identically at the same difficulty label, without needing a
 * separate config per category per difficulty.
 */
const CATEGORY_MULTIPLIER: Record<QuestCategory, number> = {
  KNOWLEDGE: 1.0,
  FITNESS: 1.0,
  DISCIPLINE: 0.9,
  CREATIVITY: 1.0,
  WELLNESS: 0.85,
};

export const CATEGORY_ATTRIBUTE: Record<QuestCategory, keyof AttributeMap> = {
  KNOWLEDGE: "intelligence",
  FITNESS: "strength",
  DISCIPLINE: "discipline",
  CREATIVITY: "creativity",
  WELLNESS: "vitality",
};

export interface AttributeMap {
  strength: number;
  intelligence: number;
  discipline: number;
  vitality: number;
  creativity: number;
}

export interface QuestReward {
  xp: number;
  gold: number;
  attribute: keyof AttributeMap;
  attributePoints: number;
}

/** Hard ceilings so no combination of inputs can mint an absurd reward. */
const MAX_XP_PER_QUEST = 300;
const MAX_GOLD_PER_QUEST = 100;

/**
 * Compute the authoritative reward for a quest. Deterministic: same
 * (difficulty, category) always yields the same reward. Server code should
 * call this at completion time and ignore any xp/gold fields a client sends.
 */
export function calculateQuestReward(
  difficulty: QuestDifficulty,
  category: QuestCategory
): QuestReward {
  const base = DIFFICULTY_BASE[difficulty];
  const mult = CATEGORY_MULTIPLIER[category];

  const xp = Math.min(MAX_XP_PER_QUEST, Math.round(base.xp * mult));
  const gold = Math.min(MAX_GOLD_PER_QUEST, Math.round(base.gold * mult));

  // Attribute points scale much smaller than XP — attributes are meant to
  // creep up slowly over dozens of quests, not double every session.
  const attributePoints = Math.max(1, Math.round(xp / 40));

  return {
    xp,
    gold,
    attribute: CATEGORY_ATTRIBUTE[category],
    attributePoints,
  };
}

/** Daily quests pay a flat, small reward regardless of category — they exist
 *  to reward consistency, not to be a min-max XP farm. */
export const DAILY_QUEST_REWARD: QuestReward = {
  xp: 30,
  gold: 10,
  attribute: "discipline",
  attributePoints: 1,
};
