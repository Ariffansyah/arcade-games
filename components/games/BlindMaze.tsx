"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { E, N, S, W, advance, generateMaze, newRun, type Run } from "@/lib/maze.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";
import MazeBoard from "./MazeBoard";

const KEYS: Record<string, number> = {
  ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W,
  w: N, d: E, s: S, a: W,
};

const SIZES = [
  { label: "Small", size: 9 },
  { label: "Medium", size: 13 },
  { label: "Large", size: 17 },
];

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** The runner's Run, plus who is holding the controls. Both travel together so
 *  a client that joins late learns the seating from the next move. */
type Sync = { run: Run; driver: string };

export default function BlindMaze({ code, players, me }: GameProps) {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [run, setRun] = useState<Run>(() => newRun(13));
  const [synced, setSynced] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const recordBest = useCallback(
    (r: Run) => setBest((b) => Math.min(b ?? Infinity, r.finishedAt - r.startedAt)),
    []
  );

  // Only the seed travels; both clients rebuild the same maze from it.
  const maze = useMemo(
    () => generateMaze(run.seed, run.size, run.size, Math.round(run.size * run.size * 0.06)),
    [run.seed, run.size]
  );

  const send = useBroadcast<Sync>(`maze:${code}`, "move", (payload) => {
    setSynced(true);
    setRun(payload.run);
    setDriverId(payload.driver);
    if (payload.run.finishedAt) recordBest(payload.run);
  });

  // Nobody picked yet, so the first player in the room takes the controls.
  const wheel = driverId ?? players[0]?.id ?? "";
  const driver = wheel === me.id;

  useEffect(() => {
    if (driver) send({ run, driver: wheel });
  }, [driver, run, wheel, send]);

  const handOver = (id: string) => {
    setDriverId(id);
    send({ run, driver: id });
  };

  useEffect(() => {
    if (run.finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [run.finishedAt]);

  const move = useCallback(
    (dir: number) => {
      if (!driver) return;
      const updated = advance(maze, run, dir);
      setRun(updated);
      if (updated.finishedAt) recordBest(updated);
    },
    [driver, maze, run, recordBest]
  );

  useEffect(() => {
    if (!driver) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [driver, move]);

  if (!driver && !synced)
    return <p className="text-zinc-500">Waiting for the runner to enter the maze…</p>;

  const elapsed = (run.finishedAt || now) - run.startedAt;
  const runner = players.find((p) => p.id === wheel)?.name ?? "the runner";
  const guides = players.filter((p) => p.id !== wheel).map((p) => p.name).join(", ");

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-400">
        {driver
          ? `You are blind. Arrows, WASD or the on-screen pad. Listen to ${guides || "the room"}.`
          : `You see everything, you control nothing. Talk ${runner} to the exit.`}
      </p>
      <p className="text-center text-xs text-zinc-600">
        Walls stop you, traps throw you back to the start, the green tile is the way out.
      </p>

      {/* Anyone can hand the controls to anyone — including themselves. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="pixel text-[0.55rem] text-zinc-500">At the controls</span>
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => handOver(p.id)}
            className={`cab rounded-md px-3 py-1.5 text-sm ${
              p.id === wheel ? "cab-hot neon-green" : "text-zinc-400"
            }`}
          >
            {p.name}
            {p.id === me.id && " (you)"}
          </button>
        ))}
      </div>

      {/* Remounting on each trap springs the shake again. */}
      <div key={run.traps} className={run.traps ? "shake" : undefined}>
        <MazeBoard maze={maze} run={run} blind={driver} />
      </div>

      {/* Touch devices have no arrow keys — only they get the pad. */}
      {driver && (
        <div className="hidden w-44 grid-cols-3 gap-1.5 pointer-coarse:grid">
          {[
            [null, N, null],
            [W, null, E],
            [null, S, null],
          ].flat().map((dir, i) =>
            dir === null ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                onClick={() => move(dir)}
                aria-label={{ [N]: "up", [E]: "right", [S]: "down", [W]: "left" }[dir]}
                className="cab flex h-14 items-center justify-center rounded-sm text-emerald-400 active:border-emerald-500 active:text-emerald-300"
              >
                {/* One rotated triangle, not four arrow glyphs — the pixel font
                    only ships some of them, so the fallbacks never matched. */}
                <svg
                  viewBox="0 0 10 10"
                  aria-hidden
                  className="h-4 w-4"
                  style={{ transform: `rotate(${{ [N]: 0, [E]: 90, [S]: 180, [W]: 270 }[dir]}deg)` }}
                >
                  <polygon points="5,1.5 9,8.5 1,8.5" fill="currentColor" />
                </svg>
              </button>
            )
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-zinc-400">
        <span className="font-mono text-zinc-200">{secs(elapsed)}</span>
        {best !== null && <span>Best {secs(best)}</span>}
        <span>Traps {run.traps}</span>
        <span>Bumps {run.bumps}</span>
        <span>
          {run.size}×{run.size}
        </span>
        <span>{Math.max(0, players.length - 1)} guiding</span>
        {run.finishedAt > 0 && <span className="flash-win font-medium text-emerald-400">Escaped!</span>}
      </div>

      {driver && (
        <div className="flex items-center gap-2 text-sm">
          {SIZES.map((s) => (
            <button
              key={s.size}
              onClick={() => setRun(newRun(s.size))}
              className={`rounded px-3 py-1 ring-1 ${
                run.size === s.size ? "ring-emerald-600 text-emerald-400" : "ring-zinc-700"
              }`}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setRun(newRun(run.size))}
            className="btn-arcade rounded-sm px-3 py-2"
          >
            New maze
          </button>
        </div>
      )}
    </div>
  );
}
