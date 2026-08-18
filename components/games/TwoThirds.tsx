"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX, winners } from "@/lib/twothirds.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

/** Picks stay in the tab that made them until the host calls the reveal — that
 *  is the only thing keeping the round honest. */
type Table = {
  round: number;
  phase: "pick" | "reveal";
  ready: string[];
  picks: Record<string, number>;
  scores: Record<string, number>;
};

type Act = { from: string; pick?: number };

export default function TwoThirds({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [pick, setPick] = useState(33);
  const [locked, setLocked] = useState(false);


  const host = players[0];
  const isHost = host?.id === me.id;

  const publish = useBroadcast<Table>(`thirds:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.round !== next.round) setLocked(false);
      return next;
    });
  });

  const send = useCallback(
    (next: Table) => {
      setTable(next);
      publish(next);
    },
    [publish]
  );

  const act = useBroadcast<Act>(`thirds-act:${code}`, "act", (a) => {
    if (!isHost || !table) return;
    if (a.pick === undefined) {
      if (!table.ready.includes(a.from)) send({ ...table, ready: [...table.ready, a.from] });
      return;
    }
    const picks = { ...table.picks, [a.from]: a.pick };
    if (Object.keys(picks).length < players.length) {
      send({ ...table, picks });
      return;
    }
    const { ids } = winners(picks);
    const scores = { ...table.scores };
    for (const id of ids) scores[id] = (scores[id] ?? 0) + 1;
    send({ ...table, picks, scores });
  });

  // The reveal is the cue for every tab to hand its number over — once. The host
  // put its own in when it called the reveal, so it never gets here.
  const handed = useRef(0);
  useEffect(() => {
    if (!table || table.phase !== "reveal") return;
    if (table.picks[me.id] !== undefined || handed.current === table.round) return;
    handed.current = table.round;
    act({ from: me.id, pick });
  }, [table, act, me.id, pick]);

  const callReveal = () => {
    if (!table) return;
    send({ ...table, phase: "reveal", picks: { ...table.picks, [me.id]: pick } });
  };

  const start = () => {
    setLocked(false);
    send({
      round: (table?.round ?? 0) + 1,
      phase: "pick",
      ready: [],
      picks: {},
      scores: table?.scores ?? {},
    });
  };

  const lockIn = () => {
    if (!table || locked) return;
    setLocked(true);
    act({ from: me.id });
    if (isHost && !table.ready.includes(me.id))
      send({ ...table, ready: [...table.ready, me.id] });
  };

  const result = table && table.phase === "reveal" ? winners(table.picks) : null;
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const shown = table ? Object.keys(table.picks).length : 0;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Everyone picks a number from 0 to {MAX}. Closest to two thirds of the room&apos;s average
        takes the round.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Pick high and you drag the average up for everyone else. Pick low and you are betting the
        rest of the room does too. Ties split the point.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={`cab rounded-md px-3 py-1.5 text-sm ${p.id === me.id ? "cab-hot" : ""} ${
              result?.ids.includes(p.id) ? "flash-win" : ""
            }`}
          >
            <span className="text-zinc-200">{p.name}</span>{" "}
            <span className="neon-green">{table?.scores[p.id] ?? 0}</span>
            {table?.phase === "reveal" && table.picks[p.id] !== undefined && (
              <span className="text-zinc-400"> · {table.picks[p.id]}</span>
            )}
            {table?.phase === "pick" && table.ready.includes(p.id) && (
              <span className="text-emerald-500"> ✓</span>
            )}
          </li>
        ))}
      </ul>

      {table?.phase === "pick" && (
        <div className="cab flex w-full max-w-md flex-col items-center gap-3 rounded-md p-5">
          <span className="pixel text-[0.55rem] text-zinc-500">Round {table.round}</span>
          <span className="neon-cyan pixel text-2xl">{pick}</span>
          <input
            type="range"
            min={0}
            max={MAX}
            value={pick}
            disabled={locked}
            onChange={(e) => setPick(Number(e.target.value))}
            aria-label="Your number"
            className="w-full accent-emerald-500 disabled:opacity-40"
          />
          <button
            onClick={lockIn}
            disabled={locked}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            {locked ? "Locked in" : "Lock it in"}
          </button>
          <span className="text-sm text-zinc-500">
            {table.ready.length}/{players.length} locked in
          </span>
        </div>
      )}

      {table?.phase === "reveal" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm text-zinc-400">
            {shown}/{players.length} numbers in
          </span>
          {result && shown > 0 && (
            <>
              <span className="text-lg text-zinc-100">
                Two thirds of the average is{" "}
                <span className="neon-cyan">{result.mark.toFixed(1)}</span>
              </span>
              <span className="flash-win text-emerald-400">
                {result.ids.map(name).join(" & ")} {result.ids.length > 1 ? "split it" : "takes it"}
              </span>
            </>
          )}
        </div>
      )}

      {isHost ? (
        <div className="flex gap-2">
          <button onClick={start} className="btn-arcade rounded-sm px-4 py-2">
            {table ? "New round" : "Start"}
          </button>
          {table?.phase === "pick" && (
            <button
              onClick={callReveal}
              className="btn-ghost rounded-sm px-4 py-2"
            >
              Reveal
            </button>
          )}
        </div>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
