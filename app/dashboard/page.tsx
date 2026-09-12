import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/AppNav";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { Character, Quest } from "@/types/database";

export const metadata = { title: "HUD — LIFEQUEST" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: character }, { data: quests }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("characters").select("*").eq("user_id", user.id).single(),
    supabase
      .from("quests")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["ACTIVE", "COMPLETED"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Defensive fallback: the handle_new_user trigger should always have
  // created a character row, but if it somehow hasn't yet (e.g. a replica
  // lag edge case right after signup), don't crash the dashboard.
  const safeCharacter: Character =
    character ?? {
      id: "",
      user_id: user.id,
      total_xp: 0,
      gold: 0,
      strength: 0,
      intelligence: 0,
      discipline: 0,
      vitality: 0,
      creativity: 0,
      current_streak: 0,
      longest_streak: 0,
      last_active_day: null,
      equipped_title: null,
      equipped_frame: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  return (
    <>
      <AppNav />
      <DashboardClient
        displayName={profile?.display_name ?? "Adventurer"}
        initialCharacter={safeCharacter}
        initialQuests={(quests as Quest[]) ?? []}
      />
    </>
  );
}
