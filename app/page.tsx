"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GAMES } from "@/lib/games";
import { cleanName, saveName, storedName } from "@/lib/players";
import { CODE_LENGTH, cleanCode, isCode, newCode } from "@/lib/room";
import { music, sfx } from "@/lib/sfx";
import MenuScene from "@/components/MenuScene";
import SettingsPanel from "@/components/Settings";
import GameSelect from "@/components/GameSelect";

type Screen = "splash" | "main" | "join" | "library";

type Item = { id: string; label: string; hint: string; act: () => void };

function Menu({ items }: { items: Item[] }) {
  const [at, setAt] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focus = (i: number) => {
    const next = (i + items.length) % items.length;
    setAt(next);
    refs.current[next]?.focus();
    sfx.move();
  };

  return (
    <nav aria-label="Main menu" className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          autoFocus={i === 0}
          onFocus={() => setAt(i)}
          onMouseEnter={() => at !== i && focus(i)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "s") focus(i + 1);
            else if (e.key === "ArrowUp" || e.key === "w") focus(i - 1);
            else return;
            e.preventDefault();
          }}
          onClick={() => {
            sfx.select();
            item.act();
          }}
          className={`menu-row group flex items-center gap-4 rounded-sm px-4 py-3 text-left ${
            at === i ? "menu-row-on" : ""
          }`}
        >
          <span aria-hidden className={`pixel text-[0.7rem] ${at === i ? "neon-magenta" : "opacity-0"}`}>
            ▶
          </span>
          <span className="flex flex-col gap-1">
            <span className={`pixel text-sm sm:text-base ${at === i ? "text-zinc-100" : "text-zinc-400"}`}>
              {item.label}
            </span>
            <span
              className={`font-sans text-base normal-case ${at === i ? "text-zinc-300" : "text-zinc-600"}`}
            >
              {item.hint}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("splash");
  const [options, setOptions] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [code, setCode] = useState("");
  const [nick, setNick] = useState(storedName);

  const go = (to: string) => {
    const name = cleanName(nick);
    if (name) saveName(name);
    sfx.start();
    setLeaving(true);
    setTimeout(() => router.push(to), 420);
  };

  const begin = () => {
    if (screen !== "splash") return;
    sfx.start();
    music.start();
    setScreen("main");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || options) return;
      if (screen === "splash") {
        // Otherwise the same Enter press lands on the menu that just appeared.
        e.preventDefault();
        return begin();
      }
      if (e.key === "Escape" && screen !== "main") {
        sfx.back();
        setScreen("main");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const items: Item[] = [
    {
      id: "new",
      label: "New room",
      hint: "Open a room and send everyone the code",
      act: () => go(`/room/${newCode()}`),
    },
    { id: "join", label: "Join room", hint: "Got a code? Punch it in", act: () => setScreen("join") },
    {
      id: "library",
      label: "Game library",
      hint: `All ${GAMES.length} cabinets, what they are and how they play`,
      act: () => setScreen("library"),
    },
    {
      id: "settings",
      label: "Settings",
      hint: "Sound, graphics, display and your name",
      act: () => setOptions(true),
    },
  ];

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden text-zinc-100">
      <MenuScene className="fixed inset-0" />
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 transition-colors duration-500 ${
          screen === "splash"
            ? "bg-[linear-gradient(180deg,rgba(6,3,13,0.85)_0%,rgba(6,3,13,0.2)_32%,transparent_55%,rgba(6,3,13,0.85)_100%)]"
            : screen === "library"
              ? "bg-[#06030d]/80"
              : "bg-[#06030d]/75 sm:bg-transparent sm:bg-[linear-gradient(90deg,rgba(6,3,13,0.93)_0%,rgba(6,3,13,0.7)_42%,rgba(6,3,13,0.1)_78%)]"
        }`}
      />

      {screen === "splash" ? (
        <button
          onClick={begin}
          className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-between px-4 pt-[9vh] pb-[8vh] normal-case"
        >
          <span className="flex flex-col items-center gap-4">
            <span className="neon-cyan pixel text-[0.6rem] tracking-[0.4em]">
              {GAMES.length} cabinets · one room code
            </span>
            <span className="marquee hum pixel text-4xl sm:text-6xl">Web Arcade</span>
          </span>
          <span className="flex flex-col items-center gap-3">
            <span className="blink pixel neon-magenta text-base sm:text-xl">Press start</span>
            <span className="text-lg text-zinc-300">Click, tap or press any key</span>
          </span>
        </button>
      ) : (
        <div className="relative z-10 flex min-h-dvh flex-col gap-8 p-5 sm:p-10">
          <header className="flex items-start justify-between gap-4">
            <button
              onClick={() => {
                sfx.back();
                setScreen("main");
              }}
              className="flex flex-col items-start gap-2 text-left normal-case"
              aria-label="Back to the main menu"
            >
              <span className="marquee pixel text-2xl sm:text-4xl">Web Arcade</span>
              <span className="neon-cyan pixel text-[0.5rem] tracking-[0.3em]">
                {screen === "main" ? "Main menu" : screen === "join" ? "Join a room" : "Game library"}
              </span>
            </button>
            <button
              onClick={() => setOptions(true)}
              className="cab mr-10 hidden items-center gap-3 rounded-md px-3 py-2 normal-case sm:flex"
              aria-label="Profile and settings"
            >
              <span className="pixel flex h-8 w-8 items-center justify-center rounded-sm bg-[color:var(--neon-magenta)] text-[0.6rem] text-[#06030d]">
                {(cleanName(nick) || "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="flex flex-col items-start">
                <span className="pixel text-[0.45rem] text-zinc-500">Player</span>
                <span className="text-lg text-zinc-200">{cleanName(nick) || "No name yet"}</span>
              </span>
            </button>
          </header>

          {screen === "main" && (
            <div key="main" className="menu-in flex max-w-xl flex-1 flex-col justify-center gap-6">
              <Menu items={items} />
            </div>
          )}

          {screen === "join" && (
            <form
              key="join"
              onSubmit={(e) => {
                e.preventDefault();
                if (isCode(code)) go(`/room/${code}`);
                else sfx.error();
              }}
              className="menu-in cab flex w-full max-w-md flex-col gap-5 self-start rounded-md p-6"
            >
              <label className="flex flex-col gap-2">
                <span className="pixel text-[0.55rem] text-zinc-400">Your nickname</span>
                <input
                  value={nick}
                  onChange={(e) => setNick(cleanName(e.target.value))}
                  placeholder="pick a name"
                  maxLength={16}
                  autoComplete="nickname"
                  className="cab rounded-sm px-3 py-2 font-sans text-xl outline-none placeholder:text-zinc-700 focus:border-emerald-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="pixel text-[0.55rem] text-zinc-400">Room code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(cleanCode(e.target.value))}
                  autoFocus
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ABC123"
                  className="neon-green cab rounded-sm px-3 py-2 text-center text-4xl tracking-[0.3em] outline-none placeholder:text-zinc-700 focus:border-emerald-500"
                />
                <span aria-hidden className="flex justify-center gap-1">
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-8 rounded-sm transition-colors ${
                        code.length > i
                          ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]"
                          : "bg-zinc-800"
                      }`}
                    />
                  ))}
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!isCode(code)}
                  className="btn-arcade flex-1 rounded-sm px-5 py-3 disabled:opacity-40"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sfx.back();
                    setScreen("main");
                  }}
                  className="btn-ghost rounded-sm px-5 py-3"
                >
                  Back
                </button>
              </div>
              <p className="text-base text-zinc-500">
                Codes are {CODE_LENGTH} characters. Rooms aren&apos;t listed anywhere, so only people
                with the code can walk in.
              </p>
            </form>
          )}

          {screen === "library" && (
            <div key="library" className="menu-in mx-auto flex w-full max-w-5xl flex-col gap-3">
              <GameSelect players={Infinity} action="Open a room" onPlay={() => go(`/room/${newCode()}`)} />
              <button
                onClick={() => {
                  sfx.back();
                  setScreen("main");
                }}
                className="btn-ghost self-center rounded-sm px-5 py-3"
              >
                Back
              </button>
            </div>
          )}

          <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 text-base text-zinc-500">
            <span>No accounts, no installs. Close the tab and the room is gone.</span>
            <span className="hidden gap-4 sm:flex">
              <span>
                <kbd className="keycap">↑</kbd> <kbd className="keycap">↓</kbd> move
              </span>
              <span>
                <kbd className="keycap">Enter</kbd> select
              </span>
              <span>
                <kbd className="keycap">Esc</kbd> back
              </span>
            </span>
          </footer>
        </div>
      )}

      {options && (
        <SettingsPanel
          start={screen === "main" ? "audio" : "profile"}
          onRename={setNick}
          onClose={() => setOptions(false)}
        />
      )}
      {leaving && <div aria-hidden className="screen-wipe fixed inset-0 z-[70] bg-[#06030d]" />}
    </main>
  );
}
