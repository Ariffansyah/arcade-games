"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GAMES, type GameInfo } from "@/lib/games";
import { HOWTO } from "@/lib/howto";
import { useRoom, type GameProps, type Player } from "@/lib/useRoom";
import { music, sfx } from "@/lib/sfx";
import { settings } from "@/lib/settings";
import GameSelect from "@/components/GameSelect";
import MenuScene from "@/components/MenuScene";
import SettingsPanel from "@/components/Settings";
import Cover from "@/components/Cover";
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
import LastCard from "@/components/games/LastCard";
import Poker from "@/components/games/Poker";
import Blackjack from "@/components/games/Blackjack";
import Topple from "@/components/games/Topple";
import FourInARow from "@/components/games/FourInARow";
import Yacht from "@/components/games/Yacht";
import Landlord from "@/components/games/Landlord";

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
  lastcard: LastCard,
  poker: Poker,
  blackjack: Blackjack,
  topple: Topple,
  four: FourInARow,
  yacht: Yacht,
  landlord: Landlord,
};

const SLOT_COLOURS = ["#ff2d95", "#22d3ee", "#ffc83d", "#39ff88", "#a78bfa", "#fb923c"];

const noop = () => () => {};

// Browser fullscreen. iPhone Safari has no element fullscreen, so these quietly do nothing there.
const enterFullscreen = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
};
const toggleFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else enterFullscreen();
};
const onFullscreen = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const useFullscreen = () =>
  useSyncExternalStore(
    onFullscreen,
    () => !!document.fullscreenElement,
    () => false
  );

const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false
  );

