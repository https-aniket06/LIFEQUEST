"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { runQuestForge, acceptForgedQuest } from "@/actions/questForge";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import type { ForgedQuest } from "@/lib/ai/questForge";

export function QuestForgeModal({ open, onClose, onAccepted }: { open: boolean; onClose: () => void; onAccepted: () => void }) {
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] = useState<ForgedQuest[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const goalInputRef = useRef<HTMLInputElement>(null);

  // handleClose (defined below) resets form state in addition to calling
  // onClose, so Escape and the visible CLOSE button behave identically.
  useModalA11y(open, handleClose, goalInputRef);

  async function handleForge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuggestions([]);
    setAccepted(new Set());
    try {
      const result = await runQuestForge({ goal });
      if (!result.ok || !result.data) {
        setError(result.error ?? "The Quest Forge is unavailable right now.");
        return;
      }
      setSuggestions(result.data.quests);
    } catch {
      setError("Connection lost. Please try forging again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(index: number) {
    const quest = suggestions[index];
    try {
      const result = await acceptForgedQuest(quest);
      if (result.ok) {
        setAccepted((prev) => new Set(prev).add(index));
        onAccepted();
      } else {
        setError(result.error ?? "Couldn't add that quest.");
      }
    } catch {
      setError("Connection lost. That quest wasn't added — please try again.");
    }
  }

  function handleClose() {
    setGoal("");
    setSuggestions([]);
    setAccepted(new Set());
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center bg-ink/80 px-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="AI Quest Forge"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="pixel-panel max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
          >
            <h2 className="font-pixel text-sm text-ember">AI QUEST FORGE</h2>
            <p className="mt-2 text-sm text-muted-text">
              Describe a goal in plain language. It'll come back as a few concrete quests you can accept.
            </p>

            <form onSubmit={handleForge} className="mt-4 flex gap-2">
              <label htmlFor="forge-goal" className="sr-only">
                Your goal
              </label>
              <input
                id="forge-goal"
                ref={goalInputRef}
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="I want to get better at programming"
                className="min-w-0 flex-1 border-2 border-edge bg-panel-2 px-3 py-2 text-ink-text outline-none focus-visible:border-aether"
              />
              <button type="submit" disabled={loading} className="pixel-button shrink-0 !px-4 text-[0.6rem]">
                {loading ? "..." : "FORGE"}
              </button>
            </form>

            {error && (
              <p role="alert" className="mt-4 border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
                {error}
              </p>
            )}

            {suggestions.length > 0 && (
              <ul className="mt-5 space-y-3">
                {suggestions.map((quest, i) => (
                  <li key={i} className="pixel-panel pixel-panel-raised flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-text">{quest.title}</p>
                      <p className="mt-1 text-xs text-muted-text">{quest.description}</p>
                      <p className="mt-2 font-pixel text-[0.55rem] text-aether">
                        {quest.category} · {quest.difficulty} · +{quest.xpEstimate}xp +{quest.goldEstimate}g
                      </p>
                    </div>
                    <button
                      onClick={() => handleAccept(i)}
                      disabled={accepted.has(i)}
                      className="pixel-button shrink-0 !px-3 !py-2 text-[0.55rem]"
                    >
                      {accepted.has(i) ? "ADDED" : "ACCEPT"}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button onClick={handleClose} className="pixel-button-secondary mt-6 w-full">
              CLOSE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
