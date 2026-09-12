"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useModalA11y } from "@/lib/utils/useModalA11y";

export function LevelUpModal({ newLevel, onClose }: { newLevel: number | null; onClose: () => void }) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  useModalA11y(newLevel !== null, onClose, continueButtonRef);

  return (
    <AnimatePresence>
      {newLevel !== null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Level up! You reached level ${newLevel}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="pixel-panel mx-6 max-w-sm p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-pixel text-xs text-gold">LEVEL UP!</p>
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="font-pixel mt-4 text-4xl text-aether"
            >
              {newLevel}
            </motion.p>
            <p className="mt-4 text-sm text-muted-text">Your character grows stronger.</p>
            <button ref={continueButtonRef} onClick={onClose} className="pixel-button mt-6 w-full">
              CONTINUE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
