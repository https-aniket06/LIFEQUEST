"use client";

import { XPBar } from "@/components/dashboard/XPBar";
import { getLevelProgress } from "@/lib/rpg/leveling";

export function CharacterHUD({
  totalXp,
  gold,
  streak,
  longestStreak,
  displayName,
}: {
  totalXp: number;
  gold: number;
  streak: number;
  longestStreak: number;
  displayName: string;
}) {
  const progress = getLevelProgress(totalXp);

  return (
    <div className="pixel-panel p-5">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center border-2 border-edge bg-panel-2 text-3xl">
          🧙
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <p className="truncate text-sm text-ink-text">{displayName}</p>
            <span className="font-pixel text-xs text-aether">LV.{progress.level}</span>
          </div>
          <div className="mt-2">
            <XPBar progress={progress.progress} xpIntoLevel={progress.xpIntoLevel} xpToNextLevel={progress.xpToNextLevel} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="border-2 border-edge bg-panel-2 py-2">
          <p className="font-pixel text-sm text-gold">{gold.toLocaleString()}g</p>
          <p className="mt-1 text-[0.6rem] text-muted-text">GOLD</p>
        </div>
        <div className="border-2 border-edge bg-panel-2 py-2">
          <p className="font-pixel text-sm text-ember">🔥{streak}</p>
          <p className="mt-1 text-[0.6rem] text-muted-text">STREAK · BEST {longestStreak}</p>
        </div>
      </div>
    </div>
  );
}
