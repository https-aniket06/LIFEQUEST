import Link from "next/link";
import { HeroScene } from "@/components/landing/HeroScene";

const LOOP_STEPS = [
  { title: "Set a real quest", body: "Study, train, build, read, rest — name the thing you're actually trying to do." },
  { title: "Complete it in real life", body: "Not a checkbox for its own sake. The quest exists because the task does." },
  { title: "Your character grows", body: "XP, gold, and attributes update instantly, tied to the category of what you did." },
  { title: "Momentum compounds", body: "Streaks, achievements, and levels track a story that's actually true about you." },
];

const FEATURES = [
  { title: "AI Quest Forge", body: "Hand it a vague goal — \"get better at programming\" — and it hands back concrete, sized quests." },
  { title: "Five attributes", body: "Strength, Intelligence, Discipline, Vitality, Creativity — each grows from a different kind of quest." },
  { title: "A real shop", body: "Spend gold on titles, frames, and cosmetics. Nothing here costs real money." },
  { title: "Achievements", body: "Unlock milestones for streaks, XP totals, and mastery — reasons to look back, not just forward." },
];

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-20 pt-16 md:flex-row md:items-center md:gap-8 md:pt-24">
        <div className="max-w-xl text-center md:text-left">
          <h1 className="font-pixel text-3xl leading-tight text-ink-text sm:text-4xl">
            TURN YOUR LIFE
            <br />
            INTO AN RPG.
          </h1>
          <p className="mt-6 text-lg text-muted-text">
            LIFEQUEST turns the things you already need to do — study, train, build, read — into quests
            with real XP, gold, and character progression. Your effort was always the game. This just
            shows you the HUD.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link href="/signup" className="pixel-button text-center">
              START YOUR QUEST
            </Link>
            <Link href="/login" className="pixel-button-secondary text-center">
              ENTER THE WORLD
            </Link>
          </div>
        </div>

        <div className="flex w-full justify-center md:w-auto">
          <HeroScene />
        </div>
      </section>

      <section className="border-y border-edge bg-panel/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-pixel text-lg text-aether">THE LOOP</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOOP_STEPS.map((step, i) => (
              <div key={step.title} className="pixel-panel p-5">
                <span className="font-pixel text-xs text-ember">{i + 1}</span>
                <h3 className="mt-3 text-base font-semibold text-ink-text">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-text">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-pixel text-lg text-ink-text">WHAT'S IN THE WORLD</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="pixel-panel pixel-panel-raised p-6">
              <h3 className="text-lg font-semibold text-ink-text">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-text">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="pixel-panel p-10">
          <h2 className="font-pixel text-xl text-ink-text">READY TO BEGIN?</h2>
          <p className="mt-4 text-muted-text">
            Create a character. It takes about thirty seconds, and it's free.
          </p>
          <Link href="/signup" className="pixel-button mt-6 inline-block">
            START YOUR QUEST
          </Link>
        </div>
      </section>

      <footer className="border-t border-edge px-6 py-8 text-center text-xs text-muted-text">
        <p>LIFEQUEST — built for a hackathon. Not a real economy. Please still drink water.</p>
      </footer>
    </main>
  );
}
