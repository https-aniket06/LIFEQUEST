"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { purchaseItemSchema } from "@/lib/validation/schemas";
import type { ActionResult } from "@/actions/quests";

export async function purchaseItem(input: unknown): Promise<ActionResult<{ newGold: number }>> {
  const parsed = purchaseItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid item." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  // purchase_item() re-checks the price and the character's balance
  // server-side inside a single transaction — a modified client payload
  // can't change what's charged, and a double-click can't double-charge
  // (the gold check + deduction happen under a row lock).
  const { data, error } = await supabase.rpc("purchase_item", { p_item_id: parsed.data.itemId });

  if (error) {
    if (error.message?.includes("insufficient gold")) {
      return { ok: false, error: "Not enough gold for that yet." };
    }
    return { ok: false, error: "Purchase failed. Please try again." };
  }

  revalidatePath("/shop");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");

  return { ok: true, data: { newGold: data?.[0]?.new_gold ?? 0 } };
}

export async function toggleEquipped(inventoryId: string, equipped: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("inventory")
    .update({ equipped })
    .eq("id", inventoryId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Couldn't update that item." };

  revalidatePath("/inventory");
  revalidatePath("/character");
  return { ok: true };
}
