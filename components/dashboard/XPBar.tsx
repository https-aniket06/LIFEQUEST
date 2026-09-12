"use client";

import { motion } from "framer-motion";

export function XPBar({ progress, xpIntoLevel, xpToNextLevel }: { progress: number; xpIntoLevel: number; xpToNextLevel: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[0.65rem] text-muted-text">
        <span>XP</span>
        <span>
          {xpIntoLevel.toLocaleString()} / {xpToNextLevel.toLocaleString()}
        </span>
      </div>
      <div className="bar-track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Experience progress toward next level">
        <motion.div
          className="bar-fill-xp"
          animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
