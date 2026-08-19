"use client";

import { useCallback, useState } from "react";
import { groups, perfect, prompt, promptIndex, together } from "@/lib/samepage.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Table = {
  round: number;
  seed: string;
  avoid: number;
  phase: "write" | "reveal";
  answers: Record<string, string>;
  streak: number;
  best: number;
};

type Handin = { from: string; answer: string };

export default function SamePage({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [answer, setAnswer] = useState("");

  const [locked, setLocked] = useState(false);

  const host = players[0];
  const isHost = host?.id === me.id;
  const question = table ? prompt(table.seed, table.round, table.avoid) : "";
  const mine = table?.answers[me.id];

  const publish = useBroadcast<Table>(`same:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.round !== next.round) {
        setAnswer("");
        setLocked(false);
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

  const collect = useCallback(
    (from: string, said: string, current: Table) => {
      const answers = { ...current.answers, [from]: said };
      const everyone = players.every((p) => answers[p.id]);
      if (!everyone) return send({ ...current, answers });
      const nailed = perfect(answers, players.length);
      const streak = nailed ? current.streak + 1 : 0;
      send({
        ...current,
        answers,
        phase: "reveal",
        streak,
        best: Math.max(current.best, streak),
      });
    },
    [players, send]
  );

  const act = useBroadcast<Handin>(`same-act:${code}`, "handin", (h) => {
    if (!isHost || !table || table.phase !== "write") return;
    collect(h.from, h.answer, table);
  });

  const lock = () => {
    if (!table || table.phase !== "write" || !answer.trim() || mine || locked) return;
    setLocked(true);
    act({ from: me.id, answer });
    if (isHost) collect(me.id, answer, table);
  };

  const start = () => {
    const round = (table?.round ?? 0) + 1;
    send({
      round,
      seed: table?.seed ?? `${code}-${Date.now()}`,
      avoid: table ? promptIndex(table.seed, table.round, table.avoid) : -1,
      phase: "write",
      answers: {},
      streak: table?.streak ?? 0,
      best: table?.best ?? 0,
    });
    setAnswer("");
    setLocked(false);
  };

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const pack = table?.phase === "reveal" ? groups(table.answers) : [];
  const biggest = pack[0] ?? [];
  const matched = table?.phase === "reveal" ? together(table.answers) : 0;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Everyone answers the same prompt at once. You are trying to write the{" "}
        <span className="text-emerald-400">same thing as each other</span> — nobody is playing
        against anybody.
      </p>
      <p className="text-center text-xs text-zinc-600">
        One word or two. The whole room on one answer keeps the streak alive.
      </p>

      {table && (
        <div className="flex items-center gap-6 text-sm">
          <span className="text-zinc-400">
            Streak <span className="neon-green">{table.streak}</span>
          </span>
          <span className="text-zinc-500">best {table.best}</span>
        </div>
      )}

      {table && (
        <div className="cab flex w-full flex-col gap-4 rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="pixel text-[0.55rem] text-zinc-500">Round {table.round}</span>
            <span className="pixel text-[0.55rem] text-zinc-500">
              {Object.keys(table.answers).length}/{players.length} in
            </span>
          </div>

          <p className="text-center font-sans text-lg text-zinc-100">{question}</p>

          {table.phase === "write" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lock();
              }}
              className="flex gap-2"
            >
              <input
                value={mine ?? answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!mine || locked}
                maxLength={24}
                autoFocus
                spellCheck={false}
                aria-label="Your answer"
                placeholder="Same thing they'd say…"
                className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!!mine || locked || !answer.trim()}
                className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
              >
                {mine || locked ? "Locked" : "Lock it in"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <p
                className={`text-center ${
                  matched === players.length ? "flash-win neon-green" : "text-zinc-300"
                }`}
              >
                {matched === players.length
                  ? "Same page. All of you."
                  : matched > 1
                    ? `${matched} of ${players.length} matched`
                    : "Nobody matched. Bold, all of you."}
              </p>
              <ul className="flex flex-col gap-1 font-sans text-sm">
                {players.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="text-zinc-500">{name(p.id)}</span>
                    <span
                      className={biggest.includes(p.id) ? "text-emerald-400" : "text-zinc-300"}
                    >
                      {table.answers[p.id] || "—"}
                    </span>
                  </li>
                ))}
              </ul>
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
          {table ? "Next prompt" : "Start"}
        </button>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
