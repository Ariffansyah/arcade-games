"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { GAMES, moodLabel, seatLabel, type GameInfo } from "@/lib/games";
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
import SamePage from "@/components/games/SamePage";
import TallTale from "@/components/games/TallTale";
import BombSquad from "@/components/games/BombSquad";
import Mayday from "@/components/games/Mayday";

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
  samepage: SamePage,
  tale: TallTale,
  bomb: BombSquad,
  mayday: Mayday,
};

type Filter = "all" | "co-op" | "versus";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "co-op", label: "Together" },
  { id: "versus", label: "Head to head" },
];

const noop = () => () => {};

const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

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
      <button
        type="button"
        onClick={() => setDraft(null)}
        className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
      >
        Cancel
      </button>
    </form>
  );
}

function Invite({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const link = typeof window === "undefined" ? "" : `${location.origin}/room/${code}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Web Arcade", text: `Room ${code}`, url: link });
        return;
      } catch {
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("manual");
    }
  };

  return (
    <span className="flex flex-col items-center gap-1">
      <button onClick={share} className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]">
        {state === "copied" ? "Link copied" : "Send invite"}
      </button>
      {state === "manual" && (
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Room link"
          className="cab w-64 rounded-sm px-2 py-1 text-center font-sans text-xs"
        />
      )}
    </span>
  );
}

function Cabinet({
  game,
  players,
  onPick,
}: {
  game: GameInfo;
  players: number;
  onPick: () => void;
}) {
  const short = players < game.seats;
  return (
    <button
      disabled={short}
      onClick={onPick}
      className="cab group flex items-center gap-4 rounded-md px-4 py-4 text-left normal-case enabled:hover:border-emerald-600 disabled:opacity-40"
    >
      <span
        aria-hidden
        className="text-xl text-emerald-500 drop-shadow-[0_0_8px_var(--color-emerald-500)]"
      >
        {game.art}
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="pixel text-[0.65rem] text-zinc-100">{game.name}</span>
        <span className="font-sans text-zinc-400 normal-case">{game.blurb}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span className={`tag ${game.mood === "co-op" ? "tag-coop" : "tag-versus"}`}>
            {moodLabel(game)}
          </span>
          <span className="tag">{seatLabel(game)}</span>
          {short && <span className="tag tag-warn">needs {game.seats}</span>}
        </span>
      </span>
      <span aria-hidden className="pixel text-[0.6rem] text-zinc-700 group-hover:text-emerald-400">
        ▶
      </span>
    </button>
  );
}

export default function Lobby({ code }: { code: string }) {
  const { players, connected, me, slot, game, setGame, rename } = useRoom(code);
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Filter>("all");
  const seat = players.findIndex((p) => p.id === me.id) + 1;

  const shown = useMemo(
    () => (filter === "all" ? GAMES : GAMES.filter((g) => g.mood === filter)),
    [filter]
  );

  if (!hydrated)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="blink pixel text-[0.6rem] text-zinc-500">booting cabinet…</span>
      </main>
    );

  const current = GAMES.find((g) => g.id === game);

  const Game = current ? CABINETS[current.id] : undefined;
  if (current && Game) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-zinc-100 sm:p-6">
        <div className="cab flex w-full max-w-3xl items-center justify-between gap-3 rounded-md px-4 py-2">
          <button
            onClick={() => setGame(null)}
            className="text-[0.6rem] text-zinc-400 hover:text-emerald-400"
          >
            &larr; Menu
          </button>
          <span className="neon-cyan pixel text-[0.6rem]">{current.name}</span>
          <span className="pixel text-[0.6rem] text-zinc-400">
            {me.name} · P{seat || "?"}
          </span>
        </div>
        {!connected && (
          <p role="status" className="blink text-sm text-red-400">
            Reconnecting…
          </p>
        )}
        <Game code={code} slot={slot} players={players} me={me} />
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 overflow-hidden p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-zinc-100 sm:p-6">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/3" />

      <header className="relative flex flex-col items-center gap-2 pt-4 text-center">
        <span className="pixel text-[0.55rem] tracking-[0.3em] text-zinc-500">Room code</span>
        <h1 className="marquee text-2xl tracking-[0.2em] sm:text-3xl">{code}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <NameTag name={me.name} onRename={rename} />
          <Invite code={code} />
        </div>
        <p role="status" className="text-xs text-zinc-600">
          {connected ? (
            <>
              {players.length} {players.length === 1 ? "player" : "players"} in the room · seats
              are unlimited, games decide how many they use
            </>
          ) : (
            <span className="blink text-red-400">Reconnecting to the room…</span>
          )}
        </p>
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
          className={`text-center text-[0.6rem] ${
            players.length >= 2 ? "neon-cyan" : "blink text-zinc-500"
          }`}
        >
          {players.length >= 2 ? "◄ Select game ►" : "Waiting for Player 2…"}
        </h2>

        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter games">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`btn-ghost rounded-sm px-3 py-2 text-[0.55rem] ${
                filter === f.id ? "border-emerald-500 text-emerald-400" : ""
              }`}
            >
              {f.label}
            </button>
          ))}

          <a
            href="/how-to-play"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
          >
            How to play
          </a>
        </div>

        {shown.map((g) => (
          <Cabinet key={g.id} game={g} players={players.length} onPick={() => setGame(g.id)} />
        ))}
      </section>

      <footer className="relative pb-2 text-center text-[0.6rem] text-zinc-600">
        Anyone with the code can walk in. Leave the tab and your seat frees up.
      </footer>
    </main>
  );
}
