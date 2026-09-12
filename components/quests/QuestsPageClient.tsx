"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { completeQuest, deleteQuest } from "@/actions/quests";
import { calculateQuestReward } from "@/lib/rpg/rewards";
import { QuestCard } from "@/components/dashboard/QuestCard";
import { CreateQuestModal } from "@/components/quests/CreateQuestModal";
import { QuestForgeModal } from "@/components/quests/QuestForgeModal";
import type { Quest, QuestStatus } from "@/types/database";

const FILTERS: { key: QuestStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "ACTIVE", label: "ACTIVE" },
  { key: "COMPLETED", label: "COMPLETED" },
];

export function QuestsPageClient({ initialQuests }: { initialQuests: Quest[] }) {
  const router = useRouter();
  const [quests, setQuests] = useState(initialQuests);
  const [filter, setFilter] = useState<QuestStatus | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleQuests = useMemo(
    () => (filter === "ALL" ? quests : quests.filter((q) => q.status === filter)),
    [quests, filter]
  );

  async function handleComplete(questId: string) {
    const previous = quests;
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, status: "COMPLETED" as const } : q)));
    try {
      const result = await completeQuest({ questId });
      if (!result.ok) {
        setQuests(previous);
        setError(result.error ?? "Couldn't complete that quest.");
        setTimeout(() => setError(null), 3500);
        return;
      }
      router.refresh();
    } catch {
      setQuests(previous);
      setError("Connection lost. That quest wasn't completed — please try again.");
      setTimeout(() => setError(null), 3500);
    }
  }

  function handleDelete(questId: string) {
    const previous = quests;
    setQuests((prev) => prev.filter((q) => q.id !== questId));
    deleteQuest(questId)
      .then((result) => {
        if (!result.ok) {
          setQuests(previous);
          setError(result.error ?? "Couldn't delete that quest.");
          setTimeout(() => setError(null), 3500);
        }
      })
      .catch(() => {
        setQuests(previous);
        setError("Connection lost. That quest wasn't deleted — please try again.");
        setTimeout(() => setError(null), 3500);
      });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-pixel text-sm text-ink-text">QUEST LOG</h1>
        <div className="flex gap-2">
          <button onClick={() => setForgeOpen(true)} className="pixel-button-secondary !px-3 !py-2 text-[0.6rem]">
            AI FORGE
          </button>
          <button onClick={() => setCreateOpen(true)} className="pixel-button !px-3 !py-2 text-[0.6rem]">
            + NEW QUEST
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`font-pixel px-3 py-1.5 text-[0.55rem] ${
              filter === f.key ? "bg-ember text-ink" : "border border-edge text-muted-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
          {error}
        </p>
      )}

      {visibleQuests.length === 0 ? (
        <div className="pixel-panel mt-6 p-8 text-center text-muted-text">No quests here yet.</div>
      ) : (
        <ul className="mt-6 space-y-3">
          <AnimatePresence initial={false}>
            {visibleQuests.map((quest) => {
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

      <CreateQuestModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => router.refresh()} />
      <QuestForgeModal open={forgeOpen} onClose={() => setForgeOpen(false)} onAccepted={() => router.refresh()} />
    </div>
  );
}
