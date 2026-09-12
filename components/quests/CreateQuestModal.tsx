"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createQuest } from "@/actions/quests";
import { calculateQuestReward } from "@/lib/rpg/rewards";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import type { QuestCategory, QuestDifficulty } from "@/types/database";

const CATEGORIES: QuestCategory[] = ["KNOWLEDGE", "FITNESS", "DISCIPLINE", "CREATIVITY", "WELLNESS"];
const DIFFICULTIES: QuestDifficulty[] = ["EASY", "NORMAL", "HARD", "EPIC"];

export function CreateQuestModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<QuestCategory>("KNOWLEDGE");
  const [difficulty, setDifficulty] = useState<QuestDifficulty>("NORMAL");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useModalA11y(open, onClose, titleInputRef);

  // This is a PREVIEW only — the authoritative reward is recalculated
  // server-side by the exact same function at completion time.
  const preview = useMemo(() => calculateQuestReward(difficulty, category), [difficulty, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await createQuest({ title, category, difficulty, repeatFrequency: "NONE" });
      if (!result.ok) {
        setError(result.error ?? "Couldn't create that quest.");
        return;
      }
      setTitle("");
      onCreated();
      onClose();
    } catch {
      setError("Connection lost. That quest wasn't created — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center bg-ink/80 px-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Create a new quest"
        >
          <motion.form
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="pixel-panel w-full max-w-md space-y-4 p-6"
          >
            <h2 className="font-pixel text-sm text-ink-text">NEW QUEST</h2>

            <div>
              <label htmlFor="quest-title" className="mb-1 block text-xs text-muted-text">
                What are you doing?
              </label>
              <input
                id="quest-title"
                ref={titleInputRef}
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study Java for 2 hours"
                className="w-full border-2 border-edge bg-panel-2 px-3 py-2 text-ink-text outline-none focus-visible:border-aether"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="quest-category" className="mb-1 block text-xs text-muted-text">
                  Category
                </label>
                <select
                  id="quest-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as QuestCategory)}
                  className="w-full border-2 border-edge bg-panel-2 px-2 py-2 text-sm text-ink-text outline-none focus-visible:border-aether"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quest-difficulty" className="mb-1 block text-xs text-muted-text">
                  Difficulty
                </label>
                <select
                  id="quest-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as QuestDifficulty)}
                  className="w-full border-2 border-edge bg-panel-2 px-2 py-2 text-sm text-ink-text outline-none focus-visible:border-aether"
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-2 border-edge bg-panel-2 px-3 py-2 text-xs">
              <span className="text-muted-text">Reward</span>
              <span className="font-pixel text-aether">
                +{preview.xp}xp <span className="text-gold">+{preview.gold}g</span>
              </span>
            </div>

            {error && (
              <p role="alert" className="border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="pixel-button-secondary flex-1">
                CANCEL
              </button>
              <button type="submit" disabled={pending} className="pixel-button flex-1">
                {pending ? "..." : "CREATE"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
