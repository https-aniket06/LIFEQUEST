import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/AppNav";
import { getLevelProgress } from "@/lib/rpg/leveling";
import type { InventoryEntry, Item } from "@/types/database";

export const metadata = { title: "Character — LIFEQUEST" };

interface EquippedRow extends InventoryEntry {
  item: Item;
}

export default async function CharacterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: character }, { data: completions }, { data: equippedRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("characters").select("*").eq("user_id", user.id).single(),
    supabase.from("quest_completions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("inventory").select("*, item:items(*)").eq("user_id", user.id).eq("equipped", true),
  ]);

  if (!character) redirect("/dashboard");

  const progress = getLevelProgress(character.total_xp);
  const attributes = [
    { label: "Strength", value: character.strength },
    { label: "Intelligence", value: character.intelligence },
    { label: "Discipline", value: character.discipline },
    { label: "Vitality", value: character.vitality },
    { label: "Creativity", value: character.creativity },
  ];

  return (
    <>
      <AppNav />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="pixel-panel p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center border-2 border-edge bg-panel-2 text-5xl">🧙</div>
          <h1 className="mt-4 text-lg font-semibold text-ink-text">{profile?.display_name ?? "Adventurer"}</h1>
          <p className="font-pixel mt-2 text-sm text-aether">LEVEL {progress.level}</p>
          <p className="mt-1 text-xs text-muted-text">{character.total_xp.toLocaleString()} total XP</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="pixel-panel p-5">
            <h2 className="font-pixel text-xs text-ink-text">ATTRIBUTES</h2>
            <ul className="mt-4 space-y-2">
              {attributes.map((attr) => (
                <li key={attr.label} className="flex justify-between text-sm">
                  <span className="text-muted-text">{attr.label}</span>
                  <span className="text-ink-text">{attr.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pixel-panel p-5">
            <h2 className="font-pixel text-xs text-ink-text">LIFETIME STATS</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-text">Quests completed</span>
                <span className="text-ink-text">{completions ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-text">Current streak</span>
                <span className="text-ink-text">{character.current_streak} days</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-text">Longest streak</span>
                <span className="text-ink-text">{character.longest_streak} days</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-text">Gold</span>
                <span className="text-gold">{character.gold}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pixel-panel mt-6 p-5">
          <h2 className="font-pixel text-xs text-ink-text">EQUIPPED</h2>
          {(!equippedRows || equippedRows.length === 0) ? (
            <p className="mt-3 text-sm text-muted-text">Nothing equipped yet — visit the shop and inventory.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-3">
              {(equippedRows as unknown as EquippedRow[]).map((row) => (
                <li key={row.id} className="border-2 border-aether bg-panel-2 px-3 py-2 text-sm text-ink-text">
                  {row.item.icon_glyph} {row.item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
