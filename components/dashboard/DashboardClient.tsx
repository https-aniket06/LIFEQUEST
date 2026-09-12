"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { completeQuest, deleteQuest } from "@/actions/quests";
import { calculateQuestReward } from "@/lib/rpg/rewards";
import { applyXpGain } from "@/lib/rpg/leveling";
import { CharacterHUD } from "@/components/dashboard/CharacterHUD";
import { AttributeBars } from "@/components/dashboard/AttributeBars";
import { QuestCard } from "@/components/dashboard/QuestCard";
import { LevelUpModal } from "@/components/dashboard/LevelUpModal";
import { CreateQuestModal } from "@/components/quests/CreateQuestModal";
import { QuestForgeModal } from "@/components/quests/QuestForgeModal";
import type { Character, Quest } from "@/types/database";

interface DashboardClientProps {
  displayName: string;
  initialCharacter: Character;
  initialQuests: Quest[];
}

export function DashboardClient({ displayName, initialCharacter, initialQuests }: DashboardClientProps) {
  const router = useRouter();
  const [character, setCharacter] = useState(initialCharacter);
  const [quests, setQuests] = useState(initialQuests);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [forgeOpen, setForgeOpen] = useState(false);

  const activeQuests = quests.filter((q) => q.status === "ACTIVE");
  const completedToday = quests.filter((q) => q.status === "COMPLETED");

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleComplete(questId: string) {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const reward = calculateQuestReward(quest.difficulty, quest.category);
    const previousCharacter = character;
    const previousQuests = quests;

    // Optimistic update: reflect the completion immediately so the
    // interaction feels instant, but keep everything needed to roll back.
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, status: "COMPLETED" as const } : q)));
    setCharacter((prev) => {
      const next: Character = { ...prev, total_xp: prev.total_xp + reward.xp, gold: prev.gold + reward.gold };
      next[reward.attribute] = prev[reward.attribute] + reward.attributePoints;
      return next;
    });

    const levelCheck = applyXpGain(previousCharacter.total_xp, reward.xp);

    // Wrapped in try/catch because a dropped connection makes the server
    // action call itself throw (not just return { ok: false }) — without
    // this, a lost connection mid-completion would leave the optimistic UI
    // permanently wrong AND throw an unhandled exception.
    try {
      const result = await completeQuest({ questId });

      if (!result.ok || !result.data) {
        setQuests(previousQuests);
        setCharacter(previousCharacter);
        showToast(result.error ?? "Couldn't complete that quest. Please try again.");
        return;
      }

      // Reconcile with server-confirmed truth (in case of any drift).
      setCharacter((prev) => ({
        ...prev,
        total_xp: result.data!.newTotalXp,
        gold: result.data!.newGold,
        current_streak: result.data!.newStreak,
        longest_streak: Math.max(prev.longest_streak, result.data!.newStreak),
      }));

      if (levelCheck.leveledUp) {
        setLevelUpTo(levelCheck.after.level);
      }

      router.refresh();
    } catch {
      // Network drop, server unreachable, etc. Roll back exactly as we
      // would for a server-reported failure — no reward is ever shown
      // unless it was actually confirmed.
      setQuests(previousQuests);
      setCharacter(previousCharacter);
      showToast("Connection lost. That quest wasn't completed — please try again.");
    }
  }

  function handleDelete(questId: string) {
    const previousQuests = quests;
    setQuests((prev) => prev.filter((q) => q.id !== questId));
    deleteQuest(questId)
      .then((result) => {
        if (!result.ok) {
          setQuests(previousQuests);
          showToast(result.error ?? "Couldn't delete that quest.");
        }
      })
      .catch(() => {
        setQuests(previousQuests);
        showToast("Connection lost. That quest wasn't deleted — please try again.");
      });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <CharacterHUD
            totalXp={character.total_xp}
            gold={character.gold}
            streak={character.current_streak}
            longestStreak={character.longest_streak}
            displayName={displayName}
          />
          <div className="pixel-panel p-5">
            <h2 className="font-pixel text-xs text-ink-text">ATTRIBUTES</h2>
            <div className="mt-4">
              <AttributeBars
                attributes={{
                  strength: character.strength,
                  intelligence: character.intelligence,
                  discipline: character.discipline,
                  vitality: character.vitality,
                  creativity: character.creativity,
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-pixel text-sm text-ink-text">TODAY'S QUESTS</h2>
            <div className="flex gap-2">
              <button onClick={() => setForgeOpen(true)} className="pixel-button-secondary !px-3 !py-2 text-[0.6rem]">
                AI FORGE
              </button>
              <button onClick={() => setCreateOpen(true)} className="pixel-button !px-3 !py-2 text-[0.6rem]">
                + NEW QUEST
              </button>
            </div>
          </div>

          {activeQuests.length === 0 && completedToday.length === 0 ? (
            <div className="pixel-panel p-8 text-center text-muted-text">
              <p>No quests yet. Create one, or let the AI Quest Forge suggest a few.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {activeQuests.map((quest) => {
                  const reward = calculateQuestReward(quest.difficulty, quest.category);
                  return (
                    <QuestCard
                      key={quest.id}
                      quest={quest}
                      xpEstimate={reward.xp}
                      goldEstimate={reward.gold}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          {completedToday.length > 0 && (
            <div>
              <h3 className="font-pixel mt-6 text-[0.65rem] text-muted-text">COMPLETED</h3>
              <ul className="mt-2 space-y-2 opacity-60">
                {completedToday.map((quest) => (
                  <li key={quest.id} className="pixel-panel flex items-center justify-between p-3 text-sm">
                    <span className="text-muted-text line-through">{quest.title}</span>
                    <span className="text-aether">✓</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <LevelUpModal newLevel={levelUpTo} onClose={() => setLevelUpTo(null)} />
      <CreateQuestModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => router.refresh()} />
      <QuestForgeModal open={forgeOpen} onClose={() => setForgeOpen(false)} onAccepted={() => router.refresh()} />

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border-2 border-vitality bg-ink px-4 py-3 text-sm text-vitality"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
