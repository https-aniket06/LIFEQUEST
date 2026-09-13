// LIFEQUEST — Supabase Database type

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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      characters: {
        Row: Character;
        Insert: Partial<Character>;
        Update: Partial<Character>;
        Relationships: [];
      };
      quests: {
        Row: Quest;
        Insert: Partial<Quest>;
        Update: Partial<Quest>;
        Relationships: [];
      };
      quest_completions: {
        Row: QuestCompletion;
        Insert: Partial<QuestCompletion>;
        Update: Partial<QuestCompletion>;
        Relationships: [];
      };
      items: {
        Row: Item;
        Insert: Partial<Item>;
        Update: Partial<Item>;
        Relationships: [];
      };
      inventory: {
        Row: InventoryEntry;
        Insert: Partial<InventoryEntry>;
        Update: Partial<InventoryEntry>;
        Relationships: [];
      };
      achievements: {
        Row: Achievement;
        Insert: Partial<Achievement>;
        Update: Partial<Achievement>;
        Relationships: [];
      };
      user_achievements: {
        Row: UserAchievement;
        Insert: Partial<UserAchievement>;
        Update: Partial<UserAchievement>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: Partial<Transaction>;
        Update: Partial<Transaction>;
        Relationships: [];
      };
      daily_activity: {
        Row: DailyActivity;
        Insert: Partial<DailyActivity>;
        Update: Partial<DailyActivity>;
        Relationships: [];
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
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
    Enums: {
      [key: string]: unknown;
    };
    CompositeTypes: {
      [key: string]: unknown;
    };
  };
};
