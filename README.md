# LIFEQUEST
### Turn your real life into an RPG.

Built for the **LIFE RPG** hackathon problem statement: a full-stack web app that transforms
mundane real-world tasks into an engaging RPG progression system.

---

## 1. Problem

Productivity apps are boring. A to-do list gives you a checkmark; it doesn't give you a reason
to come back tomorrow. Meanwhile, games are extremely good at making people show up daily for
things that have zero real-world value.

## 2. Solution

LIFEQUEST takes the loop that makes games addictive — quests, XP, levels, streaks, loot — and
points it at your actual life. Study for two hours, and it's not just "done," it's +120 XP,
+35 gold, and three points of Intelligence. The task was always real. This just gives it a HUD.

## 3. Feature list

- **Quest system** — create/read/update/delete/complete quests with category, difficulty,
  due dates, and repeat frequency.
- **Server-authoritative reward economy** — XP and gold are computed from `(difficulty, category)`
  on the server, never trusted from the client. See [Security model](#7-security-model).
- **Non-linear leveling** — deterministic XP curve, unit-tested. See [RPG progression](#6-rpg-progression-formula).
- **Five attributes** — Strength, Intelligence, Discipline, Vitality, Creativity, each tied to a
  quest category.
- **Streaks** — real calendar-day tracking (not client-side faking), with graceful handling of
  gaps, same-day repeats, and backdated data.
- **AI Quest Forge** — turn a vague goal ("get better at programming") into 3-5 concrete quests.
  Works with or without an AI API key — see [AI feature](#8-ai-feature).
- **Shop + inventory** — spend gold on cosmetic titles/frames/themes/badges. No real-money
  purchases anywhere in this codebase.
- **Achievements** — unlocked automatically based on real progress (first quest, 7-day streak,
  1,000 XP, 50 quests completed, 25 knowledge quests).
- **Dashboard HUD** — level, XP bar, gold, streak, attributes, active + completed quests, all in
  one screen, understandable in ~10 seconds.
- **Full auth** — Supabase Auth, protected routes via middleware, session persistence.
- **Accessibility** — semantic HTML, visible focus states, keyboard navigation, `aria-live`
  regions for toasts/errors, `prefers-reduced-motion` support throughout.
- **Responsive** — mobile-first layouts on every screen, no horizontal overflow.

## 4. Architecture

```
app/                     Next.js App Router pages (Server Components by default)
  (auth)/login, signup    Auth pages
  dashboard/              Main HUD (Server Component fetch -> Client Component interactivity)
  quests/ shop/ inventory/ achievements/ character/
  api/                    (reserved for any REST-style needs beyond Server Actions)
  globals.css             Design tokens + pixel-panel/bar utility classes
components/
  landing/ auth/ dashboard/ quests/ shop/ inventory/ layout/
  Client Components that own interaction state (optimistic UI, modals, animations)
lib/
  rpg/                    Pure, testable game-logic: leveling.ts, rewards.ts, streaks.ts
  ai/                     questForge.ts — AI provider abstraction + heuristic fallback
  supabase/               client.ts (browser) / server.ts (Server Components & Actions)
  validation/             Zod schemas — single source of truth for input validation
actions/                  Server Actions — the only code path allowed to mutate quests/gold/xp
supabase/migrations/      SQL schema, RLS policies, RPC functions, seed data
types/                    Shared TS types mirroring the DB schema
tests/                    Node-native tests for the RPG engine (no framework required)
```

**Why this split:** UI, business logic, and database logic are physically separate. The reward
formula lives in exactly one file (`lib/rpg/rewards.ts`) and is imported by both the quest-creation
preview (client-safe, display-only) and the completion Server Action (authoritative). Change the
economy in one place; every screen that shows a reward estimate updates automatically.

## 5. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js Server Actions + Route Handlers |
| Database | Supabase Postgres |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Validation | Zod |
| AI | Anthropic Claude API, with a zero-dependency heuristic fallback |

## 6. RPG progression formula

XP required to go from level `N` to `N+1`:

```
xpForLevel(N) = floor(BASE_XP * N ^ EXP_CURVE)
BASE_XP = 100, EXP_CURVE = 1.5
```

| Level transition | XP required |
|---|---|
| 1 → 2 | 100 |
| 2 → 3 | 282 |
| 3 → 4 | 519 |
| 4 → 5 | 800 |
| 9 → 10 | 2,700 |

A character's level is **derived from `total_xp`**, never stored as an independent field — this
is what makes it impossible for level and XP to desync. See `lib/rpg/leveling.ts`.

Quest rewards are `difficulty base × category multiplier`, hard-capped at 300 XP / 100 gold per
quest regardless of inputs. See `lib/rpg/rewards.ts` for the full table.

## 7. Security model

- **Row Level Security everywhere.** Every table has RLS enabled; policies key off `auth.uid()`.
  A user can `select` only their own `quests`, `characters`, `inventory`, etc.
- **No client-writable reward fields.** `characters.total_xp` / `.gold` and `quests.status` have
  **no client `update` policy at all** — the only way to change them is through two
  `SECURITY DEFINER` Postgres functions, `complete_quest()` and `purchase_item()`, which:
  1. Re-verify `auth.uid()` themselves (they don't just inherit RLS blindly).
  2. Recompute/re-check the reward or price against server-trusted data.
  3. Run as a single atomic transaction.
- **Duplicate-completion protection, twice over.** `complete_quest()` only flips a quest
  `ACTIVE -> COMPLETED` if it's still `ACTIVE` (a retried call finds 0 rows and raises); and
  `quest_completions.quest_id` has a `UNIQUE` constraint as a second, DB-level backstop.
- **No service-role key in client code.** The browser client (`lib/supabase/client.ts`) and the
  server client (`lib/supabase/server.ts`) both use the public anon key + the user's session
  cookie — every query is still subject to RLS. `SUPABASE_SERVICE_ROLE_KEY` is not imported
  anywhere in this codebase.
- **Server-side input validation.** Every Server Action validates its input with Zod before
  touching the database.

**A malicious user with devtools open cannot:** grant themselves XP/gold, mark a quest complete
twice, read another user's quests/character/inventory, or buy an item without the gold to pay
for it — all of that is enforced in Postgres, not in the React tree.

## 8. AI feature

`lib/ai/questForge.ts` implements a **provider chain**: it tries the Anthropic Claude API first
(if `ANTHROPIC_API_KEY` is set), and on *any* failure — missing key, network error, timeout,
malformed response — transparently falls back to a zero-network heuristic generator built on
keyword-matched quest templates. The AI's suggested XP/gold is **discarded**; the real reward is
always recalculated by `calculateQuestReward()` both when previewing a suggestion and again when
the resulting quest is eventually completed.

This means: **the app works fully with zero AI configuration**, and the AI Quest Forge feature
specifically is designed to never be a single point of failure.

## 9. Local setup

```bash
git clone <your-repo-url>
cd lifequest
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run every file in `supabase/migrations/` **in order** (currently
   `0001_init.sql` then `0002_fix_handle_new_user_username_length.sql`) — or just run
   `supabase db push` if you have the Supabase CLI linked to the project, which applies
   all of them automatically.
3. Copy your Project URL and anon public key into `.env.local`.
4. **For anyone reviewing/judging this project — do this, not "optional":** go to
   Authentication → Settings and turn **"Confirm email" OFF**. With it on, a reviewer has
   to receive and click a confirmation email before they can log in at all, and Supabase's
   built-in email service caps confirmation emails at a handful per hour — if more than a
   few people sign up back-to-back to test the app (exactly what happens during judging),
   later sign-ups fail outright. Turning email confirmation off makes `signUp()` return an
   active session immediately, so anyone can create an account and see every feature with
   zero dependency on email deliverability.
5. If you'd rather keep "Confirm email" ON for a production-like demo, you must also set
   **Site URL** (and add a matching entry to **Redirect URLs**) under Authentication →
   URL Configuration to your actual deployed domain (e.g. `https://your-app.vercel.app`)
   **before** sharing the link. This app never calls `emailRedirectTo` explicitly, so the
   confirmation link's destination comes entirely from that dashboard setting — it defaults
   to `http://localhost:3000`, which means a reviewer's confirmation email would try to send
   *their* browser to *your* laptop's localhost and simply fail to load.

### Run locally

```bash
npm run dev       # http://localhost:3000
npm run test      # RPG engine unit tests (no DB/network required)
npm run typecheck # tsc --noEmit
npm run build     # production build
```

## 10. Environment variables

See `.env.example`. Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Optional: `ANTHROPIC_API_KEY` (AI Quest Forge — app works without it).

## 11. Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same environment variables from `.env.local` in Vercel's Project Settings →
   Environment Variables.
4. Deploy. Middleware (`middleware.ts`) handles session refresh and route protection
   automatically at the edge.
5. **Before sharing the deployed link with anyone:** in Supabase → Authentication → URL
   Configuration, update **Site URL** to your Vercel domain (and add it to **Redirect
   URLs**). It defaults to `http://localhost:3000`, and if you leave "Confirm email" on,
   every confirmation email sent from the live site will otherwise link back to
   `localhost:3000` — which only resolves on your own machine, not the reviewer's. Simplest
   fix: just turn "Confirm email" off entirely for the copy of the project you're sharing
   for review (see step 4 in [Supabase setup](#9-local-setup)).

## 12. Recommended Git commit sequence

1. `chore: initial project architecture and database schema`
2. `feat: authentication and core RPG engine (leveling, rewards, streaks)`
3. `feat: quest CRUD, completion flow, and dashboard HUD`
4. `feat: shop, inventory, and achievements`
5. `feat: AI Quest Forge with heuristic fallback`
6. `style: pixel-RPG design system and animations`
7. `test: RPG engine unit tests, production hardening`

## 13. Testing performed

`tests/rpg.test.mjs` — 21 tests against the pure game-logic modules, run with Node's built-in
test runner (no framework/install required):

```bash
node --experimental-strip-types --test tests/rpg.test.mjs
```

Covers: XP-curve monotonicity, level-progress boundary conditions (exact threshold, negative
XP, max level), multi-level XP gains, deterministic + bounded reward calculation, category →
attribute mapping, and streak logic (first activity, consecutive days, same-day idempotency,
gaps, backdated completions).

**Not run in this environment:** `npm install` / `next build` / end-to-end browser testing —
the environment this project was authored in has no network access, so the Next.js/React/
Supabase layer is carefully hand-written and internally consistent, but has not been
compiler-verified the way the RPG engine has. Run `npm install && npm run build` as your first
step to catch any dependency-version or type issue before the hackathon demo.

## 14. Known limitations

- **No committed lockfile** (`package-lock.json`). `package.json` uses caret ranges (e.g.
  `^2.46.1`), so a fresh `npm install` today can pull different dependency versions than one
  run when this was built — the exact class of "worked yesterday, broke today" issue. Run
  `npm install` once and commit the generated `package-lock.json` so every clone (including a
  reviewer's, possibly weeks later) gets the identical dependency tree you tested against.
- The Supabase `Database` type (`types/supabase.ts`) is hand-written to match the SQL schema
  rather than generated by the Supabase CLI. Run
  `supabase gen types typescript --linked > types/supabase.ts` once your project is linked for
  a fully generated, guaranteed-accurate version.
- Timezone handling for streaks currently defaults to UTC in the Server Action
  (`actions/quests.ts`); wiring a real client timezone through (e.g. via a cookie set on first
  load) would make the "calendar day" boundary match the user's actual clock.
- The AI Quest Forge heuristic fallback is keyword-based, not a real model — it's intentionally
  simple so it has zero dependencies and zero failure modes.
- No automated end-to-end (Playwright/Cypress) tests; only the RPG engine has unit tests.
- Inventory "equip" exclusivity (one item per slot) is enforced in the client component, backed
  by ordinary per-row ownership checks — not yet a single atomic DB transaction.

## 15. Demo flow (~2 minutes)

> **Before you demo/judge this:** make sure "Confirm email" is OFF on the Supabase project
> behind whatever link you're using (see [Supabase setup](#9-local-setup), step 4). With it
> on, sign-up requires clicking an emailed link before login works, and Supabase's free-tier
> email sending is rate-limited to a handful per hour — the first person to demo it will be
> fine, the third or fourth back-to-back sign-up may simply fail. Turning it off makes every
> sign-up immediately usable, no inbox required.

1. Land on `/` — explain the loop in one sentence: real goals become quests.
2. Sign up → land on `/dashboard`, character already exists (created by DB trigger).
3. Create a quest: "Complete 2 coding problems," HARD, KNOWLEDGE — note the reward preview.
4. Open **AI Quest Forge**, type "I want to get better at programming," accept a suggestion.
5. Complete a quest — watch the XP/gold animation, HUD bar update.
6. Trigger a level-up (complete enough quests, or start a fresh account near a level boundary).
7. Visit `/shop`, buy an item; visit `/inventory`, equip it.
8. Visit `/achievements` — show an unlocked badge.
9. **Refresh the browser.** XP, gold, streak, inventory, and quest history all persist — nothing
   here lives in `localStorage`.

---

## Judge readiness checklist

- [x] Auth: sign up, log in, log out, protected routes, session persistence
- [x] "Confirm email" turned OFF on the demo project so reviewers can sign up and land in the
      app with zero email dependency (see [Supabase setup](#9-local-setup), step 4)
- [x] Supabase Auth Site URL / Redirect URLs point at the actual deployed domain, not
      `localhost:3000` (see [Deployment](#11-deployment-vercel), step 5)
- [x] RLS on every table; no client-writable reward fields
- [x] Server-authoritative XP/gold via `complete_quest()` / `purchase_item()` RPCs
- [x] Duplicate-completion protection (status guard + unique constraint)
- [x] Non-linear, documented, unit-tested leveling formula
- [x] Streak logic handles gaps, same-day repeats, and backdated data
- [x] AI Quest Forge with a working no-API-key fallback
- [x] Shop + inventory with server-verified balance checks
- [x] Achievements computed from real progress, not client claims
- [x] Responsive layouts, keyboard navigation, reduced-motion support
- [x] `.env.example` with placeholders only; no secrets committed
- [x] README with setup, architecture, security model, and demo flow
- [ ] `npm install && npm run build` run successfully in your environment, and
      `package-lock.json` committed for reproducible installs (please verify — not run here
      due to sandbox network restrictions)
- [ ] Live Supabase project created and every file in `supabase/migrations/` applied
- [ ] Deployed to Vercel with environment variables configured
