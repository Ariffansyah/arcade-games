"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GAMES, moodLabel, seatLabel, type GameInfo } from "@/lib/games";
import { cleanName, saveName, storedName } from "@/lib/players";
import { CODE_LENGTH, cleanCode, isCode, newCode } from "@/lib/room";

type Filter = "all" | "co-op" | "versus";

const FILTERS: { id: Filter; label: string; hint: string }[] = [
  { id: "all", label: "Everything", hint: "Every cabinet on the floor" },
  { id: "co-op", label: "Together", hint: "Same side — nobody is beating anybody" },
  { id: "versus", label: "Head to head", hint: "Somebody wins these ones" },
];

function Cabinet({ game }: { game: GameInfo }) {
  return (
    <article className="cab flex items-start gap-4 rounded-md px-4 py-4">
      <span
        aria-hidden
        className="text-2xl text-emerald-500 drop-shadow-[0_0_10px_var(--color-emerald-500)]"
      >
        {game.art}
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="pixel text-[0.65rem] text-zinc-100">{game.name}</h3>
        <p className="font-sans text-sm text-zinc-400">{game.blurb}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className={`tag ${game.mood === "co-op" ? "tag-coop" : "tag-versus"}`}>
            {moodLabel(game)}
          </span>
          <span className="tag">{seatLabel(game)}</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const [nick, setNick] = useState(storedName);
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(
    () => (filter === "all" ? GAMES : GAMES.filter((g) => g.mood === filter)),
    [filter]
  );
  const together = GAMES.filter((g) => g.mood === "co-op").length;

  const remember = () => saveName(cleanName(nick));

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    remember();
    if (isCode(code)) router.push(`/room/${code}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-10 overflow-hidden px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-zinc-100">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />

      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(57,255,136,0.18),transparent)] blur-2xl" />

      <header className="relative flex flex-col items-center gap-3 pt-6 text-center">
        <span className="neon-cyan pixel text-[0.6rem] tracking-[0.35em]">
          {GAMES.length} cabinets · {together} you play together
        </span>
        <h1 className="marquee hum text-3xl sm:text-5xl">Web Arcade</h1>
        <p className="max-w-md text-balance text-zinc-400">
          {GAMES.length} mini-games behind one room code. No accounts, no installs — send the
          code and whoever shows up is playing.
        </p>
      </header>

      <form onSubmit={join} className="relative flex flex-col items-center gap-5">
        <div className="cab flex flex-col items-center gap-3 rounded-md px-6 py-6 sm:px-8">
          <label htmlFor="nick" className="text-[0.6rem] text-zinc-400">
            Your nickname
          </label>
          <input
            id="nick"
            value={nick}
            suppressHydrationWarning
            onChange={(e) => setNick(cleanName(e.target.value))}
            placeholder="pick a name"
            maxLength={16}
            autoComplete="nickname"
            className="w-52 bg-transparent text-center font-sans text-lg text-zinc-100 outline-none placeholder:text-zinc-700"
          />
          <span className="h-px w-40 bg-zinc-800" />

          <label htmlFor="code" className="mt-2 text-[0.6rem] text-zinc-400">
            Insert room code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            aria-describedby="code-help"
            placeholder="ABC123"
            className="neon-green w-56 bg-transparent py-2 text-center text-3xl tracking-[0.3em] outline-none placeholder:text-zinc-700"
          />
          <div aria-hidden className="flex gap-1">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-7 rounded-sm transition-colors ${
                  code.length > i
                    ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]"
                    : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          <span aria-hidden className="mt-1 h-1.5 w-16 rounded-full bg-zinc-950 shadow-[inset_0_1px_2px_#000]" />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="submit"
            disabled={!isCode(code)}
            className="btn-arcade rounded-sm px-5 py-3 disabled:opacity-40"
          >
            Join room
          </button>
          <button
            type="button"
            onClick={() => {
              remember();
              router.push(`/room/${newCode()}`);
            }}
            className="btn-ghost rounded-sm px-5 py-3"
          >
            New room
          </button>
        </div>
        <p id="code-help" className="max-w-sm text-balance text-center text-xs text-zinc-600">
          Codes are {CODE_LENGTH} characters. Start a new room and send the link — anyone with it
          lands beside you, and nobody else can find you by guessing.
        </p>
      </form>

      <section className="relative flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter games">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              title={f.hint}
              className={`btn-ghost rounded-sm px-4 py-2 text-[0.55rem] ${
                filter === f.id ? "border-emerald-500 text-emerald-400" : ""
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <h2 className="sr-only">Cabinets</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((g) => (
            <Cabinet key={g.id} game={g} />
          ))}
        </div>
      </section>

      <div className="ticker relative w-full max-w-3xl overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max gap-10 whitespace-nowrap pixel text-[0.55rem] text-zinc-600">
          {[0, 1].map((copy) => (
            <span key={copy} aria-hidden={copy === 1} className="flex gap-10">
              {GAMES.map((g) => (
                <span key={g.id}>
                  {g.art} {g.name} — {seatLabel(g)}
                </span>
              ))}
              <span className="neon-cyan">insert coin</span>
            </span>
          ))}
        </div>
      </div>

      <footer className="relative flex flex-col items-center gap-2 text-center text-[0.6rem] text-zinc-600">
        <Link href="/how-to-play" className="text-zinc-500 underline hover:text-zinc-300">
          How to play — every cabinet, every rule
        </Link>
        Rooms are not listed anywhere. Close the tab and the room is gone.
      </footer>
    </main>
  );
}
