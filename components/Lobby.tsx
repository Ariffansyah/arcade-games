"use client";

import { useState, useSyncExternalStore } from "react";
import { GAMES, seatLabel } from "@/lib/games";
import { useRoom, type GameProps } from "@/lib/useRoom";
import BlindMaze from "@/components/games/BlindMaze";
import DoodleGuess from "@/components/games/DoodleGuess";
import Battleships from "@/components/games/Battleships";
import Imposter from "@/components/games/Imposter";
import Fuse from "@/components/games/Fuse";
import QuickDraw from "@/components/games/QuickDraw";
import Dial from "@/components/games/Dial";
import Chain from "@/components/games/Chain";
import Scatter from "@/components/games/Scatter";
import TwoThirds from "@/components/games/TwoThirds";
import Tug from "@/components/games/Tug";
import TypeRace from "@/components/games/TypeRace";

const CABINETS: Record<string, React.ComponentType<GameProps>> = {
  doodle: DoodleGuess,
  maze: BlindMaze,
  ships: Battleships,
  imposter: Imposter,
  fuse: Fuse,
  draw: QuickDraw,
  dial: Dial,
  chain: Chain,
  scatter: Scatter,
  thirds: TwoThirds,
  tug: Tug,
  typerace: TypeRace,
};

const noop = () => () => {};

/**
 * False on the server and through hydration, true after. Your identity — id and
 * nickname — is minted in the browser, so the server has no way to render it and
 * anything that shows it has to wait.
 */
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/** Inline nickname editor — the name everyone else sees on the scoreboards. */
function NameTag({ name, onRename }: { name: string; onRename: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null)
    return (
      <button onClick={() => setDraft(name)} className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]">
        {name} · rename
      </button>
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRename(draft);
        setDraft(null);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={16}
        autoFocus
        aria-label="Nickname"
        className="cab w-40 rounded-sm px-2 py-1.5 text-center font-sans text-sm outline-none focus:border-emerald-500"
      />
      <button type="submit" className="btn-arcade rounded-sm px-3 py-2 text-[0.55rem]">
        Save
      </button>
    </form>
  );
}

/** Room link, copied to the clipboard — the only way anyone else gets in. */
function Invite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
    >
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  );
}

export default function Lobby({ code }: { code: string }) {
  const { players, me, slot, game, setGame, rename } = useRoom(code);
  const hydrated = useHydrated();
  const seat = players.findIndex((p) => p.id === me.id) + 1;

  if (!hydrated)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="blink pixel text-[0.6rem] text-zinc-500">booting cabinet…</span>
      </main>
    );

  const current = GAMES.find((g) => g.id === game);
  // A cabinet listed but not wired up (or a half-loaded dev bundle) drops you
  // back to the menu instead of blowing up the room.
  const Game = current ? CABINETS[current.id] : undefined;
  if (current && Game) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-4 text-zinc-100 sm:p-6">
        <div className="cab flex w-full max-w-3xl items-center justify-between gap-3 rounded-md px-4 py-2">
          <button onClick={() => setGame(null)} className="text-[0.6rem] text-zinc-400 hover:text-emerald-400">
            &larr; Menu
          </button>
          <span className="neon-cyan pixel text-[0.6rem]">{current.name}</span>
          <span className="pixel text-[0.6rem] text-zinc-400">
            {me.name} · P{seat || "?"}
          </span>
        </div>
        <Game code={code} slot={slot} players={players} me={me} />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 overflow-hidden p-4 text-zinc-100 sm:p-6">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/3" />

      <header className="relative flex flex-col items-center gap-2 pt-4 text-center">
        <span className="pixel text-[0.55rem] tracking-[0.3em] text-zinc-500">Room code</span>
        <h1 className="marquee text-2xl tracking-[0.2em] sm:text-3xl">{code}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <NameTag name={me.name} onRename={rename} />
          <Invite code={code} />
        </div>
        <span className="text-xs text-zinc-600">
          {players.length} {players.length === 1 ? "player" : "players"} in the room · seats are
          unlimited, games decide how many they use
        </span>
        <span className="text-zinc-400">
          {seat ? `You are Player ${seat}` : "Connecting…"}
          {seat > 2 && " — two-player games are spectate-only"}
        </span>
      </header>

      <ul className="relative grid grid-cols-2 gap-3">
        {Array.from({ length: Math.max(2, players.length) }, (_, i) => {
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
              {p && (
                <div className="mt-1 text-[0.6rem] text-zinc-500">
                  {i === 0 ? "host · starts the rounds" : i === 1 ? "player 2" : "party seat"}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="relative flex flex-col gap-3">
        <h2
          className={`text-center text-[0.6rem] ${players.length >= 2 ? "neon-cyan" : "blink text-zinc-500"}`}
        >
          {players.length >= 2 ? "◄ Select game ►" : "Waiting for Player 2…"}
        </h2>
        {GAMES.map((g) => (
          <button
            key={g.id}
            disabled={players.length < g.seats}
            onClick={() => setGame(g.id)}
            className="cab group flex items-center gap-4 rounded-md px-4 py-4 text-left normal-case enabled:hover:border-emerald-600 disabled:opacity-40"
          >
            <span className="text-xl text-emerald-500 drop-shadow-[0_0_8px_var(--color-emerald-500)]">
              {g.art}
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="pixel text-[0.65rem] text-zinc-100">{g.name}</span>
              <span className="font-sans text-zinc-400 normal-case">
                {g.blurb}
                {players.length < g.seats && ` — needs ${g.seats} players`}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="pixel text-[0.55rem] text-zinc-600">
                {seatLabel(g)}
              </span>
              <span className="pixel text-[0.6rem] text-zinc-700 group-hover:text-emerald-400">
                ▶
              </span>
            </span>
          </button>
        ))}
      </section>

      <footer className="relative pb-6 text-center text-[0.6rem] text-zinc-600">
        Anyone with the code can walk in. Leave the tab and your seat frees up.
      </footer>
    </main>
  );
}
