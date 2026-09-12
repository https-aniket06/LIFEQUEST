import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/AppNav";
import { ShopClient } from "@/components/shop/ShopClient";
import type { Item } from "@/types/database";

export const metadata = { title: "Shop — LIFEQUEST" };

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: character }, { data: inventory }] = await Promise.all([
    supabase.from("items").select("*").order("price_gold", { ascending: true }),
    supabase.from("characters").select("gold").eq("user_id", user.id).single(),
    supabase.from("inventory").select("item_id").eq("user_id", user.id),
  ]);

  const ownedItemIds = new Set((inventory ?? []).map((row: { item_id: string }) => row.item_id));

  return (
    <>
      <AppNav />
      <ShopClient items={(items as Item[]) ?? []} ownedItemIds={ownedItemIds} initialGold={character?.gold ?? 0} />
    </>
  );
}
