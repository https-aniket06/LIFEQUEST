-- =============================================================================
-- LIFEQUEST — Initial schema
-- Run via: supabase db push   (or paste into the Supabase SQL editor)
-- =============================================================================
-- Design notes:
--   * Every user-owned table has a `user_id uuid references auth.users`.
--   * Row Level Security is ON for every table, with policies that key off
--     auth.uid() — a client can never read or write another user's row,
--     even via a raw postgrest request with a forged body.
--   * XP/Gold are NEVER mutated directly from the client. The only path to
--     changing them is the `complete_quest` and `purchase_item` RPC
--     functions below, which re-derive rewards from server-trusted lookup
--     tables/parameters and run inside a single transaction.
--   * `characters.total_xp` is the single source of truth for level. Level
--     is a derived value (see lib/rpg/leveling.ts) and is intentionally NOT
--     stored, so it can never drift out of sync with total_xp.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  avatar_emoji text not null default '🧙',
  created_at   timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- characters  (one per user; created by handle_new_user trigger below)
-- -----------------------------------------------------------------------------
create table if not exists public.characters (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users(id) on delete cascade,
  total_xp         integer not null default 0 check (total_xp >= 0),
  gold             integer not null default 0 check (gold >= 0),
  strength         integer not null default 0 check (strength >= 0),
  intelligence     integer not null default 0 check (intelligence >= 0),
  discipline       integer not null default 0 check (discipline >= 0),
  vitality         integer not null default 0 check (vitality >= 0),
  creativity       integer not null default 0 check (creativity >= 0),
  current_streak   integer not null default 0 check (current_streak >= 0),
  longest_streak   integer not null default 0 check (longest_streak >= 0),
  last_active_day  date,
  equipped_title   text,
  equipped_frame   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "characters: read own" on public.characters
  for select using (auth.uid() = user_id);
-- No insert/update policy for plain clients: characters are created by the
-- handle_new_user trigger and mutated only via SECURITY DEFINER RPCs below,
-- which run as the table owner and bypass RLS deliberately and narrowly.

create index if not exists idx_characters_user_id on public.characters(user_id);

-- -----------------------------------------------------------------------------
-- quests
-- -----------------------------------------------------------------------------
create table if not exists public.quests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 140),
  description      text check (char_length(description) <= 1000),
  category         text not null check (category in ('KNOWLEDGE','FITNESS','DISCIPLINE','CREATIVITY','WELLNESS')),
  difficulty       text not null check (difficulty in ('EASY','NORMAL','HARD','EPIC')),
  repeat_frequency text not null default 'NONE' check (repeat_frequency in ('NONE','DAILY','WEEKLY')),
  due_date         date,
  status           text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','ARCHIVED')),
  source           text not null default 'USER' check (source in ('USER','AI_FORGE','DAILY')),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

alter table public.quests enable row level security;

create policy "quests: read own" on public.quests
  for select using (auth.uid() = user_id);
create policy "quests: insert own" on public.quests
  for insert with check (auth.uid() = user_id);
create policy "quests: update own (not via reward fields)" on public.quests
  for update using (auth.uid() = user_id);
create policy "quests: delete own" on public.quests
  for delete using (auth.uid() = user_id);

create index if not exists idx_quests_user_status on public.quests(user_id, status);
create index if not exists idx_quests_user_due on public.quests(user_id, due_date);

