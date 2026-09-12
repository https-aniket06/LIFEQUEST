"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Quest } from "@/types/database";

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "text-aether",
  NORMAL: "text-ink-text",
  HARD: "text-ember",
  EPIC: "text-gold",
};

interface QuestCardProps {
  quest: Quest;
  xpEstimate: number;
  goldEstimate: number;
  onComplete: (questId: string) => Promise<void>;
  onDelete: (questId: string) => void;
}

export function QuestCard({ quest, xpEstimate, goldEstimate, onComplete, onDelete }: QuestCardProps) {
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showReward, setShowReward] = useState(false);

  async function handleComplete() {
    if (completing || quest.status !== "ACTIVE") return;
    setCompleting(true);
    setShowReward(true);
    setJustCompleted(true);
    try {
      await onComplete(quest.id);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <motion.li
      layout
      className="pixel-panel pixel-panel-raised relative flex items-center justify-between gap-4 p-4"
    >
      <div className="min-w-0">
        <p className={`truncate text-sm ${justCompleted ? "text-muted-text line-through" : "text-ink-text"}`}>
          {quest.title}
        </p>
        <p className="mt-1 text-[0.65rem] text-muted-text">
          {quest.category} · <span className={DIFFICULTY_COLOR[quest.difficulty]}>{quest.difficulty}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-pixel text-[0.6rem] text-aether">+{xpEstimate}xp</span>

        {quest.status === "ACTIVE" ? (
          <button
            onClick={handleComplete}
            disabled={completing}
            aria-label={`Mark "${quest.title}" complete`}
            className="pixel-button !px-3 !py-2 text-[0.6rem]"
          >
            {completing ? "..." : "DONE"}
          </button>
        ) : (
          <span className="font-pixel text-[0.55rem] text-muted-text">✓</span>
        )}

        {quest.status === "ACTIVE" && (
          <button
            onClick={() => onDelete(quest.id)}
            aria-label={`Delete quest "${quest.title}"`}
            className="text-muted-text hover:text-vitality"
          >
            ✕
          </button>
        )}
      </div>

      <AnimatePresence onExitComplete={() => setShowReward(false)}>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            onAnimationComplete={() => setShowReward(false)}
            className="font-pixel pointer-events-none absolute right-4 top-0 text-[0.6rem] text-gold"
          >
            +{goldEstimate}g
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
