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
    component: DoodleGuess,
  },
  {
    id: "maze",
    name: "Blind Maze Escape",
    blurb: "P1 moves blind, P2 sees the maze.",
    component: BlindMaze,
  },
  {
    id: "ships",
    name: "Battleships",
    blurb: "Hidden fleets, blind shots.",
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
      <main className="flex min-h-screen flex-col items-center gap-6 bg-zinc-950 p-4 text-zinc-100 sm:p-6">
        <div className="flex w-full max-w-3xl items-baseline justify-between">
          <button onClick={() => setGame(null)} className="text-sm text-zinc-400 hover:text-zinc-100">
            &larr; Back to menu
          </button>
          <span className="text-sm text-zinc-500">
            {current.name} · Player {slot || "?"}
          </span>
        </div>
        <Game code={code} slot={slot} />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-zinc-950 p-4 text-zinc-100 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">
          Room <span className="tracking-[0.3em] text-emerald-400">{code}</span>
        </h1>
        <span className="text-sm text-zinc-400">
          {slot ? `You are Player ${slot}` : "Room full — spectating"}
        </span>
      </header>

      <ul className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => {
          const p = players[i];
          return (
            <li
              key={i}
              className={`rounded-lg p-4 ring-1 ${
                p ? "bg-zinc-900 ring-emerald-700" : "ring-dashed ring-zinc-800 text-zinc-600"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-zinc-500">Player {i + 1}</div>
              <div>{p ? `${p.name}${p.id === me.id ? " (you)" : ""}` : "waiting…"}</div>
            </li>
          );
        })}
      </ul>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm uppercase tracking-wide text-zinc-500">
          {ready ? "Pick a game" : "Waiting for Player 2…"}
        </h2>
        {GAMES.map((g) => (
          <button
            key={g.id}
            disabled={!ready}
            onClick={() => setGame(g.id)}
            className="flex flex-col gap-1 rounded-lg bg-zinc-900 px-4 py-3 text-left ring-1 ring-zinc-800 enabled:hover:ring-emerald-600 disabled:opacity-40 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <span className="font-medium">{g.name}</span>
            <span className="text-sm text-zinc-500">{g.blurb}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
