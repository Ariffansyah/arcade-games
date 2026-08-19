import Link from "next/link";
import type { Metadata } from "next";
import { GAMES, isTogether, moodLabel, seatLabel } from "@/lib/games";
import { HOWTO } from "@/lib/howto";
import {
  BUTTON_RULES,
  COLUMNS,
  DIFFICULTY as BOMB_DIFFICULTY,
  GLYPHS,
  MEMORY_STEPS,
  STRIP_DIGIT,
  WIRE_RULES,
  WORDS,
  stepText,
  type Difficulty as BombDifficulty,
} from "@/lib/bomb.ts";
import {
  DIFFICULTY as MAYDAY_DIFFICULTY,
  LAMPS,
  LEVER,
  SWITCHES,
  type Difficulty as MaydayDifficulty,
} from "@/lib/mayday.ts";

export const metadata: Metadata = {
  title: "How to play — Web Arcade",
  description: `Rules for all ${GAMES.length} cabinets: what wins, how a round runs, and the manuals for the two games you have to talk your way through.`,
};

export default function HowToPlay() {
  const together = GAMES.filter(isTogether);
  const versus = GAMES.filter((g) => !isTogether(g));

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-10 overflow-hidden px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-zinc-100">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />

      <header className="relative flex max-w-2xl flex-col items-center gap-3 pt-6 text-center">
        <span className="neon-cyan pixel text-[0.6rem] tracking-[0.35em]">
          {GAMES.length} cabinets · every rule
        </span>
        <h1 className="marquee hum text-3xl sm:text-4xl">How to play</h1>
        <p className="text-balance text-zinc-400">
          One room code, no accounts. Someone opens a room, everybody else types the six-letter
          code, and the first person in is the host — they pick the cabinet and start the rounds.
        </p>
        <Link href="/" className="btn-ghost rounded-sm px-4 py-2 text-sm">
          Back to the arcade
        </Link>
      </header>

      <nav className="relative flex w-full max-w-3xl flex-wrap justify-center gap-2">
        {GAMES.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className="cab rounded-sm px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100"
          >
            {g.art} {g.name}
          </a>
        ))}
      </nav>

      <Section
        title="Together"
        blurb="Nobody is beating anybody. The room either gets there or it does not."
        games={together}
      />
      <Section
        title="Head to head"
        blurb="Somebody wins these."
        games={versus}
      />

      <BombManual />
      <MaydayPanel />

      <footer className="relative pb-4 text-center text-[0.6rem] text-zinc-600">
        Rooms are not listed anywhere. Close the tab and the room is gone.
      </footer>
    </main>
  );
}

