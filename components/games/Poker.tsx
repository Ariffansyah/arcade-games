"use client";

import { useEffect, useState } from "react";
import {
  BLINDS_EVERY,
  HANDS,
  STACK,
  TURN_MS,
  blindAt,
  call,
  current,
  deal,
  fold,
  maxRaise,
  minRaise,
  pot,
  raise,
  read,
  timeout,
  type Poker as Game,
} from "@/lib/poker.ts";
import { useTable } from "@/lib/useTable";
import { useTurnClock } from "@/lib/useTurnClock";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { Fan, GLOW, PlayingCard, Seat } from "./CardTable";
import Clock from "./Clock";

const STREETS = ["Preflop", "Flop", "Turn", "River"];

export default function Poker({ code, players, me, name }: GameProps) {
  const [table, send] = useTable<Game>(`poker:${code}`, me.id);
  const [amount, setAmount] = useState(0);
  const [log, setLog] = useState({ key: "", lines: [] as string[] });

  const isHost = players[0]?.id === me.id;
  const up = table && !table.won ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);
  const seated = !!table && table.order.includes(me.id);

  const board = table?.board.length ?? 0;
  useEffect(() => {
    if (board) sfx.card();
  }, [board, table?.hand]);
  const mine = table?.won?.[me.id] ?? 0;
  useEffect(() => {
    if (mine) sfx.win();
  }, [mine, table?.hand]);

  const left = useTurnClock(
    table,
    TURN_MS,
    table && !table.won && seated ? () => send(timeout(table)) : null,
    myTurn ? 0 : 2500
  );

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
            hand takes the pot. Everyone sits down with {STACK} chips; blinds start at {blindAt(1)}{" "}
            and {blindAt(1) * 2} and double every {BLINDS_EVERY} hands. You get {TURN_MS / 1000}{" "}
            seconds a turn. Last one with chips wins.
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

  const high = Math.max(0, ...Object.values(table.bets));
  const owe = seated ? high - (table.bets[me.id] ?? 0) : 0;
  const hi = myTurn ? maxRaise(table) : 0;
  const lo = myTurn ? Math.min(minRaise(table), hi) : 0;
  const to = Math.min(Math.max(amount, lo), hi);
  const canRaise = myTurn && hi > high;
  const step = table.blind;
  // Pot-sized bets count the call first, the way a dealer would.
  const potBet = (share: number) =>
    Math.min(hi, Math.max(lo, high + Math.round(((pot(table) + owe) * share) / step) * step));

  const n = table.order.length;
  const base = Math.max(0, table.order.indexOf(me.id));
  const others = [...table.order.slice(base), ...table.order.slice(0, base)].filter(
    (id) => id !== me.id
  );
  // Cards go round from the seat after the button, one at a time.
  const dealDelay = (id: string) => ((table.order.indexOf(id) - table.button - 1 + n) % n) * 110;

  const winners = Object.entries(table.won ?? {}).filter(([, x]) => x > 0);
  const showdown = !!table.shown;
  const topWinner = showdown ? [...winners].sort((a, b) => b[1] - a[1])[0]?.[0] : "";
  const winning = topWinner ? read([...table.holes[topWinner], ...table.board]).five : [];
  const live = seated && !table.folded.includes(me.id);
  const holding = live ? read([...table.holes[me.id], ...table.board]) : null;
  const lit = showdown ? winning : board >= 3 ? (holding?.five ?? []) : [];

  const badges = (id: string, from: string) => {
    const folded = table.folded.includes(id);
    const won = table.won?.[id];
    return (
      <div className="relative flex min-h-5 flex-wrap items-center justify-center gap-1 text-xs">
        {table.order[table.button] === id && (
          <span className="count-badge pixel h-5 min-w-5 text-[0.65rem]" title="Dealer">
            D
          </span>
        )}
        {!!table.bets[id] && !table.won && (
          <span
            key={`${table.hand}-${table.street}-${table.bets[id]}`}
            className="chip-toss flex items-center gap-1 rounded-sm bg-[#06030d]/70 px-1.5 py-0.5 text-amber-300"
            style={{ "--from": from } as React.CSSProperties}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-amber-300"
            />
            {table.bets[id]}
          </span>
        )}
        {folded && <span className="text-zinc-400">Folded</span>}
        {!folded && !table.chips[id] && !table.won && (
          <span className="text-amber-300">All in</span>
        )}
        {table.shown?.[id] && (
          <span className={won ? "text-amber-200" : "text-zinc-300"}>{table.shown[id]}</span>
        )}
        {!!won && (
          <span key={table.hand} className="float-up neon-green pixel absolute -top-6 text-sm">
            +{won}
          </span>
        )}
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
    : `${name(last.by)} ${last.late ? "ran out of time and " : ""}${
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
  const result = table.won
    ? winners
        .map(
          ([id, x]) =>
            `${name(id)} takes ${x}${table.shown?.[id] ? ` with ${table.shown[id].toLowerCase()}` : ""}`
        )
        .join(" · ")
    : "";
  // The table only carries the latest move, so each screen keeps its own short history of them.
  const newsKey = `${table.hand}-${table.street}-${pot(table)}-${table.folded.length}-${table.turn}-${!!table.won}`;
  const news = [lastLine, result].filter(Boolean).join(". ");
  if (news && log.key !== newsKey)
    setLog({
      key: newsKey,
      lines: [...(table.hand !== Number(log.key.split("-")[0]) ? [`Hand ${table.hand}`] : []), news]
        .reverse()
        .concat(log.lines)
        .slice(0, 8),
    });

  const status = table.won
    ? result
    : myTurn
      ? owe
        ? `Your turn — ${Math.min(owe, table.chips[me.id])} to call.`
        : "Your turn — check or bet."
      : `${name(up)} is thinking…`;

  const nextLevel = BLINDS_EVERY - ((table.hand - 1) % BLINDS_EVERY);

  return (
    <div className="uno-stage absolute inset-0 flex flex-col overflow-x-hidden overflow-y-auto">
      <details className="absolute top-3 left-3 z-10 max-w-[14rem] rounded-sm bg-[#06030d]/80 px-2.5 py-1.5 text-xs">
        <summary className="pixel cursor-pointer text-[0.72rem] text-zinc-300 uppercase">
          Hand ranks
        </summary>
        <ol className="mt-1.5 flex flex-col gap-0.5">
          {[...HANDS].reverse().map((h, i) => (
            <li
              key={h}
              className={
                holding && HANDS.length - 1 - i === holding.category
                  ? "neon-green"
                  : "text-zinc-400"
              }
            >
              {HANDS.length - i}. {h}
            </li>
          ))}
        </ol>
      </details>

      {log.lines.length > 1 && (
        <ol
          aria-label="Recent moves"
          className="absolute top-3 right-3 z-10 hidden w-60 flex-col gap-0.5 rounded-sm bg-[#06030d]/70 px-2.5 py-2 text-xs md:flex"
        >
          {log.lines.map((line, i) => (
            <li
              key={`${log.key}-${i}`}
              className={
                /^Hand \d+$/.test(line)
                  ? "pixel text-emerald-300"
                  : i
                    ? "text-zinc-500"
                    : "text-zinc-200"
              }
            >
              {line}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3 px-3 pt-12 md:pt-4">
        {others.map((id) => (
          <Seat
            key={id}
            name={name(id)}
            seat={table.order.indexOf(id)}
            chips={table.chips[id]}
            hot={up === id}
            dim={table.folded.includes(id)}
            won={!!table.won?.[id]}
            clock={left / TURN_MS}
          >
            <Fan
              cards={holes(id)}
              size="clamp(4px, 1.1vmin, 7px)"
              round={table.hand}
              from="25vh"
              delay={dealDelay(id)}
              step={n * 110}
              glow={id === topWinner ? winning : undefined}
            />
            {badges(id, "-18px")}
          </Seat>
        ))}
      </div>

      <div className="mx-auto my-auto flex w-[min(94%,760px)] flex-col items-center gap-3 rounded-[50%/42%] border-4 border-emerald-500/50 bg-[radial-gradient(ellipse_at_center,#0f5132,#06281a_72%)] px-6 py-7 shadow-[0_0_40px_rgba(57,255,136,0.2),inset_0_0_60px_rgba(0,0,0,0.6)]">
        <span className="pixel text-center text-[0.72rem] text-emerald-300">
          Hand {table.hand} · {table.won ? "Showdown" : STREETS[table.street]} · Blinds{" "}
          {table.blind}/{table.blind * 2}
          <span className="block text-emerald-300/60">
            {nextLevel === 1 ? "Blinds double next hand" : `Blinds double in ${nextLevel} hands`}
          </span>
        </span>
        <div className="flex gap-[0.4em]" style={{ fontSize: "clamp(6px, 1.7vmin, 11px)" }}>
          {Array.from({ length: 5 }, (_, i) =>
            table.board[i] !== undefined ? (
              <span
                key={`${table.hand}-${table.board[i]}`}
                className="block transition-[transform,filter] duration-300"
                style={{
                  transform: lit.includes(table.board[i]) ? "translateY(-0.6em)" : undefined,
                  filter:
                    lit.length && !lit.includes(table.board[i]) ? "brightness(0.6)" : undefined,
                }}
              >
                <PlayingCard
                  card={table.board[i]}
                  className="card-reveal"
                  style={{
                    // A run-out to showdown turns the cards one by one; otherwise the flop does.
                    animationDelay: `${table.won ? i * 300 : i < 3 ? i * 220 : 0}ms`,
                    boxShadow: lit.includes(table.board[i]) ? GLOW : undefined,
                  }}
                />
              </span>
            ) : (
              <span
                key={i}
                aria-hidden
                className="h-[8.7em] w-[6.2em] rounded-[0.7em] border-2 border-dashed border-emerald-300/25"
              />
            )
          )}
        </div>
        <span key={pot(table)} className="pot-bump pixel text-[0.88rem] text-amber-300">
          Pot {pot(table)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!table.won && <Clock left={left} total={TURN_MS} mine={myTurn} />}
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
              won={!!table.won?.[me.id]}
              clock={left / TURN_MS}
            >
              <Fan
                cards={holes(me.id)}
                size="clamp(9px, 2.2vmin, 15px)"
                round={table.hand}
                delay={dealDelay(me.id)}
                step={n * 110}
                glow={lit.length ? lit : undefined}
              />
              {holding && (
                <span
                  key={holding.name}
                  className="menu-in pixel rounded-sm border border-amber-300/60 bg-[#06030d]/80 px-2 py-1 text-[0.8rem] text-amber-200"
                >
                  {holding.name}
                </span>
              )}
              {badges(me.id, "18px")}
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
                      step={step}
                      value={to}
                      onChange={(e) => setAmount(+e.target.value)}
                      className="range-arcade w-36"
                      style={
                        { "--fill": `${((to - lo) / (hi - lo)) * 100}%` } as React.CSSProperties
                      }
                    />
                  )}
                  {lo < hi &&
                    (
                      [
                        ["½ pot", 0.5],
                        ["Pot", 1],
                      ] as const
                    ).map(([label, share]) => (
                      <button
                        key={label}
                        onClick={() => setAmount(potBet(share))}
                        className="btn-ghost rounded-sm px-2 py-1 text-[0.72rem]"
                      >
                        {label}
                      </button>
                    ))}
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
          className="btn-ghost absolute right-3 bottom-3 z-10 rounded-sm px-3 py-2 text-[0.8rem]"
        >
          Fold for the player who left
        </button>
      )}
    </div>
  );
}
