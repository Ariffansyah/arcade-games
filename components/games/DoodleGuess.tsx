"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isClose, isCorrect } from "@/lib/doodle.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Doodle = {
  round: number;

  word: string;
  paths: string[];
  startedAt: number;

  solvedBy: string;
  solvedName: string;
  solvedAt: number;

  giveUp: string[];
  gaveUp: boolean;

  score: number;
  scores: Record<string, number>;
};

type Guess = { id: string; name: string; text: string; correct: boolean; close: boolean };

const HINTS = [40_000, 70_000];

const secs = (ms: number) => `${Math.floor(ms / 1000)}s`;

function blanks(word: string, age: number) {
  return [...word]
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (i === 0 && age > HINTS[0]) return ch.toUpperCase();
      if (i === word.length - 1 && age > HINTS[1]) return ch.toUpperCase();
      return "_";
    })
    .join(" ");
}

export default function DoodleGuess({ code, players, me }: GameProps) {
  const [round, setRound] = useState<Doodle | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [text, setText] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");
  const [best, setBest] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const log = useRef<HTMLDivElement>(null);

  const host = players[0];
  const isHost = host?.id === me.id;

  const noteSolve = useCallback((d: Doodle) => {
    if (d.solvedAt) setBest((b) => Math.min(b ?? Infinity, d.solvedAt - d.startedAt));
  }, []);

  const write = useCallback(
    async (next: Doodle) => {
      setRound(next);
      noteSolve(next);
      await supabase.from("game_state").upsert({
        room_code: code,
        game: "doodle",
        state: next,
        updated_at: new Date().toISOString(),
      });
    },
    [code, noteSolve]
  );

  useEffect(() => {
    const ch = supabase
      .channel(`doodle:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: `room_code=eq.${code}` },
        (payload) => {
          const next = (payload.new as { state: Doodle }).state;
          noteSolve(next);
          setRound((prev) => {
            if (prev && next.round !== prev.round) setGuesses([]);
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code, noteSolve]);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("game_state")
        .select("game, state")
        .eq("room_code", code)
        .maybeSingle();
      if (live && data?.game === "doodle") setRound(data.state as Doodle);
    })();
    return () => {
      live = false;
    };
  }, [code]);

  const send = useBroadcast<Guess>(`doodle:${code}`, "guess", (payload) =>
    setGuesses((g) => [...g, payload].slice(-60))
  );

  const over = !!round && (!!round.solvedBy || round.gaveUp);
  const age = round ? (round.solvedAt || (over ? round.startedAt : now)) - round.startedAt : 0;
  const live = round && !over ? now - round.startedAt : age;

  const quitters = round?.giveUp ?? [];
  const scores = round?.scores ?? {};

  useEffect(() => {
    if (!round || over) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [round, over]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [guesses]);

  const newDrawing = async () => {
    setDrawing(true);
    setError("");
    try {
      const response = await fetch("/api/doodle", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Drawing failed.");
      setGuesses([]);
      await write({
        round: (round?.round ?? 0) + 1,
        word: body.word,
        paths: body.paths,
        startedAt: Date.now(),
        solvedBy: "",
        solvedName: "",
        solvedAt: 0,
        giveUp: [],
        gaveUp: false,
        score: round?.score ?? 0,
        scores,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drawing failed.");
    } finally {
      setDrawing(false);
    }
  };

  const guess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!round || over || !text.trim()) return;
    const entry: Guess = {
      id: me.id,
      name: me.name,
      text: text.trim(),
      correct: isCorrect(text, round.word),
      close: isClose(text, round.word),
    };
    setGuesses((g) => [...g, entry].slice(-60));
    send(entry);
    setText("");
    if (entry.correct)
      write({
        ...round,
        solvedBy: me.id,
        solvedName: me.name,
        solvedAt: Date.now(),
        score: round.score + 1,
        scores: { ...scores, [me.id]: (scores[me.id] ?? 0) + 1 },
      });
  };

  const voteGiveUp = () => {
    if (!round || over || quitters.includes(me.id)) return;
    const next = [...quitters, me.id];
    write({ ...round, giveUp: next, gaveUp: next.length >= players.length });
  };

  const mine = guesses.filter((g) => g.id === me.id).length;
  const closeCalls = guesses.filter((g) => g.close && !g.correct).length;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-400">
        Nobody draws. The machine does — the whole room races to name it.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={`cab rounded-md px-3 py-1.5 text-sm ${p.id === me.id ? "cab-hot" : ""} ${
              round?.solvedBy === p.id ? "flash-win" : ""
            }`}
          >
            <span className="text-zinc-200">{p.name}</span>{" "}
            <span className="neon-green">{scores[p.id] ?? 0}</span>
            {quitters.includes(p.id) && !over && <span className="text-red-400"> ✕</span>}
          </li>
        ))}
      </ul>

      <svg viewBox="0 0 400 300" className="cab w-full max-w-xl rounded-md">
        {round?.paths.map((d, i) => (
          <path
            key={`${round.round}-${i}`}
            d={d}
            className="draw-path"
            style={{ "--len": "900", animationDelay: `${i * 0.14}s` } as React.CSSProperties}
            fill="none"
            stroke="#5cff9d"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {!round && (
          <text x={200} y={150} textAnchor="middle" fill="#52525b" fontSize={14}>
            {drawing ? "drawing…" : "no drawing yet"}
          </text>
        )}
      </svg>

      {round && !over && (
        <p className="pixel text-[0.7rem] tracking-[0.35em] text-zinc-300">
          {blanks(round.word, live)}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-zinc-400">
        {round && <span>Round {round.round}</span>}
        {round && <span>Solved {round.score}</span>}
        {round && !over && <span className="font-mono text-zinc-200">{secs(live)}</span>}
        {best !== null && <span>Best {secs(best)}</span>}
        {round && (
          <span>
            {guesses.length} guesses · {mine} yours · {closeCalls} close
          </span>
        )}
        <span>{players.length} in the room</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {round?.solvedBy ? (
          <span className="flash-win font-medium text-emerald-400">
            {round.solvedName} got it: {round.word} ({secs(round.solvedAt - round.startedAt)})
          </span>
        ) : round?.gaveUp ? (
          <span className="text-red-400">Nobody got it. It was {round.word}.</span>
        ) : null}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      <div className="flex w-full max-w-xl flex-col gap-2">
        <div ref={log} className="cab h-24 overflow-y-auto rounded-md p-3 text-sm sm:h-32">
          {guesses.length === 0 && <p className="text-zinc-600">Shout your guesses here.</p>}
          {guesses.map((g, i) => (
            <p
              key={i}
              className={
                g.correct
                  ? "font-medium text-emerald-400"
                  : g.close
                    ? "text-amber-400"
                    : "text-zinc-300"
              }
            >
              <span className="text-zinc-500">{g.name}</span> {g.text}
              {!g.correct && g.close && <span className="text-amber-500"> — so close!</span>}
            </p>
          ))}
        </div>

        <form onSubmit={guess} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!round || over}
            placeholder={over ? "Round over" : "What is it?"}
            className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!round || over}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            Guess
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {isHost ? (
          <button
            onClick={newDrawing}
            disabled={drawing}
            className="btn-arcade rounded-sm px-3 py-2 disabled:opacity-40"
          >
            {drawing ? "Drawing…" : round ? "New drawing" : "Start"}
          </button>
        ) : (
          !round && <span className="blink text-zinc-500">Waiting for {host?.name}…</span>
        )}
        {round && !over && (
          <button
            onClick={voteGiveUp}
            disabled={quitters.includes(me.id)}
            className="btn-ghost btn-danger rounded-sm px-3 py-2 disabled:opacity-40"
          >
            {quitters.includes(me.id)
              ? `Waiting… (${quitters.length}/${players.length})`
              : `Give up (${quitters.length}/${players.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
