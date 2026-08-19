"use client";

import { useCallback, useState } from "react";
import { LINES_EACH, lineCount, story, usable, wordFor, writerFor } from "@/lib/tale.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Table = {
  seed: string;

  order: string[];
  lines: string[];
  total: number;
};

export default function TallTale({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [draft, setDraft] = useState("");

  const host = players[0];
  const isHost = host?.id === me.id;
  const at = table?.lines.length ?? 0;
  const done = !!table && at >= table.total;
  const word = table && !done ? wordFor(table.seed, at) : "";
  const onClock = table && !done ? writerFor(table.order, at) : "";
  const myTurn = onClock === me.id;
  const ok = usable(draft, word);

  const publish = useBroadcast<Table>(`tale:${code}`, "table", (next) => {
    setTable(next);
    setDraft("");
  });

  const send = useCallback(
    (next: Table) => {
      setTable(next);
      publish(next);
    },
    [publish]
  );

  const add = () => {
    if (!table || !myTurn || !ok) return;
    send({ ...table, lines: [...table.lines, draft.trim()] });
    setDraft("");
  };

  const start = () =>
    send({
      seed: `${code}-${Date.now()}`,
      order: players.map((p) => p.id),
      lines: [],
      total: lineCount(players.length),
    });

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        One story, one line each, round and round. Your line has to contain the word you are
        given — nobody wins, the story just gets worse.
      </p>
      <p className="text-center text-xs text-zinc-600">
        {LINES_EACH} lines each, then the whole thing gets read back.
      </p>

      {table && (
        <div className="cab flex w-full flex-col gap-4 rounded-md p-5">
          <div className="flex items-center justify-between">
            <span className="pixel text-[0.55rem] text-zinc-500">
              Line {Math.min(at + 1, table.total)} of {table.total}
            </span>
            {!done && (
              <span className="pixel text-[0.55rem] text-zinc-500">
                {myTurn ? "your turn" : `${name(onClock)}'s turn`}
              </span>
            )}
          </div>

          <p className="font-sans text-base leading-relaxed text-zinc-300">
            {at ? (
              story(table.lines)
            ) : (
              <span className="text-zinc-600">Nothing yet. Somebody has to start it.</span>
            )}
          </p>

          {!done && (
            <>
              <p className="text-center font-sans text-sm text-zinc-400">
                Your word:{" "}
                <span className="neon-magenta pixel text-[0.7rem]">{word}</span>
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
                className="flex flex-col gap-2"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      add();
                    }
                  }}
                  disabled={!myTurn}
                  rows={2}
                  maxLength={200}
                  aria-label="Your line"
                  placeholder={myTurn ? `…and it involved a ${word}` : "Waiting for your turn…"}
                  className={`cab resize-none rounded-sm px-3 py-2 font-sans text-base outline-none disabled:opacity-50 ${
                    myTurn && draft && !ok ? "border-red-500" : "focus:border-emerald-500"
                  }`}
                />
                {myTurn && (
                  <button
                    type="submit"
                    disabled={!ok}
                    className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
                  >
                    {draft && !ok ? `Needs the word "${word}"` : "Add the line"}
                  </button>
                )}
              </form>
            </>
          )}

          {done && <p className="flash-win text-center text-emerald-400">The end.</p>}
        </div>
      )}

      {isHost ? (
        <button
          onClick={start}
          disabled={!!table && !done}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "New story" : "Start a story"}
        </button>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
