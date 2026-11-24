"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GAMES, moodLabel, seatLabel, type GameInfo } from "@/lib/games";
import { HOWTO } from "@/lib/howto";
import { session } from "@/lib/players";
import { sfx } from "@/lib/sfx";
import Cover from "./Cover";

type Filter = "all" | "co-op" | "versus";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "co-op", label: "Together" },
  { id: "versus", label: "Head to head" },
];

const typing = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;

// The console-style picker: a strip of box art, the highlighted game blown up beside its
// details, arrows to browse, Q and E to flip the filter, Enter to play.
export default function GameSelect({
  players,
  guests = 0,
  onPlay,
  action = "Play",
}: {
  players: number;
  // Players sharing someone else's screen only count in games played by taking turns, and those
  // games add their players on their own start screen, so they never wait on the room.
  guests?: number;
  onPlay: (game: GameInfo) => void;
  action?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  // Whatever was last highlighted, here or in the library on the title screen.
  const [pick, setPickState] = useState(() => session.get<string>("arcade:pick") ?? GAMES[0].id);
  const setPick = (id: string) => {
    setPickState(id);
    session.set("arcade:pick", id);
  };
  const strip = useRef<HTMLDivElement>(null);

  const shown = useMemo(
    () => (filter === "all" ? GAMES : GAMES.filter((g) => g.mood === filter)),
    [filter]
  );
  const index = Math.max(0, shown.findIndex((g) => g.id === pick));
  const game = shown[index];
  const short = !game.local && players - guests < game.seats;
  const guide = HOWTO[game.id];

  const move = (step: number) => {
    setPick(shown[(index + step + shown.length) % shown.length].id);
    sfx.move();
  };
  const flip = (step: number) => {
    const at = FILTERS.findIndex((f) => f.id === filter);
    setFilter(FILTERS[(at + step + FILTERS.length) % FILTERS.length].id);
    sfx.move();
  };
  const play = () => {
    if (short) return sfx.error();
    sfx.start();
    onPlay(game);
  };

  useEffect(() => {
    strip.current
      ?.querySelector(`[data-id="${game.id}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [game.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || typing(e.target) || document.querySelector("[aria-modal='true']"))
        return;
      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "d") move(1);
      else if (key === "arrowleft" || key === "a") move(-1);
      else if (key === "e" || key === "]") flip(1);
      else if (key === "q" || key === "[") flip(-1);
      else if (key === "enter" && !(e.target instanceof HTMLButtonElement)) play();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="flex w-full flex-col gap-4" aria-label="Game select">
      <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Filter games">
        <button
          onClick={() => flip(-1)}
          aria-label="Previous filter"
          className="keycap hidden sm:inline-flex"
        >
          Q
        </button>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              sfx.move();
            }}
            className={`menu-item rounded-sm px-3 py-2 text-[0.8rem] sm:text-[0.88rem] ${
              filter === f.id ? "menu-item-on" : "text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button onClick={() => flip(1)} aria-label="Next filter" className="keycap hidden sm:inline-flex">
          E
        </button>
      </div>

      <div
        ref={strip}
        role="listbox"
        aria-label="Games"
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(1rem,calc(50%-6rem))] py-5"
      >
        {shown.map((g) => {
          const on = g.id === game.id;
          return (
            <button
              key={g.id}
              data-id={g.id}
              role="option"
              aria-selected={on}
              aria-label={g.name}
              onClick={() => (on ? play() : (setPick(g.id), sfx.move()))}
              className={`game-tile group flex shrink-0 snap-center flex-col gap-2 normal-case ${on ? "game-tile-on" : ""}`}
            >
              <Cover game={g} className="aspect-[12/7] w-36 rounded-sm sm:w-48" />
              <span
                className={`pixel truncate text-[0.72rem] ${on ? "neon-cyan" : "text-zinc-400"}`}
              >
                {g.name}
              </span>
            </button>
          );
        })}
      </div>

      <div key={game.id} className="menu-in cab grid gap-4 rounded-md p-3 sm:p-4 md:grid-cols-[1.3fr_1fr]">
        <div className="relative">
          <Cover
            game={game}
            className="aspect-[12/7] w-full rounded-sm shadow-[0_0_40px_rgba(255,45,149,0.25)]"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06030d] to-transparent px-4 pt-10 pb-3">
            <span className="pixel neon-cyan block text-sm sm:text-base">{game.name}</span>
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tag ${game.mood === "co-op" ? "tag-coop" : "tag-versus"}`}>
              {moodLabel(game)}
            </span>
            <span className="tag">{seatLabel(game)}</span>
            {short && <span className="tag tag-warn">needs {game.seats}</span>}
          </div>
          <p className="text-lg leading-snug text-zinc-200">{game.blurb}</p>
          {guide && (
            <>
              <p className="text-sm text-zinc-400">
                <span className="pixel mr-2 text-[0.72rem] text-[color:var(--neon-amber)]">Goal</span>
                {guide.goal}
              </p>
              <p className="text-sm text-zinc-500">
                <span className="pixel mr-2 text-[0.72rem] text-[color:var(--neon-cyan)]">Tip</span>
                {guide.tips[0]}
              </p>
            </>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={play}
              disabled={short}
              className="btn-arcade play-pulse rounded-sm px-6 py-3 text-[1.12rem] disabled:opacity-40"
            >
              {short ? `Needs ${game.seats} players` : `▶ ${action}`}
            </button>
            <a
              href={`/how-to-play#${game.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => sfx.select()}
              className="btn-ghost pixel rounded-sm px-4 py-3 text-[0.96rem] uppercase"
            >
              Rules
            </a>
          </div>
          {short && (
            <p className="text-sm text-zinc-400">
              Everyone needs their own device for this one. Send the invite.
            </p>
          )}
        </div>
      </div>

      <p className="hidden justify-center gap-4 text-sm text-zinc-500 sm:flex">
        <span>
          <kbd className="keycap">←</kbd> <kbd className="keycap">→</kbd> browse
        </span>
        <span>
          <kbd className="keycap">Enter</kbd> play
        </span>
        <span>
          <kbd className="keycap">Q</kbd> <kbd className="keycap">E</kbd> filter
        </span>
        <span>
          <kbd className="keycap">Esc</kbd> menu
        </span>
      </p>
    </section>
  );
}
