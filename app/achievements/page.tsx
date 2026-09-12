import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/AppNav";
import type { Achievement } from "@/types/database";

export const metadata = { title: "Achievements — LIFEQUEST" };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: achievements }, { data: unlocked }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", user.id),
  ]);

  const unlockedMap = new Map((unlocked ?? []).map((row) => [row.achievement_id, row.unlocked_at as string]));

  return (
    <>
      <AppNav />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="font-pixel text-sm text-ink-text">ACHIEVEMENTS</h1>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {((achievements as Achievement[]) ?? []).map((achievement) => {
            const unlockedAt = unlockedMap.get(achievement.id);
            const isUnlocked = Boolean(unlockedAt);
            return (
              <li key={achievement.id} className={`pixel-panel flex items-center gap-4 p-5 ${isUnlocked ? "" : "opacity-40 grayscale"}`}>
                <span className="text-3xl leading-none">{achievement.icon_glyph}</span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-ink-text">{achievement.name}</h2>
                  <p className="mt-1 text-xs text-muted-text">{achievement.description}</p>
                  {isUnlocked && (
                    <p className="mt-1 font-pixel text-[0.55rem] text-aether">
                      UNLOCKED {new Date(unlockedAt!).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
