"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBroadcast } from "@/lib/useBroadcast";
import { score, tally, type Phase } from "@/lib/imposter.ts";
import type { GameProps, Player } from "@/lib/useRoom";

type Reveal = { word: string; imposterId: string };

/** The whole round, published by the host. Everyone else just renders it. */
type Table = {
  n: number;
  /** Fixed for one sitting; stands in for the room code when the server deals,
   *  so re-opening the game can't deal the same word and the same imposter. */
  seed: string;
  phase: Phase;
  roster: Player[];
  scores: Record<string, number>;
  reveal: Reveal | null;
};

type Act = { kind: "clue" | "vote"; from: string; value: string };

// Stable identity: a fresh [] every render would re-run every effect below it.
const NOBODY: Player[] = [];

export default function Imposter({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  // Refs are the source of truth: two acts landing in one render would make a
  // state-derived copy drop one of them, and a lost clue stalls the round.
  const clueBox = useRef<Record<string, string>>({});
  const voteBox = useRef<Record<string, string>>({});
  const [clues, setClues] = useState<Record<string, string>>({});
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [role, setRole] = useState<{ imposter: boolean; word?: string } | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const closing = useRef(0);

  const host = players[0];
  const isHost = host?.id === me.id;
  const roster = table?.roster ?? NOBODY;
  const ids = useMemo(() => roster.map((p) => p.id), [roster]);
  const playing = ids.includes(me.id);

  const publish = useBroadcast<Table>(`imposter:${code}`, "table", (next) => {
    setTable((prev) => {
      if (!prev || prev.n !== next.n) {
        clueBox.current = {};
        voteBox.current = {};
        setClues({});
        setVotes({});
        setRole(null);
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

  /** Only the host advances the round, so there is exactly one writer. */
  const advance = () => {
    if (!isHost || !table || table.reveal) return;
    const clued = clueBox.current;
    const voted = voteBox.current;

    if (table.phase === "clue" && ids.every((id) => clued[id])) {
      send({ ...table, phase: "vote" });
      return;
    }
    if (table.phase !== "vote" || !ids.every((id) => voted[id]) || closing.current === table.n)
      return;

    closing.current = table.n;
    (async () => {
      try {
        const response = await fetch("/api/imposter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: table.seed, round: table.n, ids, reveal: true }),
        });
        const reveal: Reveal = await response.json();
        const { accused } = tally(voted);
        send({
          ...table,
          phase: "reveal",
          reveal,
          scores: score(table.scores, ids, reveal.imposterId, accused),
        });
      } catch {
        closing.current = 0;
        setError("Could not close the round.");
      }
    })();
  };

  const record = (a: Act) => {
    const box = a.kind === "clue" ? clueBox : voteBox;
    box.current = { ...box.current, [a.from]: a.value };
    (a.kind === "clue" ? setClues : setVotes)(box.current);
    advance();
  };

  const act = useBroadcast<Act>(`imposter-act:${code}`, "act", record);

  // Each player asks the server for their own role — the word never travels
  // through the room, so the imposter has nothing to read.
  useEffect(() => {
    if (!table || !playing || role) return;
    let live = true;
    (async () => {
      try {
        const response = await fetch("/api/imposter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code: table.seed, round: table.n, ids, playerId: me.id }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not deal the round.");
        if (live) setRole(body);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Could not deal the round.");
      }
    })();
    return () => {
      live = false;
    };
  }, [table, playing, role, code, me.id, ids]);

  const start = () => {
    // `send` skips the broadcast handler, so the host clears its own round here.
    clueBox.current = {};
    voteBox.current = {};
    setClues({});
    setVotes({});
    setRole(null);
    send({
      n: (table?.n ?? 0) + 1,
      seed: table?.seed ?? `${code}-${Date.now()}`,
      phase: "clue",
      roster: players,
      scores: table?.scores ?? {},
      reveal: null,
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim().split(/\s+/)[0];
    if (!value) return;
    act({ kind: "clue", from: me.id, value });
    record({ kind: "clue", from: me.id, value });
    setText("");
  };

  const vote = (target: string) => {
    act({ kind: "vote", from: me.id, value: target });
    record({ kind: "vote", from: me.id, value: target });
  };

  const name = (id: string) => roster.find((p) => p.id === id)?.name ?? "?";
  const counts = tally(votes).counts;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Everyone gets the same secret word — except one of you. Give a one-word clue, then vote
        out the faker.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Catch the imposter: every detective scores 1. Miss, or split the vote, and the imposter
        takes 2. A clue too obvious hands them the word.
      </p>

      {table && (
        <div className="flex items-center gap-2 text-[0.6rem]">
          <span className="pixel text-zinc-500">Round {table.n}</span>
          {(["clue", "vote", "reveal"] as const).map((step) => (
            <span
              key={step}
              className={`pixel rounded-sm px-2 py-1 ${
                table.phase === step ? "neon-cyan cab cab-hot" : "text-zinc-700"
              }`}
            >
              {step}
            </span>
          ))}
        </div>
      )}

      {players.length < 3 && (
        <p className="blink text-center text-sm text-amber-400">Needs 3 players or more.</p>
      )}

      {table && (
        <ul className="flex w-full flex-wrap justify-center gap-2">
          {(table.roster.length ? table.roster : players).map((p) => (
            <li
              key={p.id}
              className={`cab rounded-md px-3 py-2 text-sm ${p.id === me.id ? "cab-hot" : ""}`}
            >
              <span className="text-zinc-200">{p.name}</span>{" "}
              <span className="neon-green">{table.scores[p.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      )}

      {table?.phase === "clue" && playing && (
        <div className="cab flex w-full flex-col items-center gap-3 rounded-md p-4">
          {!role ? (
            <span className="blink text-zinc-500">Dealing…</span>
          ) : role.imposter ? (
            <span className="neon-magenta pixel text-[0.7rem]">You are the imposter</span>
          ) : (
            <span className="pixel text-[0.7rem] text-zinc-100">
              Word: <span className="neon-cyan">{role.word}</span>
            </span>
          )}
          <form onSubmit={submit} className="flex w-full max-w-md gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!role || !!clues[me.id]}
              placeholder={clues[me.id] ? `Your clue: ${clues[me.id]}` : "One word clue"}
              className="cab flex-1 rounded-sm px-3 py-2 font-sans text-base outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!role || !!clues[me.id]}
              className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
            >
              Send
            </button>
          </form>
          <span className="text-sm text-zinc-500">
            {Object.keys(clues).length}/{roster.length} clues in
          </span>
        </div>
      )}

      {table && table.phase !== "clue" && (
        <ul className="w-full">
          {roster.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-1 text-sm">
              <span className="text-zinc-400">{p.name}</span>
              <span className="flex-1 border-b border-dashed border-zinc-800" />
              <span className="text-zinc-100">{clues[p.id] ?? "—"}</span>
              {table.phase === "vote" ? (
                <button
                  onClick={() => vote(p.id)}
                  disabled={!playing || p.id === me.id || !!votes[me.id]}
                  className="btn-ghost rounded-sm px-2 py-1 text-[0.6rem] disabled:opacity-30"
                >
                  {votes[me.id] === p.id ? "voted" : "accuse"}
                </button>
              ) : (
                <span className="w-16 text-right text-zinc-500">{counts[p.id] ?? 0} votes</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {table?.phase === "vote" && (
        <span className="text-sm text-zinc-500">
          {Object.keys(votes).length}/{roster.length} votes in
        </span>
      )}

      {table?.reveal && (
        <p className="flash-win text-center text-sm">
          <span className="neon-magenta">{name(table.reveal.imposterId)}</span> was the imposter.
          The word was <span className="neon-cyan">{table.reveal.word}</span>.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {isHost ? (
        <button
          onClick={start}
          disabled={players.length < 3 || (!!table && table.phase !== "reveal")}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "Next round" : "Start"}
        </button>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}
