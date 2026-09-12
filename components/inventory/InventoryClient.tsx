"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleEquipped } from "@/actions/shop";
import type { Item, InventoryEntry } from "@/types/database";

export interface InventoryRow extends InventoryEntry {
  item: Item;
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "text-muted-text",
  UNCOMMON: "text-aether",
  RARE: "text-ember",
  EPIC: "text-gold",
  LEGENDARY: "text-vitality",
};

export function InventoryClient({ rows }: { rows: InventoryRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(row: InventoryRow) {
    setPendingId(row.id);
    setError(null);

    try {
      // Enforce one-equipped-per-slot client-side by un-equipping any other
      // item in the same slot first. Each call is still independently
      // verified/ownership-checked server-side.
      const sameSlotEquipped = rows.filter((r) => r.item.slot === row.item.slot && r.equipped && r.id !== row.id);
      for (const other of sameSlotEquipped) {
        await toggleEquipped(other.id, false);
      }
      await toggleEquipped(row.id, !row.equipped);
      router.refresh();
    } catch {
      setError("Connection lost. Please try again.");
      setTimeout(() => setError(null), 3500);
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="pixel-panel p-8 text-center text-muted-text">
        Nothing in your inventory yet — visit the shop to gear up.
      </div>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
          {error}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-3">
        {rows.map((row) => (
        <li key={row.id} className={`pixel-panel p-4 ${row.equipped ? "border-aether" : ""}`}>
          <div className="flex items-start justify-between">
            <span className="text-3xl leading-none">{row.item.icon_glyph}</span>
            <span className={`font-pixel text-[0.5rem] ${RARITY_COLOR[row.item.rarity]}`}>{row.item.rarity}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-ink-text">{row.item.name}</h3>
          <p className="mt-1 text-[0.65rem] text-muted-text">
            {row.item.slot} {row.quantity > 1 ? `· x${row.quantity}` : ""}
          </p>
          <button
            onClick={() => handleToggle(row)}
            disabled={pendingId === row.id}
            className={row.equipped ? "pixel-button mt-3 w-full !py-2 text-[0.55rem]" : "pixel-button-secondary mt-3 w-full !py-2 text-[0.55rem]"}
          >
            {pendingId === row.id ? "..." : row.equipped ? "EQUIPPED" : "EQUIP"}
          </button>
        </li>
        ))}
      </ul>
    </>
  );
}
