"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOUL, armDelay, rank, winner, type Shot } from "@/lib/reaction.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Arm = { round: number; delay: number };

export default function QuickDraw({ code, players, me }: GameProps) {
  const [round, setRound] = useState(0);
  const [goAt, setGoAt] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [wins, setWins] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const armed = useRef<number | null>(null);

  const host = players[0];
  const isHost = host?.id === me.id;

  const arm = useBroadcast<Arm>(`draw:${code}`, "arm", ({ round: n, delay }) => {
    setRound(n);
    setShots([]);
    setGoAt(Date.now() + delay);
  });

  const tap = useBroadcast<Shot>(`draw:${code}`, "tap", (shot) =>
    setShots((all) => (all.some((s) => s.id === shot.id) ? all : [...all, shot]))
  );

  const lit = goAt > 0 && now >= goAt;
  const mine = shots.find((s) => s.id === me.id);
  const everyone = shots.length >= players.length && players.length > 0;
  const best = everyone ? winner(shots) : null;

  useEffect(() => {
    if (!goAt) return;
    const id = setInterval(() => setNow(Date.now()), 16);
    return () => clearInterval(id);
  }, [goAt]);

  useEffect(() => {
    if (!best || armed.current === round) return;
    armed.current = round;
    setWins((w) => ({ ...w, [best.id]: (w[best.id] ?? 0) + 1 }));
  }, [best, round]);

  const start = useCallback(() => {
    const next = { round: round + 1, delay: armDelay() };
    arm(next);
    setRound(next.round);
    setShots([]);
    setGoAt(Date.now() + next.delay);
  }, [arm, round]);

  const shoot = useCallback(() => {
    if (!goAt || mine) return;
    const shot: Shot = {
      id: me.id,
      name: me.name,
      ms: Date.now() >= goAt ? Date.now() - goAt : FOUL,
    };
    setShots((all) => [...all, shot]);
    tap(shot);
  }, [goAt, mine, me.id, me.name, tap]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      shoot();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shoot]);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Wait for green, then hit it. Space bar or the pad — fastest hand in the room takes the
        round.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Tap early and you foul out of the round. Reaction times under 100ms are guesses, not
        reflexes.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => {
          const shot = shots.find((s) => s.id === p.id);
          return (
            <li
              key={p.id}
              className={`cab rounded-md px-3 py-1.5 text-sm ${p.id === me.id ? "cab-hot" : ""}`}
            >
              <span className="text-zinc-200">{p.name}</span>{" "}
              <span className="neon-green">{wins[p.id] ?? 0}</span>
              {shot && (
                <span className={shot.ms === FOUL ? " text-red-400" : " text-zinc-500"}>
                  {shot.ms === FOUL ? " foul" : ` ${shot.ms}ms`}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={shoot}
        disabled={!goAt || !!mine}
        aria-label="Hit it"
        className={`flex h-56 w-full max-w-md items-center justify-center rounded-md border-2 pixel text-[0.7rem] transition-colors ${
          lit
            ? "border-emerald-500 bg-emerald-500 text-[#04120a] shadow-[0_0_40px_var(--color-emerald-500)]"
            : goAt
              ? "border-red-500 bg-[#2a0713] text-red-400"
              : "cab text-zinc-600"
        }`}
      >
        {!goAt
          ? "standing by"
          : mine
            ? mine.ms === FOUL
              ? "too early"
              : `${mine.ms}ms`
            : lit
              ? "HIT IT"
              : "wait…"}
      </button>

      {shots.length > 0 && (
        <ol className="w-full max-w-md text-sm">
          {rank(shots).map((s, i) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-1">
              <span className="text-zinc-500">{i + 1}</span>
              <span className="flex-1 text-zinc-300">{s.name}</span>
              <span className={s.ms === FOUL ? "text-red-400" : "font-mono text-zinc-100"}>
                {s.ms === FOUL ? "jumped the gun" : `${s.ms}ms`}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-3 text-sm">
        {isHost ? (
          <button
            onClick={start}
            disabled={!!goAt && !everyone}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            {round ? "Again" : "Arm the light"}
          </button>
        ) : (
          !goAt && <span className="blink text-zinc-500">Waiting for {host?.name}…</span>
        )}
        {round > 0 && <span className="text-zinc-500">Round {round}</span>}
        {best && <span className="flash-win text-emerald-400">{best.name} wins it</span>}
      </div>
    </div>
  );
}
