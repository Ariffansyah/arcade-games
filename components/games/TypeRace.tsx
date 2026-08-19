"use client";

import { useEffect, useRef, useState } from "react";
import {
  COUNTDOWN_MS,
  mistyped,
  passage,
  passageIndex,
  progress,
  standings,
  wpm,
  type Racer,
} from "@/lib/typerace.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Race = { round: number; seed: string; avoid: number };

const BEACON_MS = 200;

export default function TypeRace({ code, players, me }: GameProps) {
  const [race, setRace] = useState<Race | null>(null);
  const [goAt, setGoAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [doneAt, setDoneAt] = useState(0);
  const [others, setOthers] = useState<Record<string, Racer>>({});
  const [now, setNow] = useState(() => Date.now());
  const box = useRef<HTMLTextAreaElement>(null);

  const host = players[0];
  const isHost = host?.id === me.id;
  const text = race ? passage(race.seed, race.round, race.avoid) : "";
  const live = goAt > 0 && now >= goAt;
  const at = progress(typed, text);
  const wrong = mistyped(typed, text);
  const ms = doneAt ? doneAt - goAt : live ? now - goAt : 0;

  const flag = useBroadcast<Race>(`type:${code}`, "race", (next) => {
    setRace(next);
    setGoAt(Date.now() + COUNTDOWN_MS);
    setTyped("");
    setDoneAt(0);
    setOthers({});
    box.current?.focus();
  });

  const beacon = useBroadcast<Racer>(`type-run:${code}`, "run", (r) =>
    setOthers((all) => ({ ...all, [r.id]: r }))
  );

  useEffect(() => {
    if (!goAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [goAt]);

  const run = useRef<Racer>({ id: me.id, name: me.name, chars: 0, ms: 0, done: false });
  useEffect(() => {
    run.current = { id: me.id, name: me.name, chars: at, ms, done: !!doneAt };
  });

  useEffect(() => {
    if (!race) return;
    const id = setInterval(() => beacon(run.current), BEACON_MS);
    return () => clearInterval(id);
  }, [race, beacon]);

  const type = (value: string) => {
    if (!live || doneAt) return;
    setTyped(value);
    if (value === text) setDoneAt(Date.now());
  };

  const start = () => {
    const next = {
      round: (race?.round ?? 0) + 1,
      seed: `${code}-${Date.now()}`,

      avoid: race ? passageIndex(race.seed, race.round, race.avoid) : -1,
    };
    flag(next);
    setRace(next);
    setGoAt(Date.now() + COUNTDOWN_MS);
    setTyped("");
    setDoneAt(0);
    setOthers({});
  };

  const board = standings([
    ...Object.values(others).filter((r) => r.id !== me.id),
    ...(race ? [{ id: me.id, name: me.name, chars: at, ms, done: !!doneAt }] : []),
  ]);
  const champion = board.find((r) => r.done);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-400">
        Same passage, everyone at once. Type it exactly — a wrong character stops you dead until
        you fix it.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Speed is words per minute at five characters a word. No backspacing past a mistake you
        haven&apos;t noticed yet.
      </p>

      <ul className="flex w-full flex-col gap-2">
        {board.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <span
              className={`w-24 shrink-0 truncate text-sm ${
                r.id === me.id ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {r.name}
            </span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-zinc-800">
              <span
                className={`absolute inset-y-0 left-0 transition-[width] duration-200 ${
                  r.done ? "bg-emerald-500" : "bg-emerald-700"
                }`}
                style={{ width: `${text ? (r.chars / text.length) * 100 : 0}%` }}
              />
            </span>
            <span className="w-20 shrink-0 text-right font-mono text-sm text-zinc-300">
              {wpm(r.chars, r.ms)} wpm
            </span>
          </li>
        ))}
      </ul>

      {race && (
        <div className="cab flex w-full flex-col gap-3 rounded-md p-5">
          <p className="font-sans text-lg leading-relaxed">
            <span className="text-emerald-400">{text.slice(0, at)}</span>
            <span className={wrong ? "bg-red-600 text-zinc-100" : "bg-zinc-700 text-zinc-100"}>
              {text.slice(at, at + 1)}
            </span>
            <span className="text-zinc-500">{text.slice(at + 1)}</span>
          </p>

          <textarea
            ref={box}
            value={typed}
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            disabled={!live || !!doneAt}
            autoFocus
            rows={3}
            spellCheck={false}
            autoComplete="off"
            placeholder={live ? "Type it" : "Get ready…"}
            aria-label="Type the passage"
            className={`cab resize-none rounded-sm px-3 py-2 font-sans text-base leading-relaxed outline-none disabled:opacity-60 ${
              wrong ? "border-red-500" : "focus:border-emerald-500"
            }`}
          />

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-400">
            {!live && <span className="blink text-zinc-300">{Math.ceil((goAt - now) / 1000)}…</span>}
            {live && (
              <span className="font-mono text-zinc-200">{(ms / 1000).toFixed(1)}s</span>
            )}
            <span>
              {at}/{text.length} characters
            </span>
            {doneAt > 0 && (
              <span className="flash-win text-emerald-400">
                Finished at {wpm(at, ms)} wpm
              </span>
            )}
          </div>
        </div>
      )}

      {champion && champion.id !== me.id && (
        <p className="text-sm text-zinc-500">{champion.name} got there first.</p>
      )}

      {isHost ? (
        <button onClick={start} className="btn-arcade rounded-sm px-4 py-2">
          {race ? "Race again" : "Start the race"}
        </button>
      ) : (
        !race && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
