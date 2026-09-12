// LIFEQUEST — Shared domain types
// These mirror supabase/migrations/0001_init.sql exactly. If you change the
// schema, update this file in the same commit.

export type QuestCategory = "KNOWLEDGE" | "FITNESS" | "DISCIPLINE" | "CREATIVITY" | "WELLNESS";
export type QuestDifficulty = "EASY" | "NORMAL" | "HARD" | "EPIC";
export type QuestStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type RepeatFrequency = "NONE" | "DAILY" | "WEEKLY";
export type ItemRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type TransactionType = "QUEST_REWARD" | "SHOP_PURCHASE" | "DAILY_QUEST" | "ACHIEVEMENT_BONUS";

export interface Profile {
  id: string; // == auth.users.id
  username: string;
  display_name: string;
  avatar_emoji: string;
  created_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  total_xp: number; // source of truth for level — see lib/rpg/leveling.ts
  gold: number;
  strength: number;
  intelligence: number;
  discipline: number;
  vitality: number;
  creativity: number;
  current_streak: number;
  longest_streak: number;
  last_active_day: string | null; // YYYY-MM-DD
  equipped_title: string | null;
  equipped_frame: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  repeat_frequency: RepeatFrequency;
  due_date: string | null;
  status: QuestStatus;
  source: "USER" | "AI_FORGE" | "DAILY";
  created_at: string;
  completed_at: string | null;
}

export interface QuestCompletion {
  id: string;
  quest_id: string;
  user_id: string;
  xp_awarded: number;
  gold_awarded: number;
  attribute: keyof Pick<Character, "strength" | "intelligence" | "discipline" | "vitality" | "creativity">;
  attribute_points_awarded: number;
  completed_at: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  price_gold: number;
  slot: "TITLE" | "FRAME" | "THEME" | "BADGE";
  icon_glyph: string; // short unicode/emoji glyph used for the pixel-icon render
}

export interface InventoryEntry {
  id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  equipped: boolean;
  acquired_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_glyph: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  gold_delta: number;
  xp_delta: number;
  reference_id: string | null; // quest_id / item_id / achievement_id
  created_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD in the user's timezone
  quests_completed: number;
}

/** Full character state as rendered on the dashboard, joined server-side. */
export interface CharacterSummary extends Character {
  profile: Profile;
}
