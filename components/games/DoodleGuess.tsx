"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isCorrect } from "@/lib/doodle.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Doodle = {
  round: number;
  /** The answer. Never rendered until the round is over. */
  word: string;
  paths: string[];
  startedAt: number;
  solvedBy: 0 | 1 | 2;
  solvedAt: number;
  gaveUp: boolean;
  score: number;
};

type Guess = { slot: number; text: string; correct: boolean };

const secs = (ms: number) => `${Math.floor(ms / 1000)}s`;

export default function DoodleGuess({ code, slot }: GameProps) {
  const [round, setRound] = useState<Doodle | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [text, setText] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const log = useRef<HTMLDivElement>(null);

  const write = useCallback(
    async (next: Doodle) => {
      setRound(next); // optimistic; Postgres Changes echoes the same row back
      await supabase.from("game_state").upsert({
        room_code: code,
        game: "doodle",
        state: next,
        updated_at: new Date().toISOString(),
      });
    },
    [code]
  );

  useEffect(() => {
    const ch = supabase
      .channel(`doodle:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: `room_code=eq.${code}` },
        (payload) => {
          const next = (payload.new as { state: Doodle }).state;
          setRound((prev) => {
            if (prev && next.round !== prev.round) setGuesses([]); // new drawing, fresh chat
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code]);

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
    setGuesses((g) => [...g, payload].slice(-40))
  );

  const over = !!round && (round.solvedBy > 0 || round.gaveUp);

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
        solvedBy: 0,
        solvedAt: 0,
        gaveUp: false,
        score: round?.score ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drawing failed.");
    } finally {
      setDrawing(false);
    }
  };

  const guess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!round || over || !slot || !text.trim()) return;
    const entry: Guess = { slot, text: text.trim(), correct: isCorrect(text, round.word) };
    setGuesses((g) => [...g, entry].slice(-40));
    send(entry);
    setText("");
    if (entry.correct)
      write({ ...round, solvedBy: slot, solvedAt: Date.now(), score: round.score + 1 });
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-sm text-zinc-400">
        Nobody draws. The machine does — you two work out what it is.
      </p>

      <svg
        viewBox="0 0 400 300"
        className="cab w-full max-w-xl rounded-md"
      >
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

      <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-zinc-400">
        {round && <span>Solved {round.score}</span>}
        {round && !over && <span className="font-mono text-zinc-200">{secs(now - round.startedAt)}</span>}
        {round?.solvedBy ? (
          <span className="flash-win font-medium text-emerald-400">
            Player {round.solvedBy} got it: {round.word} ({secs(round.solvedAt - round.startedAt)})
          </span>
        ) : round?.gaveUp ? (
          <span className="text-red-400">It was {round.word}.</span>
        ) : null}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      <div className="flex w-full max-w-xl flex-col gap-2">
        <div ref={log} className="cab h-24 overflow-y-auto rounded-md p-3 text-sm sm:h-32">
          {guesses.length === 0 && <p className="text-zinc-600">Shout your guesses here.</p>}
          {guesses.map((g, i) => (
            <p key={i} className={g.correct ? "font-medium text-emerald-400" : "text-zinc-300"}>
              <span className="text-zinc-500">P{g.slot}</span> {g.text}
            </p>
          ))}
        </div>

        <form onSubmit={guess} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!round || over || !slot}
            placeholder={over ? "Round over" : "What is it?"}
            className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!round || over || !slot}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            Guess
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {slot === 1 && (
          <button
            onClick={newDrawing}
            disabled={drawing}
            className="btn-arcade rounded-sm px-3 py-2 disabled:opacity-40"
          >
            {drawing ? "Drawing…" : round ? "New drawing" : "Start"}
          </button>
        )}
        {round && !over && (
          <button
            onClick={() => write({ ...round, gaveUp: true })}
            className="btn-ghost btn-danger rounded-sm px-3 py-2"
          >
            Give up
          </button>
        )}
      </div>
    </div>
  );
}
