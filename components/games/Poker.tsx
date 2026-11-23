"use client";

import { useEffect, useState } from "react";
import {
  BLIND,
  STACK,
  call,
  current,
  deal,
  fold,
  maxRaise,
  minRaise,
  pot,
  raise,
  type Poker as Game,
} from "@/lib/poker.ts";
import { useTable } from "@/lib/useTable";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { Fan, PlayingCard, Seat } from "./CardTable";

const STREETS = ["Preflop", "Flop", "Turn", "River"];

export default function Poker({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`poker:${code}`, me.id);
  const [amount, setAmount] = useState(0);

  const isHost = players[0]?.id === me.id;
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const up = table && !table.won ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);

  const board = table?.board.length ?? 0;
  useEffect(() => {
    if (board) sfx.card();
  }, [board, table?.hand]);
  const mine = table?.won?.[me.id] ?? 0;
  useEffect(() => {
    if (mine) sfx.win();
  }, [mine, table?.hand]);

  const funded = players.filter((p) => (table?.chips[p.id] ?? STACK) > 0);
  const start = (fresh: boolean) =>
    send(
      deal(
        fresh || !table ? `${code}-${Date.now()}` : table.seed,
        players.map((p) => p.id),
        fresh ? null : table
      )
    );

  if (!table)
    return (
      <div className="uno-stage absolute inset-0 flex items-center-safe justify-center overflow-y-auto p-4">
        <div className="menu-in cab flex w-full max-w-xl flex-col items-center gap-5 rounded-md p-5 text-center">
          <h2 className="pixel neon-cyan text-sm">Poker</h2>
          <Fan cards={[51, 50]} size="clamp(8px, 2.4vw, 13px)" />
          <p className="text-base text-zinc-300">
            Texas Hold&apos;em. Two cards each, five shared on the table, and the best five-card
            hand takes the pot. Everyone sits down with {STACK} chips; blinds are {BLIND} and{" "}
            {BLIND * 2}. Last one with chips wins.
          </p>
          {isHost ? (
            <button
              onClick={() => start(true)}
              disabled={players.length < 2}
              className="btn-arcade play-pulse rounded-sm px-6 py-3 disabled:opacity-40"
            >
              {players.length < 2 ? "Needs 2 players" : "Deal"}
            </button>
          ) : (
            <span className="blink text-base text-zinc-400">
              Waiting for {name(players[0]?.id)} to deal…
            </span>
          )}
        </div>
      </div>
    );

  const seated = table.order.includes(me.id);
  const high = Math.max(0, ...Object.values(table.bets));
  const owe = seated ? high - (table.bets[me.id] ?? 0) : 0;
  const hi = myTurn ? maxRaise(table) : 0;
  const lo = myTurn ? Math.min(minRaise(table), hi) : 0;
  const to = Math.min(Math.max(amount, lo), hi);
  const canRaise = myTurn && hi > high;

  const base = Math.max(0, table.order.indexOf(me.id));
  const others = [...table.order.slice(base), ...table.order.slice(0, base)].filter(
    (id) => id !== me.id
  );

  const badges = (id: string) => {
    const folded = table.folded.includes(id);
    const won = table.won?.[id];
    return (
      <div className="flex min-h-5 flex-wrap items-center justify-center gap-1 text-xs">
        {table.order[table.button] === id && (
          <span className="count-badge pixel h-5 min-w-5 text-[0.65rem]" title="Dealer">
            D
          </span>
        )}
        {!!table.bets[id] && !table.won && (
          <span className="rounded-sm bg-[#06030d]/70 px-1.5 py-0.5 text-amber-300">
            {table.bets[id]}
          </span>
        )}
        {folded && <span className="text-zinc-400">Folded</span>}
        {!folded && !table.chips[id] && !table.won && (
          <span className="text-amber-300">All in</span>
        )}
        {table.shown?.[id] && <span className="text-zinc-200">{table.shown[id]}</span>}
        {!!won && <span className="neon-green">+{won}</span>}
      </div>
    );
  };

  const holes = (id: string) =>
    table.folded.includes(id)
      ? []
      : table.shown?.[id] || id === me.id
        ? table.holes[id]
        : [undefined, undefined];

  const last = table.last;
  const lastLine = !last
    ? ""
    : `${name(last.by)} ${
        last.act === "fold"
          ? "folded"
          : last.act === "check"
            ? "checked"
            : last.act === "call"
              ? `called ${last.amount}`
              : last.act === "bet"
                ? `bet ${last.amount}`
                : last.act === "raise"
                  ? `raised to ${last.amount}`
                  : `is all in for ${last.amount}`
      }`;

  const winners = Object.entries(table.won ?? {}).filter(([, x]) => x > 0);
  const status = table.won
    ? winners
        .map(
          ([id, x]) =>
            `${name(id)} takes ${x}${table.shown?.[id] ? ` with ${table.shown[id].toLowerCase()}` : ""}`
        )
        .join(" · ")
    : myTurn
      ? owe
        ? `Your turn — ${Math.min(owe, table.chips[me.id])} to call.`
        : "Your turn — check or bet."
      : `${name(up)} is thinking…`;

  return (
    <div className="uno-stage absolute inset-0 flex flex-col overflow-x-hidden overflow-y-auto">
      <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3 px-3 pt-4">
        {others.map((id) => (
          <Seat
            key={id}
            name={name(id)}
            seat={table.order.indexOf(id)}
            chips={table.chips[id]}
            hot={up === id}
            dim={table.folded.includes(id)}
          >
            <Fan cards={holes(id)} size="clamp(4px, 1.1vmin, 7px)" />
            {badges(id)}
          </Seat>
        ))}
      </div>

      <div className="mx-auto my-auto flex w-[min(94%,760px)] flex-col items-center gap-3 rounded-[50%/42%] border-4 border-emerald-500/50 bg-[radial-gradient(ellipse_at_center,#0f5132,#06281a_72%)] px-6 py-7 shadow-[0_0_40px_rgba(57,255,136,0.2),inset_0_0_60px_rgba(0,0,0,0.6)]">
        <span className="pixel text-[0.72rem] text-emerald-300">
          Hand {table.hand} · {table.won ? "Showdown" : STREETS[table.street]}
        </span>
        <div className="flex gap-[0.4em]" style={{ fontSize: "clamp(6px, 1.7vmin, 11px)" }}>
          {Array.from({ length: 5 }, (_, i) =>
            table.board[i] !== undefined ? (
              <PlayingCard key={table.board[i]} card={table.board[i]} className="card-reveal" />
            ) : (
              <span
                key={i}
                aria-hidden
                className="h-[8.7em] w-[6.2em] rounded-[0.7em] border-2 border-dashed border-emerald-300/25"
              />
            )
          )}
        </div>
        <span className="pixel text-[0.88rem] text-amber-300">Pot {pot(table)}</span>
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p
          role="status"
          className={`text-center text-sm sm:text-base ${myTurn || table.won ? "neon-green" : "text-zinc-200"}`}
        >
          {status}
        </p>
        {lastLine && !table.won && <p className="text-xs text-zinc-400 sm:text-sm">{lastLine}</p>}

        <div className="flex flex-wrap items-end justify-center gap-4">
          {seated ? (
            <Seat
              name={name(me.id)}
              seat={table.order.indexOf(me.id)}
              chips={table.chips[me.id]}
              hot={myTurn}
              dim={table.folded.includes(me.id)}
            >
              <Fan cards={holes(me.id)} size="clamp(9px, 2.2vmin, 15px)" />
              {badges(me.id)}
            </Seat>
          ) : (
            <span className="text-sm text-zinc-400">
              {table.chips[me.id] === 0
                ? "You're out of chips. A new game deals you back in."
                : "You're watching. You'll be dealt in next hand."}
            </span>
          )}

          {myTurn && (
            <div className="flex flex-col items-stretch gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => send(fold(table))}
                  className="btn-ghost btn-danger rounded-sm px-3 py-2 text-[0.88rem]"
                >
                  Fold
                </button>
                <button
                  onClick={() => send(call(table))}
                  className="btn-arcade rounded-sm px-3 py-2 text-[0.88rem]"
                >
                  {!owe ? "Check" : owe >= table.chips[me.id] ? "Call all in" : `Call ${owe}`}
                </button>
              </div>
              {canRaise && (
                <div className="flex flex-wrap items-center gap-2">
                  {lo < hi && (
                    <input
                      type="range"
                      aria-label={high ? "Raise to" : "Bet"}
                      min={lo}
                      max={hi}
                      step={BLIND}
                      value={to}
                      onChange={(e) => setAmount(+e.target.value)}
                      className="range-arcade w-36"
                      style={
                        { "--fill": `${((to - lo) / (hi - lo)) * 100}%` } as React.CSSProperties
                      }
                    />
                  )}
                  {to < hi && (
                    <button
                      onClick={() => send(raise(table, to))}
                      className="btn-ghost rounded-sm px-3 py-2 text-[0.8rem]"
                    >
                      {high ? "Raise to" : "Bet"} {to}
                    </button>
                  )}
                  <button
                    onClick={() => send(raise(table, hi))}
                    className="btn-ghost rounded-sm px-3 py-2 text-[0.8rem] text-amber-300"
                  >
                    All in {hi}
                  </button>
                </div>
              )}
            </div>
          )}

          {table.won &&
            (isHost ? (
              funded.length >= 2 ? (
                <button
                  onClick={() => start(false)}
                  className="btn-arcade play-pulse rounded-sm px-5 py-3"
                >
                  Deal next hand
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="neon-green pixel text-[0.88rem]">
                    {funded[0] ? `${name(funded[0].id)} wins the game!` : "Game over"}
                  </span>
                  <button
                    onClick={() => start(true)}
                    disabled={players.length < 2}
                    className="btn-arcade play-pulse rounded-sm px-5 py-3 disabled:opacity-40"
                  >
                    New game
                  </button>
                </div>
              )
            ) : (
              <span className="blink text-sm text-zinc-400">
                Waiting for {name(players[0]?.id)} to deal…
              </span>
            ))}
        </div>
      </div>

      {upGone && isHost && (
        <button
          onClick={() => send(fold(table))}
          className="btn-ghost absolute top-3 right-3 z-10 rounded-sm px-3 py-2 text-[0.8rem]"
        >
          Fold for the player who left
        </button>
      )}
    </div>
  );
}
