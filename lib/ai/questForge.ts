import { calculateQuestReward } from "@/lib/rpg/rewards";
import type { QuestCategory, QuestDifficulty } from "@/types/database";

export interface ForgedQuest {
  title: string;
  description: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  estimatedMinutes: number;
  xpEstimate: number;
  goldEstimate: number;
}

export interface QuestForgeProvider {
  name: string;
  forge(goal: string): Promise<Omit<ForgedQuest, "xpEstimate" | "goldEstimate">[]>;
}

// -----------------------------------------------------------------------------
// Provider 1: Anthropic (Claude), used when ANTHROPIC_API_KEY is configured.
// -----------------------------------------------------------------------------
class AnthropicQuestForgeProvider implements QuestForgeProvider {
  name = "anthropic";

  async forge(goal: string): Promise<Omit<ForgedQuest, "xpEstimate" | "goldEstimate">[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const system = `You turn a vague personal goal into 3-5 concrete daily quests for an RPG-style
productivity app. Respond ONLY with a raw JSON array (no markdown fences, no prose) of objects
shaped exactly like:
{"title": string (max 80 chars), "description": string (max 200 chars),
 "category": "KNOWLEDGE"|"FITNESS"|"DISCIPLINE"|"CREATIVITY"|"WELLNESS",
 "difficulty": "EASY"|"NORMAL"|"HARD"|"EPIC", "estimatedMinutes": number}
Quests must be small, concrete, and completable in a single sitting.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: `Goal: ${goal}` }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text: string = data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) throw new Error("AI response was not a JSON array");

    return parsed.slice(0, 5).map((q) => normalizeForgedQuest(q));
  }
}

// -----------------------------------------------------------------------------
// Provider 2: Heuristic fallback. Runs with ZERO external dependencies and
// ZERO network calls, so the AI Quest Forge feature — and the app as a
// whole — keeps working even with no API key configured, or if the AI
// provider is down/rate-limited/times out. This is a hard product
// requirement, not an afterthought.
// -----------------------------------------------------------------------------
const KEYWORD_RULES: { pattern: RegExp; category: QuestCategory; template: (goal: string) => ForgedQuestDraft[] }[] = [
  {
    pattern: /(code|coding|program|develop|software|javascript|python|java\b|algorithm|leetcode|dsa)/i,
    category: "KNOWLEDGE",
    template: (goal) => [
      draft("Solve 2 coding problems", `Warm up toward: ${trim(goal)}`, "KNOWLEDGE", "NORMAL", 30),
      draft("Study one core concept for 30 minutes", `Pick a topic that supports: ${trim(goal)}`, "KNOWLEDGE", "NORMAL", 30),
      draft("Build a small function or script", "Apply what you just studied in real code.", "KNOWLEDGE", "HARD", 45),
      draft("Review yesterday's code", "Read it back with fresh eyes and note one improvement.", "KNOWLEDGE", "EASY", 15),
    ],
  },
  {
    pattern: /(gym|workout|fitness|run|exercise|lift|strength|cardio)/i,
    category: "FITNESS",
    template: (goal) => [
      draft("Complete a 30-minute workout", `Toward: ${trim(goal)}`, "FITNESS", "NORMAL", 30),
      draft("Go for a 20-minute walk or jog", "Easy movement day — consistency over intensity.", "FITNESS", "EASY", 20),
      draft("Stretch or mobility work", "10 minutes of stretching to protect the streak.", "FITNESS", "EASY", 10),
    ],
  },
  {
    pattern: /(read|book|pages|chapter)/i,
    category: "KNOWLEDGE",
    template: (goal) => [
      draft("Read 20 pages", `Progress on: ${trim(goal)}`, "KNOWLEDGE", "EASY", 25),
      draft("Summarize what you read in 3 sentences", "Locks in the material — write it in your own words.", "KNOWLEDGE", "EASY", 10),
    ],
  },
  {
    pattern: /(write|writing|blog|novel|story|journal)/i,
    category: "CREATIVITY",
    template: (goal) => [
      draft("Write for 25 minutes, no editing", `Toward: ${trim(goal)}`, "CREATIVITY", "NORMAL", 25),
      draft("Edit yesterday's draft", "One clean pass — cut anything that doesn't earn its place.", "CREATIVITY", "EASY", 15),
    ],
  },
  {
    pattern: /(meditat|mindful|calm|anxiety|sleep|discipline|habit)/i,
    category: "DISCIPLINE",
    template: () => [
      draft("Meditate for 10 minutes", "A short, focused sit — no app required.", "DISCIPLINE", "EASY", 10),
      draft("Plan tomorrow before bed", "Three priorities, written down, five minutes tops.", "DISCIPLINE", "EASY", 5),
    ],
  },
  {
    pattern: /(water|hydrat|diet|eat|nutrition|health)/i,
    category: "WELLNESS",
    template: () => [
      draft("Drink 8 glasses of water today", "Track it as you go.", "WELLNESS", "EASY", 5),
      draft("Prep one healthy meal", "Cook instead of ordering, just once today.", "WELLNESS", "NORMAL", 30),
    ],
  },
];

type QuestForgeDraft = Omit<ForgedQuest, "xpEstimate" | "goldEstimate">;
type ForgedQuestDraft = QuestForgeDraft;

function draft(
  title: string,
  description: string,
  category: QuestCategory,
  difficulty: QuestDifficulty,
  estimatedMinutes: number
): ForgedQuestDraft {
  return { title, description, category, difficulty, estimatedMinutes };
}

function trim(s: string): string {
  return s.length > 60 ? s.slice(0, 57) + "..." : s;
}

class HeuristicQuestForgeProvider implements QuestForgeProvider {
  name = "heuristic-fallback";

  async forge(goal: string): Promise<QuestForgeDraft[]> {
    const matched = KEYWORD_RULES.filter((rule) => rule.pattern.test(goal));

    if (matched.length > 0) {
      return matched.flatMap((rule) => rule.template(goal)).slice(0, 5);
    }

    // Generic fallback for goals that don't match any keyword rule — still
    // useful, never a dead end.
    return [
      draft(`Spend 25 minutes on: ${trim(goal)}`, "A focused first step toward this goal.", "DISCIPLINE", "NORMAL", 25),
      draft("Write down 3 concrete next actions", `Break "${trim(goal)}" into smaller, doable pieces.`, "DISCIPLINE", "EASY", 10),
      draft("Reflect on today's progress", "Two sentences: what worked, what didn't.", "DISCIPLINE", "EASY", 5),
    ];
  }
}

/**
 * The AI response is untrusted external input with a genuinely unknown
 * shape until validated, which is why `unknown` (not a domain type) is
 * correct here — every field is checked and coerced before use.
 */
function normalizeForgedQuest(raw: unknown): QuestForgeDraft {
  const validCategories: QuestCategory[] = ["KNOWLEDGE", "FITNESS", "DISCIPLINE", "CREATIVITY", "WELLNESS"];
  const validDifficulties: QuestDifficulty[] = ["EASY", "NORMAL", "HARD", "EPIC"];

  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const category = validCategories.includes(obj.category as QuestCategory) ? (obj.category as QuestCategory) : "DISCIPLINE";
  const difficulty = validDifficulties.includes(obj.difficulty as QuestDifficulty)
    ? (obj.difficulty as QuestDifficulty)
    : "NORMAL";
  const estimatedMinutes = typeof obj.estimatedMinutes === "number" && Number.isFinite(obj.estimatedMinutes)
    ? Math.max(5, Math.min(180, obj.estimatedMinutes))
    : 20;

  return {
    title: String(obj.title ?? "Untitled quest").slice(0, 80),
    description: String(obj.description ?? "").slice(0, 200),
    category,
    difficulty,
    estimatedMinutes,
  };
}

/**
 * Public entry point. Tries the configured AI provider first; on ANY
 * failure (missing key, network error, malformed response, timeout) it
 * transparently falls back to the heuristic provider so the feature — and
 * the app — never breaks. XP/Gold are always computed here server-side via
 * calculateQuestReward, never trusted from the AI's output.
 */
export async function forgeQuests(goal: string): Promise<{ quests: ForgedQuest[]; provider: string }> {
  const providers: QuestForgeProvider[] = [new AnthropicQuestForgeProvider(), new HeuristicQuestForgeProvider()];

  for (const provider of providers) {
    try {
      const drafts = await withTimeout(provider.forge(goal), 8000);
      const quests = drafts.map((d) => ({
        ...d,
        ...(() => {
          const reward = calculateQuestReward(d.difficulty, d.category);
          return { xpEstimate: reward.xp, goldEstimate: reward.gold };
        })(),
      }));
      return { quests, provider: provider.name };
    } catch {
      continue; // fall through to the next provider
    }
  }

  // Should be unreachable — the heuristic provider never throws — but keep
  // a hard-safe empty return rather than ever letting this function reject.
  return { quests: [], provider: "none" };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}
