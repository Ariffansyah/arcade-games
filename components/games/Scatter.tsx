"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROMPT_COUNT, ROUND_MS, sheet, tally, usable } from "@/lib/scatter.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Table = {
  round: number;
  seed: string;
  phase: "write" | "score";
  startedAt: number;

  sheets: Record<string, string[]>;
  scores: Record<string, number>;
};

type Handin = { from: string; answers: string[] };

const blank = () => Array<string>(PROMPT_COUNT).fill("");

export default function Scatter({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [answers, setAnswers] = useState<string[]>(blank);
  const [handed, setHanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sent = useRef(0);

  const host = players[0];
  const isHost = host?.id === me.id;
  const card = table ? sheet(table.seed, table.round) : null;
  const left = table ? Math.max(0, table.startedAt + ROUND_MS - now) : 0;

  const publish = useBroadcast<Table>(`scatter:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.round !== next.round) {
        setAnswers(blank());
        setHanded(false);
      }
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

  const score = (sheets: Record<string, string[]>) => {
    const round = tally(sheets, card?.letter ?? "");
    const total = { ...(table?.scores ?? {}) };
    for (const [id, points] of Object.entries(round)) total[id] = (total[id] ?? 0) + points;
    return total;
  };

  const act = useBroadcast<Handin>(`scatter-act:${code}`, "handin", (h) => {
    if (!isHost || !table) return;
    const sheets = { ...table.sheets, [h.from]: h.answers };
    const everyone = players.every((p) => sheets[p.id]);
    send({
      ...table,
      sheets,
      phase: everyone ? "score" : table.phase,
      scores: everyone ? score(sheets) : table.scores,
    });
  });

  useEffect(() => {
    if (!table || table.phase !== "write") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [table]);

  useEffect(() => {
    if (!table || table.phase !== "write" || handed || sent.current === table.round) return;
    if (Date.now() < table.startedAt + ROUND_MS) return;
    sent.current = table.round;
    act({ from: me.id, answers });
  }, [table, now, handed, act, me.id, answers]);

  const start = () => {
    setAnswers(blank());
    setHanded(false);
    sent.current = 0;
    send({
      round: (table?.round ?? 0) + 1,
      seed: `${code}-${Date.now()}`,
      phase: "write",
      startedAt: Date.now(),
      sheets: {},
      scores: table?.scores ?? {},
    });
  };

  const handIn = () => {
    if (!table || handed) return;
    setHanded(true);
    sent.current = table.round;
    act({ from: me.id, answers });
    if (isHost) {
      const sheets = { ...table.sheets, [me.id]: answers };
      const everyone = players.every((p) => sheets[p.id]);
      send({
        ...table,
        sheets,
        phase: everyone ? "score" : table.phase,
        scores: everyone ? score(sheets) : table.scores,
      });
    }
  };

  const write = (slot: number, value: string) =>
    setAnswers((all) => all.map((a, i) => (i === slot ? value : a)));

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Five prompts, one letter, {ROUND_MS / 1000} seconds. Every answer has to start with the
        letter.
      </p>
      <p className="text-center text-xs text-zinc-600">
        A point per answer nobody else wrote. Write the same thing as someone else and you both get
        nothing — the obvious answer is the worthless one.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={`cab rounded-md px-3 py-1.5 text-sm ${p.id === me.id ? "cab-hot" : ""}`}
          >
            <span className="text-zinc-200">{p.name}</span>{" "}
            <span className="neon-green">{table?.scores[p.id] ?? 0}</span>
            {table?.phase === "write" && table.sheets[p.id] && (
              <span className="text-emerald-500"> ✓</span>
            )}
          </li>
        ))}
      </ul>

      {table && card && (
        <div className="cab flex w-full flex-col gap-3 rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="pixel text-[0.55rem] text-zinc-500">Round {table.round}</span>
            <span className="neon-magenta pixel text-2xl">{card.letter.toUpperCase()}</span>
            <span className={`font-mono ${left < 15000 ? "text-red-400" : "text-zinc-400"}`}>
              {Math.ceil(left / 1000)}s
            </span>
          </div>

          {card.prompts.map((prompt, slot) => (
            <label key={prompt} className="flex flex-col gap-1">
              <span className="font-sans text-sm text-zinc-400">{prompt}</span>
              <input
                value={answers[slot]}
                onChange={(e) => write(slot, e.target.value)}
                disabled={handed || table.phase === "score"}
                placeholder={`${card.letter.toUpperCase()}…`}
                className={`cab rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-60 ${
                  answers[slot] && !usable(answers[slot], card.letter) ? "border-red-500" : ""
                }`}
              />
            </label>
          ))}

          {table.phase === "write" ? (
            <button
              onClick={handIn}
              disabled={handed}
              className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
            >
              {handed ? "Handed in — waiting…" : "Hand it in"}
            </button>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              {Object.entries(table.sheets).map(([id, theirs]) => (
                <p key={id} className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-zinc-500">{name(id)}</span>
                  {theirs.map((answer, i) => (
                    <span
                      key={i}
                      className={
                        usable(answer, card.letter) ? "text-zinc-200" : "text-zinc-600 line-through"
                      }
                    >
                      {answer || "—"}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {isHost ? (
        <button
          onClick={start}
          disabled={!!table && table.phase === "write"}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "New round" : "Start"}
        </button>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
