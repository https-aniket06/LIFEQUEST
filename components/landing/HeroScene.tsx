"use client";

import { motion } from "framer-motion";

/**
 * A small animated preview of the in-game HUD, built entirely from CSS/SVG
 * primitives — no external game assets, no copyrighted imagery. This is the
 * "one orchestrated moment" for the page: everything else on the landing
 * page is static.
 */
export function HeroScene() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="pixel-panel w-full max-w-sm p-5"
    >
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[0.6rem] text-aether">LV. 12</span>
        <span className="font-pixel text-[0.6rem] text-gold">485g</span>
      </div>

      <div className="mt-3 h-10 w-10 shrink-0 rounded-none border-2 border-edge bg-panel-2 text-2xl leading-none grid place-items-center">
        🧙
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-[0.65rem] text-muted-text">
          <span>XP</span>
          <span>1,240 / 1,600</span>
        </div>
        <div className="bar-track">
          <motion.div
            className="bar-fill-xp"
            initial={{ width: "0%" }}
            animate={{ width: "78%" }}
            transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {[
          { label: "Solve 2 coding problems", xp: 80 },
          { label: "Workout 30 minutes", xp: 70 },
          { label: "Read 20 pages", xp: 45 },
        ].map((quest, i) => (
          <motion.div
            key={quest.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.6 + i * 0.12 }}
            className="flex items-center justify-between border border-edge bg-panel-2 px-2.5 py-2 text-xs"
          >
            <span className="text-ink-text/90">{quest.label}</span>
            <span className="font-pixel text-[0.55rem] text-aether">+{quest.xp}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
