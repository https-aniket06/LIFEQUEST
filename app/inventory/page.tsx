import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/AppNav";
import { InventoryClient, type InventoryRow } from "@/components/inventory/InventoryClient";

export const metadata = { title: "Inventory — LIFEQUEST" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("inventory")
    .select("*, item:items(*)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false });

  return (
    <>
      <AppNav />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-pixel text-sm text-ink-text">INVENTORY</h1>
        <div className="mt-6">
          <InventoryClient rows={(data as unknown as InventoryRow[]) ?? []} />
        </div>
      </div>
    </>
  );
}