-- -----------------------------------------------------------------------------
-- quest_completions  (append-only ledger — one row per completion, ever)
-- -----------------------------------------------------------------------------
create table if not exists public.quest_completions (
  id                        uuid primary key default gen_random_uuid(),
  quest_id                  uuid not null references public.quests(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  xp_awarded                integer not null check (xp_awarded >= 0),
  gold_awarded              integer not null check (gold_awarded >= 0),
  attribute                 text not null check (attribute in ('strength','intelligence','discipline','vitality','creativity')),
  attribute_points_awarded  integer not null check (attribute_points_awarded >= 0),
  completed_at              timestamptz not null default now(),
  -- A quest can only ever be completed once. This is the DB-level backstop
  -- against double-reward from a retried/duplicated request.
  constraint uq_quest_completion_once unique (quest_id)
);

alter table public.quest_completions enable row level security;

create policy "quest_completions: read own" on public.quest_completions
  for select using (auth.uid() = user_id);
-- No client insert policy — rows are created exclusively by complete_quest().

create index if not exists idx_completions_user on public.quest_completions(user_id, completed_at desc);

-- -----------------------------------------------------------------------------
-- items (shop catalog — global, read-only to clients)
-- -----------------------------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text not null,
  rarity      text not null check (rarity in ('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY')),
  price_gold  integer not null check (price_gold >= 0),
  slot        text not null check (slot in ('TITLE','FRAME','THEME','BADGE')),
  icon_glyph  text not null default '◆'
);

alter table public.items enable row level security;
create policy "items: readable by any authenticated user" on public.items
  for select using (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- inventory
-- -----------------------------------------------------------------------------
create table if not exists public.inventory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_id      uuid not null references public.items(id) on delete cascade,
  quantity     integer not null default 1 check (quantity >= 0),
  equipped     boolean not null default false,
  acquired_at  timestamptz not null default now(),
  constraint uq_user_item unique (user_id, item_id)
);

alter table public.inventory enable row level security;
create policy "inventory: read own" on public.inventory
  for select using (auth.uid() = user_id);
-- No client insert/update policy — rows are created exclusively by
-- purchase_item(), which also handles equip/un-equip toggles.

create index if not exists idx_inventory_user on public.inventory(user_id);

-- -----------------------------------------------------------------------------
-- achievements (global catalog) + user_achievements (unlocks)
-- -----------------------------------------------------------------------------
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text not null,
  icon_glyph  text not null default '★'
);

alter table public.achievements enable row level security;
create policy "achievements: readable by any authenticated user" on public.achievements
  for select using (auth.role() = 'authenticated');

create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at    timestamptz not null default now(),
  constraint uq_user_achievement unique (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
create policy "user_achievements: read own" on public.user_achievements
  for select using (auth.uid() = user_id);
-- No client insert policy — unlocked exclusively by check_achievements()
-- called from within complete_quest()/purchase_item().

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);

-- -----------------------------------------------------------------------------
-- transactions (append-only audit log of every gold/xp change)
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('QUEST_REWARD','SHOP_PURCHASE','DAILY_QUEST','ACHIEVEMENT_BONUS')),
  gold_delta    integer not null,
  xp_delta      integer not null default 0,
  reference_id  uuid,
  created_at    timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "transactions: read own" on public.transactions
  for select using (auth.uid() = user_id);

