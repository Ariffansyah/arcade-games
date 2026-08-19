"use client";

import { useCallback, useEffect, useState } from "react";
import { LIVES, burn, isValid, newFuse, survive, type Fuse as Round } from "@/lib/fuse.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Answer = { from: string; name: string; word: string };

export default function Fuse({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Round | null>(null);
  const [log, setLog] = useState<Answer[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const host = players[0];
  const isHost = host?.id === me.id;

  const publish = useBroadcast<Round>(`fuse:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.round !== next.round) setLog([]);
      return next;
    });
  });

  const send = useCallback(
    (next: Round) => {
      setTable(next);
      publish(next);
    },
    [publish]
  );

  const act = useBroadcast<Answer>(`fuse-act:${code}`, "answer", (a) => {
    setLog((all) => [...all, a].slice(-30));

    if (isHost && table && !table.winner) send(survive(table, a.word));
  });

  const onClock = table && !table.winner ? table.order[table.turn] : "";
  const myTurn = onClock === me.id;
  const left = table ? Math.max(0, table.startedAt + table.fuse - now) : 0;

  useEffect(() => {
    if (!table || table.winner) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [table]);

  useEffect(() => {
    if (!isHost || !table || table.winner) return;
    const id = setInterval(() => {
      if (Date.now() > table.startedAt + table.fuse) send(burn(table));
    }, 250);
    return () => clearInterval(id);
  }, [isHost, table, send]);

  const start = () => {
    setLog([]);

    send(newFuse(`${code}-${Date.now()}`, players.map((p) => p.id), (table?.round ?? 0) + 1));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!table || !myTurn) return;
    if (!isValid(text, table.letter, table.used)) {
      setError(
        table.used.includes(text.trim().toLowerCase())
          ? "Already used this round."
          : `Needs to start with ${table.letter.toUpperCase()}.`
      );
      return;
    }
    const answer: Answer = { from: me.id, name: me.name, word: text.trim() };
    setError("");
    setText("");
    setLog((all) => [...all, answer].slice(-30));
    act(answer);
    if (isHost) send(survive(table, answer.word));
  };

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Name something in the category starting with the letter — before the fuse burns out. Two
        lives each, last one standing wins.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Every answer shortens the next fuse by a second, down to five. No repeats. The room is the
        judge on whether it really fits the category.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => {
          const lives = table?.lives[p.id] ?? LIVES;
          const out = !!table && lives === 0;
          return (
            <li
              key={p.id}
              className={`cab rounded-md px-3 py-1.5 text-sm ${
                onClock === p.id ? "cab-hot" : ""
              } ${out ? "opacity-40" : ""}`}
            >
              <span className={out ? "text-zinc-500 line-through" : "text-zinc-200"}>{p.name}</span>{" "}
              <span className="text-red-400">{"♥".repeat(lives) || "—"}</span>
            </li>
          );
        })}
      </ul>

      {table && !table.winner && (
        <div className="cab flex w-full max-w-md flex-col items-center gap-3 rounded-md p-5">
          <span className="pixel text-[0.55rem] text-zinc-500">Round {table.round}</span>
          <span className="text-lg text-zinc-200">
            {table.category} starting with{" "}
            <span className="neon-magenta pixel text-xl">{table.letter.toUpperCase()}</span>
          </span>
          <span className={`font-mono text-2xl ${left < 4000 ? "text-red-400" : "text-zinc-300"}`}>
            {(left / 1000).toFixed(1)}s
          </span>
          <div className="h-1 w-full overflow-hidden rounded bg-zinc-800">
            <div
              className={`h-full ${left < 4000 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${(left / table.fuse) * 100}%` }}
            />
          </div>
          <span className="text-sm text-zinc-400">
            {myTurn ? "You are on the clock." : `${name(onClock)} is on the clock.`}
          </span>

          <form onSubmit={submit} className="flex w-full gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!myTurn}
              autoFocus={myTurn}
              placeholder={myTurn ? `${table.letter.toUpperCase()}…` : "Not your turn"}
              className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!myTurn}
              className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
            >
              Say it
            </button>
          </form>
          {error && myTurn && <span className="text-sm text-red-400">{error}</span>}
        </div>
      )}

      {table?.winner && (
        <p className="flash-win text-center">
          <span className="neon-green pixel text-[0.7rem]">{name(table.winner)} survives!</span>
        </p>
      )}

      {log.length > 0 && (
        <p className="max-w-md text-center text-sm text-zinc-500">
          {log.map((a, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span className="text-zinc-300">{a.word}</span>
            </span>
          ))}
        </p>
      )}

      {isHost ? (
        <button
          onClick={start}
          disabled={players.length < 2 || (!!table && !table.winner)}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "New round" : "Light the fuse"}
        </button>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
