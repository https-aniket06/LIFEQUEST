"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { purchaseItem } from "@/actions/shop";
import type { Item } from "@/types/database";

const RARITY_COLOR: Record<string, string> = {
  COMMON: "text-muted-text",
  UNCOMMON: "text-aether",
  RARE: "text-ember",
  EPIC: "text-gold",
  LEGENDARY: "text-vitality",
};

export function ShopClient({ items, ownedItemIds, initialGold }: { items: Item[]; ownedItemIds: Set<string>; initialGold: number }) {
  const router = useRouter();
  const [gold, setGold] = useState(initialGold);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  async function handlePurchase(item: Item) {
    if (pendingId) return;
    setError(null);
    setPendingId(item.id);

    const previousGold = gold;
    setGold((g) => g - item.price_gold); // optimistic

    try {
      const result = await purchaseItem({ itemId: item.id });
      setPendingId(null);

      if (!result.ok || !result.data) {
        setGold(previousGold); // rollback
        setError(result.error ?? "Purchase failed.");
        setTimeout(() => setError(null), 3500);
        return;
      }

      setGold(result.data.newGold); // reconcile with server truth
      setJustBought(item.id);
      setTimeout(() => setJustBought(null), 1200);
      router.refresh();
    } catch {
      setPendingId(null);
      setGold(previousGold); // rollback — never show an ungranted purchase
      setError("Connection lost. That purchase didn't go through — please try again.");
      setTimeout(() => setError(null), 3500);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-pixel text-sm text-ink-text">SHOP</h1>
        <p className="font-pixel text-sm text-gold">{gold.toLocaleString()}g</p>
      </div>

      {error && (
        <p role="alert" className="mt-4 border-2 border-vitality bg-vitality/10 px-3 py-2 text-sm text-vitality">
          {error}
        </p>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const owned = ownedItemIds.has(item.id);
          const affordable = gold >= item.price_gold;
          return (
            <li key={item.id} className={`pixel-panel p-5 ${justBought === item.id ? "animate-pop-in" : ""}`}>
              <div className="flex items-start justify-between">
                <span className="text-3xl leading-none">{item.icon_glyph}</span>
                <span className={`font-pixel text-[0.55rem] ${RARITY_COLOR[item.rarity]}`}>{item.rarity}</span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-ink-text">{item.name}</h2>
              <p className="mt-1 text-xs text-muted-text">{item.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-pixel text-xs text-gold">{item.price_gold}g</span>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={owned || !affordable || pendingId === item.id}
                  className="pixel-button !px-3 !py-2 text-[0.55rem]"
                >
                  {owned ? "OWNED" : pendingId === item.id ? "..." : affordable ? "BUY" : "LOCKED"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
