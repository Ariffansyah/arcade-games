"use client";

import { useCallback, useEffect, useState } from "react";
import { LIVES, fumble, newChain, recite, sequence, type Chain as Run } from "@/lib/chain.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

const PAD_COLOURS = ["#39ff88", "#22d3ee", "#ff2d95", "#ffc83d"];
/** One frame lit, one frame dark. Without the dark frame two of the same pad in
 *  a row read as a single long flash and the sequence looks shorter than it is. */
const FRAME = 300;

type Act = { from: string; ok: boolean };

export default function Chain({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Run | null>(null);
  // Playback position for the current turn. Ahead of the sequence means "your go".
  const [play, setPlay] = useState({ key: "", step: -1 });
  const [typed, setTyped] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const [tapped, setTapped] = useState(-1);

  const host = players[0];
  const isHost = host?.id === me.id;

  const publish = useBroadcast<Run>(`chain:${code}`, "table", (next) => {
    setTable(next);
    setTyped([]);
    setWrong(false);
  });

  const send = useCallback(
    (next: Run) => {
      setTable(next);
      setTyped([]);
      setWrong(false);
      publish(next);
    },
    [publish]
  );

  const act = useBroadcast<Act>(`chain-act:${code}`, "call", (a) => {
    // One writer: the host turns a call into the next turn.
    if (!isHost || !table || table.winner || table.order[table.turn] !== a.from) return;
    send(a.ok ? recite(table) : fumble(table));
  });

  const onClock = table && !table.winner ? table.order[table.turn] : "";
  const myTurn = onClock === me.id;
  const key = table ? `${table.round}-${table.turn}-${table.level}` : "";
  const pads = table ? sequence(table.seed, table.level) : [];
  const frames = pads.length * 2;
  const armed = play.key === key;
  const playing = armed && play.step < frames;
  const ready = armed && play.step >= frames;
  const litPad = playing && play.step % 2 === 0 ? pads[play.step / 2] : -1;

  // Replays the sequence at the top of every turn. The first frame lands on the
  // beat, so nothing sets state while the effect is still running.
  useEffect(() => {
    if (!table || table.winner) return;
    let step = 0;
    const id = setInterval(() => {
      setPlay({ key, step });
      if (step >= frames) clearInterval(id);
      step++;
    }, FRAME);
    return () => clearInterval(id);
  }, [table, key, frames]);

  // A broadcast never comes back to its sender, so the host — who is also a
  // player — has to apply its own call by hand or its turn parks forever.
  const call = (ok: boolean) => {
    act({ from: me.id, ok });
    if (isHost && table && !table.winner && table.order[table.turn] === me.id)
      send(ok ? recite(table) : fumble(table));
  };

  const hit = (pad: number) => {
    if (!ready || !myTurn || !table) return;
    setTapped(pad);
    setTimeout(() => setTapped(-1), 140);
    const next = [...typed, pad];
    if (pads[next.length - 1] !== pad) {
      setWrong(true);
      call(false);
      return;
    }
    setTyped(next);
    if (next.length === pads.length) call(true);
  };

  // The clock is in the seed on purpose: leaving the game and starting again
  // resets `round` to 1, and a seed of just the room code would deal the very
  // same pads every time.
  const start = () =>
    send(newChain(`${code}-${Date.now()}`, players.map((p) => p.id), (table?.round ?? 0) + 1));
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        Watch the pads light up, then play them back in order. Every clean run adds one more.
      </p>
      <p className="text-center text-xs text-zinc-600">
        Two lives each. A wrong pad costs one and the sequence stays where it is — last one
        standing wins.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {players.map((p) => {
          const lives = table?.lives[p.id] ?? LIVES;
          const out = !!table && lives === 0;
          return (
            <li
              key={p.id}
              className={`cab rounded-md px-3 py-1.5 text-sm ${onClock === p.id ? "cab-hot" : ""} ${
                out ? "opacity-40" : ""
              }`}
            >
              <span className={out ? "text-zinc-500 line-through" : "text-zinc-200"}>{p.name}</span>{" "}
              <span className="text-red-400">{"♥".repeat(lives) || "—"}</span>
            </li>
          );
        })}
      </ul>

      {table && !table.winner && (
        <div className="flex flex-col items-center gap-3">
          <span className="pixel text-[0.6rem] text-zinc-400">
            Round {table.round} · {table.level} pads
          </span>
          <span className="text-sm text-zinc-400">
            {!armed
              ? "Get ready…"
              : playing
                ? "Watch…"
                : myTurn
                  ? wrong
                    ? "Wrong pad."
                    : `Your go — ${typed.length}/${pads.length}`
                  : `${name(onClock)} is playing it back.`}
          </span>

          <div className="grid grid-cols-2 gap-3">
            {PAD_COLOURS.map((colour, pad) => {
              const lit = litPad === pad || tapped === pad;
              return (
                <button
                  key={pad}
                  onClick={() => hit(pad)}
                  disabled={!ready || !myTurn}
                  aria-label={`Pad ${pad + 1}`}
                  className="h-24 w-24 rounded-md border-2 transition-all disabled:cursor-default sm:h-28 sm:w-28"
                  style={{
                    borderColor: colour,
                    background: lit ? colour : "#0b0618",
                    boxShadow: lit ? `0 0 30px ${colour}` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {table?.winner && (
        <p className="flash-win neon-green pixel text-center text-[0.7rem]">
          {name(table.winner)} remembers everything!
        </p>
      )}

      {isHost ? (
        <button
          onClick={start}
          disabled={players.length < 2 || (!!table && !table.winner)}
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