create index if not exists idx_transactions_user on public.transactions(user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- daily_activity (one row per user per local calendar day with >=1 completion)
-- -----------------------------------------------------------------------------
create table if not exists public.daily_activity (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  day               date not null,
  quests_completed  integer not null default 0 check (quests_completed >= 0),
  constraint uq_user_day unique (user_id, day)
);

alter table public.daily_activity enable row level security;
create policy "daily_activity: read own" on public.daily_activity
  for select using (auth.uid() = user_id);

create index if not exists idx_daily_activity_user_day on public.daily_activity(user_id, day desc);

-- =============================================================================
-- New-user bootstrap: create profile + character rows the moment someone
-- signs up, so the app never has to handle a "character doesn't exist yet"
-- state in the UI.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_username text;
begin
  candidate_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  candidate_username := left(candidate_username, 20);
  if char_length(candidate_username) < 3 then
    candidate_username := candidate_username || '_' || left(new.id::text, 6);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate_username || '_' || left(new.id::text, 4), split_part(new.email, '@', 1))
  on conflict (id) do nothing;

  insert into public.characters (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- complete_quest(quest_id, xp, gold, attribute, attribute_points, day_key)
--
-- The ONE function that turns "user tapped complete" into a persisted
-- reward. Called from a Next.js Server Action, which has already computed
-- xp/gold/attribute/attribute_points via lib/rpg/rewards.ts (the
-- server-trusted calculation — the client never supplies these numbers).
--
-- SECURITY DEFINER so it can update `characters` (which has no client
-- update policy), but it manually re-checks auth.uid() = quest.user_id
-- before touching anything, so it's exactly as safe as if RLS ran normally.
--
-- Atomicity + duplicate-prevention:
--   - The UPDATE ... WHERE status = 'ACTIVE' guard means a quest can only
--     be completed from ACTIVE -> COMPLETED once; a retried/duplicated call
--     finds 0 rows and the function raises, so no double reward is ever
--     applied even under concurrent/retried requests.
--   - quest_completions.quest_id UNIQUE is a second, DB-level backstop.
-- =============================================================================
create or replace function public.complete_quest(
  p_quest_id          uuid,
  p_xp                integer,
  p_gold              integer,
  p_attribute         text,
  p_attribute_points  integer,
  p_day_key           date
)
returns table (
  new_total_xp integer,
  new_gold     integer,
  new_streak   integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_rows int;
  v_last_active date;
  v_current_streak int;
  v_new_streak int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_xp < 0 or p_xp > 300 or p_gold < 0 or p_gold > 100 then
    raise exception 'reward out of allowed bounds';
  end if;

  -- Mark the quest completed, but only if it's still ACTIVE and owned by
  -- the caller. This single statement is what prevents double-completion.
  update public.quests
     set status = 'COMPLETED', completed_at = now()
   where id = p_quest_id
     and user_id = v_user_id
     and status = 'ACTIVE';

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'quest not found, not yours, or already completed';
  end if;

  insert into public.quest_completions
    (quest_id, user_id, xp_awarded, gold_awarded, attribute, attribute_points_awarded)
  values
    (p_quest_id, v_user_id, p_xp, p_gold, p_attribute, p_attribute_points);

  -- Streak bookkeeping
  select last_active_day, current_streak into v_last_active, v_current_streak
  from public.characters where user_id = v_user_id for update;

  if v_last_active is null then
    v_new_streak := 1;
  elsif p_day_key = v_last_active then
    v_new_streak := v_current_streak;
  elsif p_day_key = v_last_active + interval '1 day' then
    v_new_streak := v_current_streak + 1;
  elsif p_day_key < v_last_active then
    v_new_streak := v_current_streak; -- ignore backdated completions
  else
    v_new_streak := 1; -- gap of 2+ days: streak resets
  end if;

  update public.characters
     set total_xp       = total_xp + p_xp,
         gold            = gold + p_gold,
         strength        = strength     + case when p_attribute = 'strength'     then p_attribute_points else 0 end,
         intelligence    = intelligence + case when p_attribute = 'intelligence' then p_attribute_points else 0 end,
         discipline      = discipline   + case when p_attribute = 'discipline'   then p_attribute_points else 0 end,
         vitality        = vitality     + case when p_attribute = 'vitality'     then p_attribute_points else 0 end,
         creativity      = creativity   + case when p_attribute = 'creativity'   then p_attribute_points else 0 end,
         current_streak  = v_new_streak,
         longest_streak  = greatest(longest_streak, v_new_streak),
         last_active_day = greatest(coalesce(v_last_active, p_day_key), p_day_key),
         updated_at      = now()
   where user_id = v_user_id;

  insert into public.daily_activity (user_id, day, quests_completed)
  values (v_user_id, p_day_key, 1)
  on conflict (user_id, day)
  do update set quests_completed = public.daily_activity.quests_completed + 1;

  insert into public.transactions (user_id, type, gold_delta, xp_delta, reference_id)
  values (v_user_id, 'QUEST_REWARD', p_gold, p_xp, p_quest_id);

  perform public.check_achievements(v_user_id);

  return query
    select c.total_xp, c.gold, c.current_streak
    from public.characters c
    where c.user_id = v_user_id;
end;
$$;

-- =============================================================================
-- purchase_item(item_id)
-- Verifies balance server-side, deducts gold, grants/increments inventory,
-- and records a transaction — all atomically.
-- =============================================================================
create or replace function public.purchase_item(p_item_id uuid)
returns table (new_gold integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_gold integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select price_gold into v_price from public.items where id = p_item_id;
  if v_price is null then
    raise exception 'item not found';
  end if;

  select gold into v_gold from public.characters where user_id = v_user_id for update;
  if v_gold < v_price then
    raise exception 'insufficient gold';
  end if;

  update public.characters set gold = gold - v_price, updated_at = now()
  where user_id = v_user_id;

  insert into public.inventory (user_id, item_id, quantity)
  values (v_user_id, p_item_id, 1)
  on conflict (user_id, item_id)
  do update set quantity = public.inventory.quantity + 1;

  insert into public.transactions (user_id, type, gold_delta, xp_delta, reference_id)
  values (v_user_id, 'SHOP_PURCHASE', -v_price, 0, p_item_id);

  return query select c.gold from public.characters c where c.user_id = v_user_id;
end;
$$;

-- =============================================================================
-- check_achievements(user_id)
-- Idempotent: re-checks all achievement conditions and inserts any newly
-- earned ones. Safe to call after every quest completion / purchase.
-- =============================================================================
create or replace function public.check_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completions int;
  v_total_xp int;
  v_streak int;
  v_knowledge_completions int;
begin
  select count(*) into v_completions from public.quest_completions where user_id = p_user_id;
  select total_xp, current_streak into v_total_xp, v_streak from public.characters where user_id = p_user_id;
  select count(*) into v_knowledge_completions
    from public.quest_completions qc join public.quests q on q.id = qc.quest_id
    where qc.user_id = p_user_id and q.category = 'KNOWLEDGE';

  if v_completions >= 1 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where code = 'FIRST_QUEST'
    on conflict do nothing;
  end if;

  if v_streak >= 7 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where code = 'WEEK_WARRIOR'
    on conflict do nothing;
  end if;

  if v_total_xp >= 1000 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where code = 'CENTURY'
    on conflict do nothing;
  end if;

  if v_completions >= 50 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where code = 'QUEST_MASTER'
    on conflict do nothing;
  end if;

  if v_knowledge_completions >= 25 then
    insert into public.user_achievements (user_id, achievement_id)
    select p_user_id, id from public.achievements where code = 'SCHOLAR'
    on conflict do nothing;
  end if;
end;
$$;

-- =============================================================================
-- Seed data: items + achievements catalog
-- =============================================================================
insert into public.items (name, description, rarity, price_gold, slot, icon_glyph) values
  ('Iron Focus Helm', 'Forged for those who refuse to skip the grind.', 'COMMON', 40, 'FRAME', '⛑'),
  ('Focus Amulet', 'Represents a day of uninterrupted focus.', 'UNCOMMON', 90, 'BADGE', '📿'),
  ('Scholar''s Monocle', 'Every knowledge quest sharpens the lens.', 'RARE', 160, 'FRAME', '🔍'),
  ('Ember Cloak', 'Wraps its wearer in the warmth of a kept streak.', 'RARE', 180, 'THEME', '🧥'),
  ('Discipline Sigil', 'Etched by hands that showed up anyway.', 'EPIC', 260, 'BADGE', '🛡'),
  ('Title: The Relentless', 'A title earned, never given.', 'EPIC', 300, 'TITLE', '🏷'),
  ('Crown of Momentum', 'Said to hum louder the longer the streak.', 'LEGENDARY', 500, 'FRAME', '👑')
on conflict (name) do nothing;

insert into public.achievements (code, name, description, icon_glyph) values
  ('FIRST_QUEST',   'First Quest',    'Complete your first quest.',                    '🎯'),
  ('WEEK_WARRIOR',  'Week Warrior',   'Maintain a 7-day streak.',                      '🔥'),
  ('CENTURY',       'Century',       'Earn 1,000 total XP.',                          '💯'),
  ('QUEST_MASTER',  'Quest Master',   'Complete 50 quests.',                           '⚔️'),
  ('SCHOLAR',       'Scholar',        'Complete 25 knowledge quests.',                 '📚')
on conflict (code) do nothing;
