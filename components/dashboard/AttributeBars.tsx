"use client";

import { motion } from "framer-motion";

const ATTRIBUTES: { key: "strength" | "intelligence" | "discipline" | "vitality" | "creativity"; label: string }[] = [
  { key: "strength", label: "STR" },
  { key: "intelligence", label: "INT" },
  { key: "discipline", label: "DIS" },
  { key: "vitality", label: "VIT" },
  { key: "creativity", label: "CRE" },
];

// Attributes have no hard cap, so the bar shows progress toward a rolling
// "next milestone" of 50 points, purely for a satisfying visual — the
// underlying number (shown alongside) is the real value.
const MILESTONE = 50;

export function AttributeBars({ attributes }: { attributes: Record<string, number> }) {
  return (
    <div className="space-y-2">
      {ATTRIBUTES.map(({ key, label }) => {
        const value = attributes[key] ?? 0;
        const within = value % MILESTONE;
        const pct = (within / MILESTONE) * 100;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="font-pixel w-8 text-[0.55rem] text-muted-text">{label}</span>
            <div className="bar-track flex-1">
              <motion.div
                className="bar-fill-xp"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="w-8 text-right text-xs text-ink-text">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