function Section({
  title,
  blurb,
  games,
}: {
  title: string;
  blurb: string;
  games: typeof GAMES;
}) {
  return (
    <section className="relative flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="pixel text-[0.7rem] text-[color:var(--neon-amber)]">{title}</h2>
        <p className="text-xs text-zinc-600">{blurb}</p>
      </div>
      {games.map((g) => {
        const guide = HOWTO[g.id];
        return (
          <article key={g.id} id={g.id} className="cab flex flex-col gap-4 rounded-md p-5">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl text-zinc-300" aria-hidden>
                {g.art}
              </span>
              <h3 className="text-xl text-zinc-100">{g.name}</h3>
              <span className="pixel text-[0.5rem] text-zinc-600">
                {seatLabel(g)} · {moodLabel(g)}
              </span>
            </header>

            <p className="text-sm text-zinc-300">{guide.goal}</p>

            <div className="flex flex-col gap-1">
              <h4 className="pixel text-[0.5rem] text-zinc-500">A round</h4>
              <ol className="flex flex-col gap-1 text-sm text-zinc-400">
                {guide.round.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600">{i + 1}.</span>
                    {line}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="pixel text-[0.5rem] text-zinc-500">Scoring</h4>
              <p className="text-sm text-zinc-400">{guide.scoring}</p>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="pixel text-[0.5rem] text-zinc-500">Worth knowing</h4>
              <ul className="flex flex-col gap-1 text-sm text-zinc-400">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {g.id === "bomb" && (
              <a href="#bomb-manual" className="text-xs text-[color:var(--neon-amber)]">
                Read the full defusal manual ↓
              </a>
            )}
            {g.id === "mayday" && (
              <a href="#mayday-panel" className="text-xs text-[color:var(--neon-amber)]">
                See the cockpit and what the checklist can ask ↓
              </a>
            )}
          </article>
        );
      })}
    </section>
  );
}

function BombManual() {
  return (
    <section id="bomb-manual" className="relative flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="pixel text-[0.7rem] text-[color:var(--neon-amber)]">
          Bomb Squad — the manual
        </h2>
        <p className="text-xs text-zinc-600">
          This is the same text the defusers get in game. The holder never sees any of it.
        </p>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Settings</h3>
        <ul className="flex flex-col gap-1 text-sm text-zinc-400">
          {(Object.keys(BOMB_DIFFICULTY) as BombDifficulty[]).map((d) => {
            const spec = BOMB_DIFFICULTY[d];
            return (
              <li key={d}>
                <span className="text-zinc-200">{spec.label}</span> — {spec.modules} modules (
                {spec.kinds.join(", ")}), {spec.fuse / 1000}s fuse,{" "}
                {spec.strikes} strike{spec.strikes === 1 ? "" : "s"}.
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-zinc-600">
          Every third round adds another module and every round takes five seconds off the fuse,
          down to a floor of 45.
        </p>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Wires</h3>
        <p className="text-xs text-zinc-600">
          Read in order; the first rule that fits is the answer. A cut wire stops counting, so the
          whole list is re-read after every cut.
        </p>
        <ol className="flex flex-col gap-1 text-sm text-zinc-300">
          {WIRE_RULES.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600">{i + 1}.</span>
              {rule}
            </li>
          ))}
        </ol>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Keypad</h3>
        <p className="text-xs text-zinc-600">
          Exactly one column holds all four of the holder&apos;s symbols. Find it, then press them
          top to bottom in that column&apos;s order.
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          {COLUMNS.map((column, c) => (
            <ol key={c} className="flex flex-col gap-1 text-center">
              <li className="pixel text-[0.45rem] text-zinc-600">col {c + 1}</li>
              {column.map((g) => (
                <li key={g} className="text-lg text-zinc-300" title={GLYPHS[g]}>
                  {g} <span className="text-[0.6rem] text-zinc-600">{GLYPHS[g]}</span>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Button</h3>
        <ol className="flex flex-col gap-1 text-sm text-zinc-300">
          {BUTTON_RULES.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600">{i + 1}.</span>
              {rule}
            </li>
          ))}
        </ol>
        <p className="text-xs text-zinc-600">
          Holding lights a coloured strip. Let go when that digit is anywhere on the countdown.
        </p>
        <ul className="flex flex-wrap gap-x-4 text-sm text-zinc-400">
          {Object.entries(STRIP_DIGIT).map(([strip, digit]) => (
            <li key={strip}>
              {strip} strip → release on a {digit}
            </li>
          ))}
        </ul>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Memory</h3>
        <p className="text-xs text-zinc-600">
          Five stages. Positions are left to right; the labels move every stage, so write down
          what you pressed. A strike wipes the panel back to stage one.
        </p>
        <div className="flex flex-col gap-2">
          {MEMORY_STEPS.map((stage, s) => (
            <div key={s} className="grid grid-cols-[auto_1fr] gap-2 text-xs">
              <span className="pixel text-[0.5rem] text-zinc-500">S{s + 1}</span>
              <ul className="flex flex-col gap-0.5 text-zinc-400">
                {stage.map((step, d) => (
                  <li key={d}>
                    <span className="text-zinc-600">display {d + 1}:</span> {stepText(step)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Password</h3>
        <p className="text-xs text-zinc-600">
          Five spinners, six letters each, and exactly one word below can be spelled on them. Ask
          what a spinner can reach and cross words off — spinner one usually cuts hardest.
        </p>
        <ul className="grid grid-cols-4 gap-x-3 gap-y-1 font-mono text-xs text-zinc-400 sm:grid-cols-6">
          {WORDS.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MaydayPanel() {
  return (
    <section id="mayday-panel" className="relative flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="pixel text-[0.7rem] text-[color:var(--neon-amber)]">
          Mayday — the panel and the book
        </h2>
        <p className="text-xs text-zinc-600">
          The checklist itself is generated fresh every run. What is fixed is the aeroplane it
          talks about.
        </p>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">Settings</h3>
        <ul className="flex flex-col gap-1 text-sm text-zinc-400">
          {(Object.keys(MAYDAY_DIFFICULTY) as MaydayDifficulty[]).map((d) => {
            const spec = MAYDAY_DIFFICULTY[d];
            return (
              <li key={d}>
                <span className="text-zinc-200">{spec.label}</span> — {spec.steps} steps from{" "}
                {spec.altitude.toLocaleString()} ft, sinking {spec.sink} ft/s, and{" "}
                {spec.hit.toLocaleString()} ft per mistake.
              </li>
            );
          })}
        </ul>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">What the pilot can see</h3>
        <ul className="flex flex-col gap-1 text-sm text-zinc-400">
          <li>
            <span className="text-zinc-200">Instruments</span> — fuel, airspeed and heading. Fixed
            for the whole run.
          </li>
          <li>
            <span className="text-zinc-200">Lamps</span> — {LAMPS.join(", ")}. Lit or dark, also
            fixed for the run.
          </li>
          <li>
            <span className="text-zinc-200">Switches</span> — {SWITCHES.join(", ")}. These move as
            you work, and the checklist can ask about them.
          </li>
          <li>
            <span className="text-zinc-200">Flap lever</span> — {LEVER.join(", ")}.
          </li>
        </ul>
      </div>

      <div className="manual flex flex-col gap-3 p-5">
        <h3 className="pixel text-[0.55rem] text-zinc-400">What a step can ask</h3>
        <p className="text-xs text-zinc-600">
          Every step reads <span className="text-zinc-400">If … , do this. Otherwise do that.</span>{" "}
          The condition is always one of these five:
        </p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-400">
          <li>fuel is below a number</li>
          <li>airspeed is above a number</li>
          <li>a named lamp is lit</li>
          <li>the heading is 180 or more</li>
          <li>a named switch is on — the only one that can change mid-run</li>
        </ul>
        <p className="text-xs text-zinc-600">
          The action is either flipping one named switch or setting the flap lever to one detent.
          Flips toggle, so the same instruction twice does not mean the same thing twice.
        </p>
      </div>
    </section>
  );
}
