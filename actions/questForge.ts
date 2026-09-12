"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { forgeQuests, type ForgedQuest } from "@/lib/ai/questForge";
import { questForgeGoalSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/actions/quests";

export async function runQuestForge(input: unknown): Promise<ActionResult<{ quests: ForgedQuest[]; provider: string }>> {
  const parsed = questForgeGoalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid goal." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const result = await forgeQuests(parsed.data.goal);
  return { ok: true, data: result };
}

/**
 * The AI only ever produces a *draft*. Accepting a suggestion inserts it as
 * a normal ACTIVE quest through the exact same insert path as a
 * user-authored quest — the AI's suggested xp/gold estimate is discarded
 * here too; calculateQuestReward() will be re-run again at completion time.
 */
export async function acceptForgedQuest(quest: ForgedQuest): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { data, error } = await supabase
    .from("quests")
    .insert({
      user_id: user.id,
      title: quest.title.slice(0, 140),
      description: quest.description?.slice(0, 1000) || null,
      category: quest.category,
      difficulty: quest.difficulty,
      repeat_frequency: "NONE",
      status: "ACTIVE",
      source: "AI_FORGE",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: "Couldn't add that quest." };

  revalidatePath("/dashboard");
  revalidatePath("/quests");
  return { ok: true, data: { id: data.id } };
}
