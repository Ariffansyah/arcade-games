"use client";

import { useEffect, useRef, useState } from "react";
import { ROPE_TO_WIN, rope, sideFor, taken, type Pull } from "@/lib/tug.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Bout = { id: number; startedAt: number };

const BEACON_MS = 150;

export default function Tug({ code, players, me }: GameProps) {
  const [bout, setBout] = useState<Bout | null>(null);
  const [pulls, setPulls] = useState(0);
  const [side, setSide] = useState<0 | 1>(() => sideFor(players.map((p) => p.id), me.id));
  const [crew, setCrew] = useState<Record<string, Pull>>({});
  const [wins, setWins] = useState<[number, number]>([0, 0]);
  const counted = useRef(0);

  const host = players[0];
  const isHost = host?.id === me.id;

  const mine: Pull = { id: me.id, name: me.name, side, pulls };
  const all = [...Object.values(crew).filter((p) => p.id !== me.id), mine];
  const at = rope(all);
  const won = bout ? taken(all) : null;

  const beacon = useBroadcast<Pull>(`tug:${code}`, "pull", (p) =>
    setCrew((everyone) => ({ ...everyone, [p.id]: p }))
  );

  const gun = useBroadcast<Bout>(`tug-bout:${code}`, "bout", (next) => {
    setBout(next);
    setPulls(0);
    setCrew({});
    counted.current = 0;
  });

  const shout = useRef(mine);
  useEffect(() => {
    shout.current = mine;
  });

  useEffect(() => {
    const id = setInterval(() => beacon(shout.current), BEACON_MS);
    return () => clearInterval(id);
  }, [beacon]);

  useEffect(() => {
    if (won === null || !bout || counted.current === bout.id) return;
    counted.current = bout.id;
    setWins((score) => {
      const next: [number, number] = [...score];
      next[won] += 1;
      return next;
    });
  }, [won, bout]);

  const heave = () => {
    if (!bout || won !== null) return;
    setPulls((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || !bout || won !== null) return;
      e.preventDefault();
      setPulls((n) => n + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bout, won]);

  const start = () => {
    gun({ id: (bout?.id ?? 0) + 1, startedAt: Date.now() });
    setBout({ id: (bout?.id ?? 0) + 1, startedAt: Date.now() });
    setPulls(0);
    setCrew({});
  };

  const crews = [0, 1].map((s) => all.filter((p) => p.side === s));

  const offset = Math.max(-1, Math.min(1, at / ROPE_TO_WIN));

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Two crews, one rope. Hammer the space bar or the button — drag the knot all the way to your
        end.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Every pull counts the same, so the bigger crew has the easier job. Pick your side before the
        bell.
      </p>

      <div className="flex w-full items-start justify-between gap-4">
        {[0, 1].map((s) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-2">
            <button
              onClick={() => !bout && setSide(s as 0 | 1)}
              disabled={!!bout}
              className={`cab rounded-md px-3 py-1.5 text-sm disabled:opacity-70 ${
                side === s ? "cab-hot neon-green" : "text-zinc-400"
              }`}
            >
              {s === 0 ? "◄ Left" : "Right ►"} · {wins[s]}
            </button>
            <ul className="flex flex-col items-center gap-0.5 text-xs text-zinc-400">
              {crews[s].map((p) => (
                <li key={p.id} className={p.id === me.id ? "text-emerald-400" : ""}>
                  {p.name} <span className="text-zinc-600">{p.pulls}</span>
                </li>
              ))}
              {crews[s].length === 0 && <li className="text-zinc-700">empty</li>}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative h-16 w-full rounded-md border-2 border-zinc-700 bg-[#0b0618]">
        <span className="absolute left-1/2 top-0 h-full w-px bg-zinc-700" />
        <span
          className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-zinc-600"
          style={{ transform: `translateY(-50%) translateX(${offset * 42}%)` }}
        />
        <span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl transition-[left] duration-100"
          style={{ left: `${50 + offset * 42}%` }}
        >
          ⚙
        </span>
        {won !== null && (
          <span className="flash-win absolute inset-0 flex items-center justify-center pixel text-[0.7rem] text-emerald-400">
            {won === 0 ? "Left" : "Right"} crew takes it
          </span>
        )}
      </div>

      <button
        onClick={heave}
        disabled={!bout || won !== null}
        className="btn-arcade w-full max-w-md rounded-sm py-5 text-lg disabled:opacity-40"
      >
        {!bout ? "Waiting for the bell" : won !== null ? "Rope's home" : "HEAVE"}
      </button>

      {isHost ? (
        <button onClick={start} className="btn-arcade rounded-sm px-4 py-2">
          {bout ? "Next bout" : "Ring the bell"}
        </button>
      ) : (
        !bout && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
