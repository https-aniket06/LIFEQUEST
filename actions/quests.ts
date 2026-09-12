"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateQuestReward } from "@/lib/rpg/rewards";
import { toDayKey } from "@/lib/rpg/streaks";
import { createQuestSchema, completeQuestSchema } from "@/lib/validation/schemas";
import type { QuestCategory, QuestDifficulty } from "@/types/database";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function createQuest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createQuestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quest." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { title, description, category, difficulty, repeatFrequency, dueDate } = parsed.data;

  const { data, error } = await supabase
    .from("quests")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      category,
      difficulty,
      repeat_frequency: repeatFrequency,
      due_date: dueDate || null,
      status: "ACTIVE",
      source: "USER",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: "Couldn't create the quest. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/quests");
  return { ok: true, data: { id: data.id } };
}

export interface CompletionOutcome {
  xpAwarded: number;
  goldAwarded: number;
  attribute: string;
  attributePoints: number;
  newTotalXp: number;
  newGold: number;
  newStreak: number;
}

/**
 * Completing a quest is the single most important write path in the app.
 * The flow, deliberately in this order:
 *   1. Auth check.
 *   2. Load the quest and confirm ownership + ACTIVE status server-side —
 *      never trust a client-supplied "this is mine and still active" claim.
 *   3. Recompute the reward from (difficulty, category) via the pure,
 *      testable reward engine — never accept an xp/gold value from the
 *      client.
 *   4. Call the complete_quest() Postgres RPC, which atomically flips the
 *      quest to COMPLETED (only if it was still ACTIVE — this is what
 *      makes retried/duplicated calls a no-op instead of a double reward),
 *      writes the completion ledger row, updates the character, updates
 *      the streak, and checks achievements — all in one transaction.
 */
export async function completeQuest(input: unknown): Promise<ActionResult<CompletionOutcome>> {
  const parsed = completeQuestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("id, user_id, status, category, difficulty")
    .eq("id", parsed.data.questId)
    .single();

  if (questError || !quest) return { ok: false, error: "Quest not found." };
  if (quest.user_id !== user.id) return { ok: false, error: "That isn't your quest." };
  if (quest.status !== "ACTIVE") return { ok: false, error: "This quest was already completed." };

  const reward = calculateQuestReward(quest.difficulty as QuestDifficulty, quest.category as QuestCategory);

  // The user's local calendar day, used for streak bookkeeping. Falls back
  // to UTC if no timezone cookie/header is available.
  const dayKey = toDayKey(new Date(), "UTC");

  const { data: rpcData, error: rpcError } = await supabase.rpc("complete_quest", {
    p_quest_id: quest.id,
    p_xp: reward.xp,
    p_gold: reward.gold,
    p_attribute: reward.attribute,
    p_attribute_points: reward.attributePoints,
    p_day_key: dayKey,
  });

  if (rpcError || !rpcData || rpcData.length === 0) {
    return { ok: false, error: "This quest was already completed or is no longer available." };
  }

  const row = rpcData[0];

  revalidatePath("/dashboard");
  revalidatePath("/quests");
  revalidatePath("/character");

  return {
    ok: true,
    data: {
      xpAwarded: reward.xp,
      goldAwarded: reward.gold,
      attribute: reward.attribute,
      attributePoints: reward.attributePoints,
      newTotalXp: row.new_total_xp,
      newGold: row.new_gold,
      newStreak: row.new_streak,
    },
  };
}

export async function deleteQuest(questId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { error } = await supabase.from("quests").delete().eq("id", questId).eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't delete the quest." };

  revalidatePath("/dashboard");
  revalidatePath("/quests");
  return { ok: true };
}
