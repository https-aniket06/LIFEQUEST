// LIFEQUEST — Supabase Database type
//
// This is hand-written to structurally match supabase/migrations/0001_init.sql
// so the app has type safety without requiring a live Supabase project during
// development. Once you've run `supabase link` against your real project,
// regenerate the authoritative version with:
//
//   supabase gen types typescript --linked > types/supabase.ts
//
// and re-apply the `Database` import in lib/supabase/client.ts and server.ts
// (no other code should need to change, since the shapes match).

import type {
  Profile,
  Character,
  Quest,
  QuestCompletion,
  Item,
  InventoryEntry,
  Achievement,
  UserAchievement,
  Transaction,
  DailyActivity,
} from "@/types/database";

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile>;
      characters: Row<Character>;
      quests: Row<Quest>;
      quest_completions: Row<QuestCompletion>;
      items: Row<Item>;
      inventory: Row<InventoryEntry>;
      achievements: Row<Achievement>;
      user_achievements: Row<UserAchievement>;
      transactions: Row<Transaction>;
      daily_activity: Row<DailyActivity>;
    };
    Functions: {
      complete_quest: {
        Args: {
          p_quest_id: string;
          p_xp: number;
          p_gold: number;
          p_attribute: string;
          p_attribute_points: number;
          p_day_key: string;
        };
        Returns: { new_total_xp: number; new_gold: number; new_streak: number }[];
      };
      purchase_item: {
        Args: { p_item_id: string };
        Returns: { new_gold: number }[];
      };
    };
  };
}