function Invite({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const link = typeof window === "undefined" ? "" : `${location.origin}/room/${code}`;

  const share = async () => {
    sfx.select();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Web Arcade", text: `Room ${code}`, url: link });
        return;
      } catch {}
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
      <button onClick={share} className="btn-ghost rounded-sm px-3 py-2 text-[0.88rem]">
        {state === "copied" ? "Link copied" : "Invite"}
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

// Everyone in the room as player slots, plus an open one waiting for the next to join.
function Party({
  players,
  me,
  onDrop,
}: {
  players: Player[];
  me: Player;
  onDrop: (id: string) => void;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Players">
      {players.map((p, i) => (
        <li
          key={p.id}
          className={`slot-in cab flex items-center gap-2.5 rounded-md py-1.5 pr-4 pl-1.5 ${
            p.id === me.id ? "cab-hot" : ""
          }`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span
            aria-hidden
            className="pixel flex h-9 w-9 items-center justify-center rounded-sm text-[0.96rem] text-[#06030d]"
            style={{
              background: SLOT_COLOURS[i % SLOT_COLOURS.length],
              boxShadow: `0 0 12px ${SLOT_COLOURS[i % SLOT_COLOURS.length]}`,
            }}
          >
            {p.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="pixel text-[0.72rem] text-zinc-500">
              P{i + 1}
              {i === 0 && " · host"}
              {p.id === me.id && " · you"}
              {p.host && " · same screen"}
            </span>
            <span className="max-w-32 truncate text-lg text-zinc-100">{p.name}</span>
          </span>
          {p.host === me.id && (
            <button
              onClick={() => {
                sfx.back();
                onDrop(p.id);
              }}
              aria-label={`Remove ${p.name}`}
              className="-mr-2 rounded-sm px-2 py-1 text-lg leading-none text-zinc-500 hover:text-red-400"
            >
              ×
            </button>
          )}
        </li>
      ))}
      <li className="flex items-center gap-2.5 rounded-md border-2 border-dashed border-zinc-800 py-1.5 pr-4 pl-1.5 text-zinc-600">
        <span className="pixel flex h-9 w-9 items-center justify-center rounded-sm border-2 border-zinc-800 text-[0.96rem]">
          +
        </span>
        <span className="blink pixel text-[0.72rem]">Insert coin</span>
      </li>
    </ul>
  );
}

const SHARED = GAMES.filter((g) => g.local)
  .map((g) => g.name)
  .join(", ");

// Friends round one phone or laptop each get a seat, and turn-based games pass the screen round.
function AddGuest({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        sfx.select();
        onAdd(name);
        setName("");
      }}
    >
      <span className="flex flex-wrap items-center justify-center gap-2">
        <label htmlFor="guest" className="text-base text-zinc-400">
          Sharing this screen?
        </label>
        <input
          id="guest"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="Their name"
          className="cab w-40 rounded-sm px-2 py-1.5 font-sans text-base"
        />
        <button className="btn-ghost rounded-sm px-3 py-2 text-[0.88rem]">Add player</button>
      </span>
      <span className="text-sm text-zinc-600">They take turns on this device in {SHARED}.</span>
    </form>
  );
}

// A game's title card while it loads in, with one of its tips. It fades itself out.
function Loading({ game }: { game: GameInfo }) {
  const [tip] = useState(() => {
    const tips = HOWTO[game.id]?.tips ?? [];
    return tips[Math.floor(Math.random() * tips.length)] ?? game.blurb;
  });
  return (
    <div
      aria-hidden
      className="loading-card pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-[#06030d] p-6"
    >
      <div className="flex w-full max-w-xl flex-col gap-5">
        <Cover
          game={game}
          className="aspect-[12/7] w-full rounded-md shadow-[0_0_60px_rgba(34,211,238,0.3)]"
        />
        <span className="pixel neon-cyan text-lg sm:text-2xl">{game.name}</span>
        <span className="text-lg text-zinc-400">
          <span className="pixel mr-2 text-[0.8rem] text-[color:var(--neon-amber)]">Tip</span>
          {tip}
        </span>
        <span className="h-1.5 w-full overflow-hidden rounded-sm bg-zinc-900">
          <span className="loading-bar block h-full bg-emerald-500 shadow-[0_0_10px_var(--color-emerald-500)]" />
        </span>
      </div>
    </div>
  );
}

function PauseMenu({
  game,
  onResume,
  onSettings,
  onChange,
}: {
  game: GameInfo;
  onResume: () => void;
  onSettings: () => void;
  onChange: () => void;
}) {
  const [rules, setRules] = useState(false);
  const guide = HOWTO[game.id];
  const refs = useRef<(HTMLElement | null)[]>([]);

  const items = [
    { label: "Resume", act: onResume },
    { label: rules ? "Hide the rules" : "How to play", act: () => setRules((r) => !r) },
    { label: "Settings", act: onSettings },
    { label: "Change game", hint: "Takes everyone back to game select", act: onChange },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[58] flex items-center justify-center bg-[#06030d]/85 p-4 backdrop-blur-sm"
      onClick={onResume}
    >
      <div
        className="menu-in cab flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="pixel neon-magenta text-base">Menu</h2>
          <span className="pixel text-[0.72rem] text-zinc-500">{game.name}</span>
        </div>
        <p className="text-base text-zinc-500">The game keeps running for everyone else.</p>
        <nav className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                refs.current[i] = el;
              }}
              autoFocus={i === 0}
              onKeyDown={(e) => {
                const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                refs.current[(i + step + items.length) % items.length]?.focus();
                sfx.move();
              }}
              onClick={() => {
                sfx.select();
                item.act();
              }}
              className="menu-row flex flex-col items-start gap-1 rounded-sm px-4 py-3 text-left"
            >
              <span className="pixel text-[1.12rem] text-zinc-100">{item.label}</span>
              {item.hint && (
                <span className="font-sans text-base normal-case text-zinc-500">{item.hint}</span>
              )}
            </button>
          ))}
        </nav>
        {rules && guide && (
          <div className="menu-in flex flex-col gap-3 border-t-2 border-zinc-800 pt-4 text-base text-zinc-300">
            <p>{guide.goal}</p>
            <ol className="flex flex-col gap-1.5 text-zinc-400">
              {guide.round.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-zinc-600">{i + 1}.</span>
                  {line}
                </li>
              ))}
            </ol>
            <p className="text-zinc-400">
              <span className="pixel mr-2 text-[0.72rem] text-[color:var(--neon-amber)]">
                Scoring
              </span>
              {guide.scoring}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Lobby({ code }: { code: string }) {
  const { players, connected, me, game, setGame, rename, name, guests, addGuest, dropGuest } =
    useRoom(code);
  const hydrated = useHydrated();
  const [options, setOptions] = useState(false);
  const [paused, setPaused] = useState(false);
  const fullscreen = useFullscreen();
  // Fullscreen needs a click or tap, so a game someone else started goes fullscreen on our first.
  const asked = useRef<string | null>(null);
  // Who on this screen is playing right now, and who last confirmed they're holding it.
  const [acting, setActing] = useState(me.id);
  const [shown, setShown] = useState(me.id);
  const follow = useCallback(
    (id: string) => {
      if (!id) setActing(me.id);
      else if (id === me.id || guests.some((g) => g.id === id)) setActing(id);
    },
    [me.id, guests]
  );

  const current = GAMES.find((g) => g.id === game);
  const here = [me, ...guests];
  const seated = current?.local ? players : players.filter((p) => !p.host);
  const player = (current?.local && here.find((p) => p.id === acting)) || me;
  const seat = seated.findIndex((p) => p.id === player.id) + 1;
  const slot = seat === 1 ? 1 : seat === 2 ? 2 : 0;
  const covered = !!current?.secret && player.id !== shown;
  const Game = current ? CABINETS[current.id] : undefined;
  const playing = !!(current && Game);

  // Music belongs to the menus; a game gets the room to itself.
  useEffect(() => {
    if (!hydrated) return;
    if (playing) music.stop();
    else music.start();
  }, [hydrated, playing]);
  useEffect(() => () => music.stop(), []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || options) return;
      sfx.back();
      setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, options]);

  if (!hydrated)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="blink pixel text-[0.96rem] text-zinc-500">booting cabinet…</span>
      </main>
    );

  const settingsPanel = options && (
    <SettingsPanel start="audio" onRename={rename} onClose={() => setOptions(false)} />
  );

  if (current && Game) {
    return (
      <main
        className="fixed inset-0 flex flex-col text-zinc-100"
        onPointerDownCapture={() => {
          if (asked.current === current.id) return;
          asked.current = current.id;
          if (settings().fullscreen) enterFullscreen();
        }}
      >
        <div className="hud relative z-20 flex min-h-11 shrink-0 items-center justify-between gap-2 border-x-0 border-t-0 px-1.5 pt-[env(safe-area-inset-top)] sm:px-3">
          <button
            onClick={() => {
              sfx.select();
              setPaused(true);
            }}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[0.88rem] text-zinc-300 hover:text-emerald-400"
            aria-label="Menu"
          >
            <span aria-hidden className="text-base leading-none">
              ☰
            </span>
            <span className="hidden sm:inline">Menu</span>
            <kbd className="keycap hidden sm:inline-flex">Esc</kbd>
          </button>
          <span className="pixel neon-cyan truncate text-[0.96rem] sm:text-[1.12rem]">
            {current.name}
          </span>
          <span className="flex items-center gap-1 text-sm text-zinc-400 sm:gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SLOT_COLOURS[Math.max(0, seat - 1) % SLOT_COLOURS.length] }}
              />
              {current.local && guests.length > 0 ? (
                <select
                  value={player.id}
                  onChange={(e) => {
                    sfx.select();
                    setActing(e.target.value);
                  }}
                  aria-label="Who's playing on this screen"
                  className="max-w-28 truncate rounded-sm bg-transparent py-1 text-zinc-200 sm:max-w-40"
                >
                  {here.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#06030d]">
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="hidden sm:inline">{player.name} ·</span>
              )}{" "}
              P{seat || "?"}
            </span>
            <button
              onClick={() => {
                sfx.select();
                toggleFullscreen();
              }}
              aria-label={fullscreen ? "Leave fullscreen" : "Fullscreen"}
              title={fullscreen ? "Leave fullscreen" : "Fullscreen"}
              className="rounded-sm px-2 py-1.5 text-base leading-none text-zinc-300 hover:text-emerald-400"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path
                  d={
                    fullscreen
                      ? "M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"
                      : "M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6"
                  }
                />
              </svg>
            </button>
          </span>
        </div>
        {!connected && (
          <p
            role="status"
            className="blink absolute top-12 left-1/2 z-30 -translate-x-1/2 rounded-sm bg-[#06030d]/90 px-3 py-1 text-sm text-red-400"
          >
            Reconnecting…
          </p>
        )}
        <div
          inert={covered}
          className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-x-hidden overflow-y-auto px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
        >
          <Game code={code} slot={slot} players={seated} me={player} name={name} follow={follow} />
        </div>
        {covered && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pass to ${player.name}`}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#06030d] p-6 text-center"
          >
            <span className="pixel text-[0.8rem] text-zinc-500">Cards hidden</span>
            <span className="pixel neon-cyan text-xl sm:text-2xl">Pass to {player.name}</span>
            <button
              autoFocus
              onClick={() => {
                sfx.select();
                setShown(player.id);
              }}
              className="btn-arcade rounded-sm px-5 py-3"
            >
              I&apos;m {player.name}
            </button>
          </div>
        )}
        <Loading key={current.id} game={current} />
        {paused && (
          <PauseMenu
            game={current}
            onResume={() => setPaused(false)}
            onSettings={() => {
              setPaused(false);
              setOptions(true);
            }}
            onChange={() => {
              setPaused(false);
              setGame(null);
            }}
          />
        )}
        {settingsPanel}
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col text-zinc-100">
      <MenuScene className="fixed inset-0" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[#06030d]/80" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
        <header className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            onClick={() => sfx.back()}
            className="pixel text-[0.88rem] text-zinc-400 hover:text-emerald-400"
          >
            ← Title
          </Link>
          <div className="col-span-2 row-start-2 flex flex-col items-center gap-1 sm:col-span-1 sm:row-start-1 sm:col-start-2">
            <span className="pixel text-[0.72rem] tracking-[0.3em] text-zinc-500">Room code</span>
            <span className="marquee pixel text-xl tracking-[0.2em] sm:text-2xl">{code}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Invite code={code} />
            <button
              onClick={() => {
                sfx.select();
                setOptions(true);
              }}
              className="btn-ghost rounded-sm px-3 py-2 text-[0.88rem]"
            >
              Settings
            </button>
          </div>
        </header>

        <Party players={players} me={me} onDrop={dropGuest} />
        <AddGuest onAdd={addGuest} />

        <p role="status" className="text-center text-base text-zinc-500">
          {!connected ? (
            <span className="blink text-red-400">Reconnecting to the room…</span>
          ) : players.length < 2 ? (
            "Waiting for player 2 — send the invite, or add someone on this screen."
          ) : (
            `${players.length} players in. Anyone can pick the game.`
          )}
        </p>

        <GameSelect
          players={players.length}
          guests={players.filter((p) => p.host).length}
          onPlay={(g) => {
            asked.current = g.id;
            if (settings().fullscreen) enterFullscreen();
            setGame(g.id);
          }}
        />

        <footer className="pt-2 text-center text-base text-zinc-600">
          Anyone with the code can walk in. Reload, or close the tab and tap the link again, and
          you keep your seat.
        </footer>
      </div>
      {settingsPanel}
    </main>
  );
}
