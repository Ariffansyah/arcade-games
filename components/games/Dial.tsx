"use client";

import { useCallback, useMemo, useState } from "react";
import { bandScore, giverFor, giverScore, pickSpectrum, seededTarget } from "@/lib/dial.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

/** Published by whoever is holding the dial — they are the only one who knows
 *  where the mark is, so they are the only one who can close the round. */
type Table = {
  round: number;
  /** Fixed for one sitting. Without it the spectra repeat every time the room
   *  re-opens the game at round 1. */
  seed: string;
  order: string[];
  phase: "clue" | "guess" | "reveal";
  clue: string;
  scores: Record<string, number>;
  /** 0 until the reveal — the mark never travels while it still matters. */
  target: number;
  guesses: Record<string, number>;
};

type Guess = { from: string; at: number };

export default function Dial({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [guesses, setGuesses] = useState<Record<string, number>>({});
  const [slider, setSlider] = useState(50);
  const [clue, setClue] = useState("");

  const host = players[0];
  const isHost = host?.id === me.id;
  const giver = table ? giverFor(table.order, table.round) : host?.id;
  const isGiver = giver === me.id;
  const spectrum = useMemo(
    () => pickSpectrum(table?.seed ?? code, table?.round ?? 1),
    [code, table?.seed, table?.round]
  );
  // A salt minted in this tab and never broadcast, so nobody else can work out
  // the mark. Every client rolls one; only the giver's is used or sent.
  const [salt] = useState(() => Math.random().toString(36).slice(2));
  const secret = useMemo(() => seededTarget(`${salt}:${table?.round ?? 0}`), [salt, table?.round]);

  const publish = useBroadcast<Table>(`dial:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.round !== next.round) {
        setGuesses({});
        setSlider(50);
        setClue("");
      }
      return next;
    });
    if (next.phase === "reveal") setGuesses(next.guesses);
  });

  const send = useCallback(
    (next: Table) => {
      setTable(next);
      publish(next);
    },
    [publish]
  );

  const close = useCallback(
    (current: Table, all: Record<string, number>) => {
      const scores = { ...current.scores };
      for (const [id, at] of Object.entries(all))
        scores[id] = (scores[id] ?? 0) + bandScore(at, secret);
      scores[me.id] = (scores[me.id] ?? 0) + giverScore(all, secret);
      send({ ...current, phase: "reveal", target: secret, guesses: all, scores });
    },
    [me.id, secret, send]
  );

  // Who still owes a guess, judged against who is actually in the room — the
  // round's frozen roster goes stale the moment somebody joins, leaves or reloads.
  const waiting = players.filter((p) => p.id !== giver);
  const missing = waiting.filter((p) => guesses[p.id] === undefined);

  const act = useBroadcast<Guess>(`dial-act:${code}`, "guess", (g) => {
    const all = { ...guesses, [g.from]: g.at };
    setGuesses(all);
    // The giver watches the count, because only the giver can score the round.
    if (isGiver && table?.phase === "guess" && waiting.every((p) => all[p.id] !== undefined))
      close(table, all);
  });

  const start = () =>
    send({
      round: (table?.round ?? 0) + 1,
      seed: table?.seed ?? `${code}-${Date.now()}`,
      order: players.map((p) => p.id),
      phase: "clue",
      clue: "",
      scores: table?.scores ?? {},
      target: 0,
      guesses: {},
    });

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const mine = guesses[me.id];
  const marks = table?.phase === "reveal" ? Object.entries(table.guesses) : [];

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        One of you sees where the mark sits on the dial and gives a single clue. Everyone else
        slides to where they think it is.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Dead on is 4 points, close is 3, near is 2, in the region is 1. The clue-giver scores the
        best read anyone got.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={`cab rounded-md px-3 py-1.5 text-sm ${p.id === giver ? "cab-hot" : ""}`}
          >
            <span className="text-zinc-200">{p.name}</span>{" "}
            <span className="neon-green">{table?.scores[p.id] ?? 0}</span>
            {p.id === giver && <span className="text-zinc-500"> · dial</span>}
          </li>
        ))}
      </ul>

      {table && (
        <div className="cab flex w-full flex-col gap-4 rounded-md p-5">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>{spectrum[0]}</span>
            <span className="pixel text-[0.55rem] text-zinc-600">Round {table.round}</span>
            <span>{spectrum[1]}</span>
          </div>

          {/* The dial. The mark only ever renders for the giver, or after the reveal. */}
          <div className="relative h-10 w-full rounded-sm bg-[linear-gradient(90deg,#22d3ee,#39ff88,#ffc83d,#ff2d95)]">
            {(isGiver || table.phase === "reveal") && (
              <span
                className="absolute top-0 h-10 w-1 -translate-x-1/2 bg-zinc-950 shadow-[0_0_10px_#000]"
                style={{ left: `${table.phase === "reveal" ? table.target : secret}%` }}
              />
            )}
            {marks.map(([id, at]) => (
              <span
                key={id}
                className="absolute -bottom-6 -translate-x-1/2 whitespace-nowrap text-[0.6rem] text-zinc-300"
                style={{ left: `${at}%` }}
              >
                ▲ {name(id)}
              </span>
            ))}
          </div>
          <div className={marks.length ? "h-6" : ""} />

          {table.phase === "clue" &&
            (isGiver ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (clue.trim()) send({ ...table, phase: "guess", clue: clue.trim() });
                }}
                className="flex gap-2"
              >
                <input
                  value={clue}
                  onChange={(e) => setClue(e.target.value)}
                  placeholder="One clue for that spot"
                  className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500"
                />
                <button type="submit" className="btn-arcade rounded-sm px-4 py-2">
                  Give clue
                </button>
              </form>
            ) : (
              <p className="blink text-center text-sm text-zinc-500">
                {name(giver ?? "")} is thinking of a clue…
              </p>
            ))}

          {table.phase !== "clue" && (
            <p className="text-center text-lg text-zinc-100">“{table.clue}”</p>
          )}

          {table.phase === "guess" &&
            (isGiver ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-center text-sm text-zinc-500">
                  {waiting.length - missing.length}/{waiting.length} guesses in
                  {missing.length > 0 && ` · waiting on ${missing.map((p) => p.name).join(", ")}`}
                </p>
                {/* Nobody should be held hostage by a tab that wandered off. */}
                <button
                  onClick={() => close(table, guesses)}
                  className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
                >
                  Reveal now
                </button>
              </div>
            ) : mine === undefined ? (
              <div className="flex flex-col gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  aria-label="Your guess on the dial"
                  className="w-full accent-emerald-500"
                />
                <button
                  onClick={() => {
                    setGuesses((all) => ({ ...all, [me.id]: slider }));
                    act({ from: me.id, at: slider });
                  }}
                  className="btn-arcade self-center rounded-sm px-4 py-2"
                >
                  Lock it in
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-500">
                Locked at {mine}. Waiting for the rest…
              </p>
            ))}

          {table.phase === "reveal" && (
            <p className="flash-win text-center text-sm text-emerald-400">
              The mark was at {table.target}.
            </p>
          )}
        </div>
      )}

      {/* The giver moves the room on after a reveal; the host can always move it
          on, so an absent giver never parks the round. */}
      {(isHost || (isGiver && table?.phase === "reveal")) && (
        <button
          onClick={start}
          disabled={players.length < 3}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "Next round" : "Start"}
        </button>
      )}
      {!table && !isHost && (
        <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
      {players.length < 3 && (
        <span className="blink text-sm text-amber-400">Needs 3 players or more.</span>
      )}
    </div>
  );
}
