"use client";

import { useRoom } from "@/lib/useRoom";
import BlindMaze from "@/components/games/BlindMaze";
import DoodleGuess from "@/components/games/DoodleGuess";
import Battleships from "@/components/games/Battleships";

export const GAMES = [
  {
    id: "doodle",
    name: "Machine Doodle",
    blurb: "An AI draws, you both guess.",
    art: "✎",
    component: DoodleGuess,
  },
  {
    id: "maze",
    name: "Blind Maze Escape",
    blurb: "P1 moves blind, P2 sees the maze.",
    art: "⌘",
    component: BlindMaze,
  },
  {
    id: "ships",
    name: "Battleships",
    blurb: "Hidden fleets, blind shots.",
    art: "⚓",
    component: Battleships,
  },
] as const;

export default function Lobby({ code }: { code: string }) {
  const { players, me, slot, game, setGame } = useRoom(code);
  const ready = players.length >= 2;

  const current = GAMES.find((g) => g.id === game);
  if (current) {
    const Game = current.component;
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-4 text-zinc-100 sm:p-6">
        <div className="cab flex w-full max-w-3xl items-center justify-between gap-3 rounded-md px-4 py-2">
          <button onClick={() => setGame(null)} className="text-[0.6rem] text-zinc-400 hover:text-emerald-400">
            &larr; Menu
          </button>
          <span className="neon-cyan pixel text-[0.6rem]">{current.name}</span>
          <span className="pixel text-[0.6rem] text-zinc-400">P{slot || "?"}</span>
        </div>
        <Game code={code} slot={slot} />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 overflow-hidden p-4 text-zinc-100 sm:p-6">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/3" />

      <header className="relative flex flex-col items-center gap-2 pt-4 text-center">
        <span className="pixel text-[0.55rem] tracking-[0.3em] text-zinc-500">Room code</span>
        <h1 className="marquee text-2xl tracking-[0.2em] sm:text-3xl">{code}</h1>
        <span className="text-zinc-400">
          {slot ? `You are Player ${slot}` : "Room full — spectating"}
        </span>
      </header>

      <ul className="relative grid grid-cols-2 gap-3">
        {[0, 1].map((i) => {
          const p = players[i];
          return (
            <li
              key={i}
              className={`cab rounded-md p-4 text-center ${p ? "cab-hot" : "text-zinc-600"}`}
            >
              <div className={`pixel text-[0.6rem] ${p ? "neon-green" : "text-zinc-600"}`}>
                Player {i + 1}
              </div>
              <div className={`mt-2 truncate ${p ? "text-zinc-200" : "blink text-zinc-500"}`}>
                {p ? `${p.name}${p.id === me.id ? " (you)" : ""}` : "insert coin"}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="relative flex flex-col gap-3">
        <h2 className={`text-center text-[0.6rem] ${ready ? "neon-cyan" : "blink text-zinc-500"}`}>
          {ready ? "◄ Select game ►" : "Waiting for Player 2…"}
        </h2>
        {GAMES.map((g) => (
          <button
            key={g.id}
            disabled={!ready}
            onClick={() => setGame(g.id)}
            className="cab group flex items-center gap-4 rounded-md px-4 py-4 text-left normal-case enabled:hover:border-emerald-600 disabled:opacity-40"
          >
            <span className="text-xl text-emerald-500 drop-shadow-[0_0_8px_var(--color-emerald-500)]">
              {g.art}
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="pixel text-[0.65rem] text-zinc-100">{g.name}</span>
              <span className="font-sans text-zinc-400 normal-case">{g.blurb}</span>
            </span>
            <span className="pixel text-[0.6rem] text-zinc-700 group-hover:text-emerald-400">
              ▶
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
