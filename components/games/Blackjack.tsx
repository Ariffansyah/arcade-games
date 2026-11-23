"use client";

import { useEffect, useState } from "react";
import {
  MAX_BOXES,
  MIN_BET,
  STACK,
  TURN_MS,
  bet,
  blackjack,
  box,
  canDouble,
  canSplit,
  canSurrender,
  count,
  current,
  double,
  hit,
  natural,
  open,
  payout,
  sit,
  split,
  stand,
  surrender,
  timeout,
  value,
  type Blackjack as Game,
  type Box,
} from "@/lib/blackjack.ts";
import { useTable } from "@/lib/useTable";
import { useTurnClock } from "@/lib/useTurnClock";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { Fan, Seat } from "./CardTable";
import Clock from "./Clock";

const CHIPS = [10, 25, 100, 500];

const total = (cards: number[]) => {
  const { total, soft } = count(cards);
  return soft && total < 21 ? `Soft ${total}` : String(total);
};

export default function Blackjack({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`blackjack:${code}`, me.id);
  const [stake, setStake] = useState(0);

  const isHost = players[0]?.id === me.id;
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const up = table && table.phase !== "done" ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);
  const seated = !!table && table.order.includes(me.id);

  const dealt =
    (table?.dealer.length ?? 0) + (table?.boxes ?? []).reduce((n, b) => n + b.cards.length, 0);
  useEffect(() => {
    if (dealt) sfx.card();
  }, [dealt]);
  const mine = table?.paid?.[me.id] ?? 0;
  useEffect(() => {
    if (mine > 0) sfx.win();
  }, [mine, table?.round]);

  // Arriving while bets are still open — or just after the table opened without you — takes a seat.
  const missed = !!table && table.phase === "bet" && !seated && players.some((p) => p.id === me.id);
  useEffect(() => {
    if (missed) send(sit(table, me.id));
  }, [missed, table, me.id, send]);

  const left = useTurnClock(
    table,
    TURN_MS,
    table && table.phase !== "done" && seated ? () => send(timeout(table)) : null,
    myTurn ? 0 : 2500
  );

  const next = () =>
    send(
      open(
        table?.seed ?? `${code}-${Date.now()}`,
        players.map((p) => p.id),
        table
      )
    );

  if (!table)
    return (
      <div className="uno-stage absolute inset-0 flex items-center-safe justify-center overflow-y-auto p-4">
        <div className="menu-in cab flex w-full max-w-xl flex-col items-center gap-5 rounded-md p-5 text-center">
          <h2 className="pixel neon-cyan text-sm">21</h2>
          <Fan cards={[12, 24]} size="clamp(8px, 2.4vw, 13px)" />
          <p className="text-base text-zinc-300">
            Blackjack against the house. Get closer to 21 than the dealer without going over.
            Picture cards count 10, aces 1 or 11. Split pairs, double down, or surrender half your
            bet. Everyone starts with {STACK} chips and gets {TURN_MS / 1000} seconds a turn.
          </p>
          {isHost ? (
            <button onClick={next} className="btn-arcade play-pulse rounded-sm px-6 py-3">
              Open the table
            </button>
          ) : (
            <span className="blink text-base text-zinc-400">
              Waiting for {name(players[0]?.id)} to open the table…
            </span>
          )}
        </div>
      </div>
    );

  const done = table.phase === "done";
  const playing = table.phase === "play";
  const chips = table.chips[me.id] ?? 0;
  const dealer = value(table.dealer);
  const at = box(table);
  const seatedCount = table.boxes.length;

  const outcome = (b: Box) => {
    if (!done) return null;
    const net = payout(table, b) - b.bet;
    const label = b.surrendered
      ? "Surrendered"
      : blackjack(b) && net > 0
        ? "Blackjack!"
        : value(b.cards) > 21
          ? "Bust"
          : net > 0
            ? "Win"
            : net === 0
              ? "Push"
              : "Lose";
    return (
      <span
        className={`menu-in ${net > 0 ? "neon-green" : net === 0 ? "text-zinc-200" : "text-red-400"}`}
        // Held back until the dealer's last card has landed.
        style={{ animationDelay: `${Math.max(0, table.dealer.length - 1) * 500}ms` }}
      >
        {label} {net > 0 ? `+${net}` : net || ""}
      </span>
    );
  };

  const last = table.last;
  const lastLine = !last
    ? ""
    : `${name(last.by)} ${last.late ? "ran out of time and " : ""}${
        last.act === "bet"
          ? `bet ${last.amount}`
          : last.act === "sit"
            ? "sat this one out"
            : last.act === "hit"
              ? "hit"
              : last.act === "double"
                ? "doubled down"
                : last.act === "split"
                  ? "split the pair"
                  : last.act === "surrender"
                    ? "surrendered"
                    : "stood"
      }`;

  const status = done
    ? table.paid?.[me.id] === undefined
      ? natural(table.dealer)
        ? "Dealer blackjack."
        : "Round over."
      : mine > 0
        ? `You win ${mine}!`
        : mine === 0
          ? "Even — your bets come back."
          : `You lose ${-mine}.`
    : table.phase === "bet"
      ? myTurn
        ? "Place your bet."
        : `${name(up)} is betting…`
      : myTurn && at
        ? `You have ${total(at.cards)}${
            table.boxes.filter((b) => b.by === me.id).length > 1 ? " on this hand" : ""
          }. Hit or stand?`
        : `${name(up)} is playing…`;

  const pending = Math.min(stake, chips);
  // Cards go round the table one at a time, the dealer's after the last player's.
  const dealSlot = (i: number) => i * 110;

  return (
    <div className="uno-stage absolute inset-0 flex flex-col items-center overflow-x-hidden overflow-y-auto">
      <div className="flex flex-col items-center gap-2 pt-4">
        <span className="seat-banner rounded-[3px]">Dealer</span>
        {table.dealer.length > 0 && (
          <Fan
            cards={playing ? [table.dealer[0], undefined] : table.dealer}
            size="clamp(7px, 1.9vmin, 13px)"
            round={table.round}
            from="10vh"
            delay={dealSlot(seatedCount)}
            step={(seatedCount + 1) * 110}
            later={500}
          />
        )}
        {table.dealer.length > 0 && (
          <span className="pixel text-[0.8rem] text-zinc-200">
            {playing
              ? `Showing ${total([table.dealer[0]])}`
              : natural(table.dealer)
                ? "Blackjack"
                : dealer > 21
                  ? `Bust with ${dealer}`
                  : total(table.dealer)}
          </span>
        )}
      </div>

      <div className="mx-auto my-auto flex w-[min(94%,860px)] flex-col items-center gap-4 rounded-[50%/38%] border-4 border-emerald-500/50 bg-[radial-gradient(ellipse_at_center,#0f5132,#06281a_72%)] px-4 py-6 shadow-[0_0_40px_rgba(57,255,136,0.2),inset_0_0_60px_rgba(0,0,0,0.6)]">
        <span className="pixel text-center text-[0.65rem] text-emerald-300/80">
          Blackjack pays 3 to 2 · Dealer stands on 17 · Split up to {MAX_BOXES} hands · Surrender
          pays half
        </span>
        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-4">
          {table.order.map((id, i) => {
            const boxes = table.boxes.filter((b) => b.by === id);
            const sittingOut = table.phase !== "bet" && !table.bets[id];
            return (
              <Seat
                key={id}
                name={name(id)}
                seat={i}
                chips={table.chips[id]}
                hot={up === id}
                dim={sittingOut}
                won={(table.paid?.[id] ?? 0) > 0}
                clock={left / TURN_MS}
              >
                <div className="flex flex-wrap items-start justify-center gap-3">
                  {boxes.map((b, k) => {
                    const turn = at === b;
                    return (
                      <div
                        key={k}
                        className={`flex flex-col items-center gap-1 rounded-md p-1 ${
                          turn && boxes.length > 1 ? "ring-2 ring-emerald-400/70" : ""
                        }`}
                      >
                        <Fan
                          cards={b.cards}
                          size={
                            id === me.id ? "clamp(7px, 1.9vmin, 13px)" : "clamp(5px, 1.4vmin, 9px)"
                          }
                          round={`${table.round}-${k}`}
                          from={id === me.id ? "-20vh" : "-25vh"}
                          delay={dealSlot(table.boxes.indexOf(b))}
                          step={(seatedCount + 1) * 110}
                        />
                        <div className="flex min-h-5 flex-wrap items-center justify-center gap-1.5 text-xs">
                          <span className="count-badge pixel h-5 min-w-5 text-[0.7rem]">
                            {blackjack(b) ? "BJ" : total(b.cards)}
                          </span>
                          <span
                            key={b.bet}
                            className="chip-toss rounded-sm bg-[#06030d]/70 px-1.5 py-0.5 text-amber-300"
                          >
                            {b.bet}
                            {b.doubled ? " ×2" : ""}
                          </span>
                          {outcome(b)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex min-h-5 flex-wrap items-center justify-center gap-1.5 text-xs">
                  {table.phase === "bet" && !!table.bets[id] && (
                    <span
                      key={table.bets[id]}
                      className="chip-toss rounded-sm bg-[#06030d]/70 px-1.5 py-0.5 text-amber-300"
                    >
                      {table.bets[id]}
                    </span>
                  )}
                  {sittingOut && <span className="text-zinc-400">Sitting out</span>}
                  {done && boxes.length > 1 && table.paid?.[id] !== undefined && (
                    <span className="text-zinc-300">
                      Total {table.paid[id] > 0 ? `+${table.paid[id]}` : table.paid[id]}
                    </span>
                  )}
                </div>
              </Seat>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!done && <Clock left={left} total={TURN_MS} mine={myTurn} />}
        <p
          role="status"
          className={`text-center text-sm sm:text-base ${myTurn || mine > 0 ? "neon-green" : "text-zinc-200"}`}
        >
          {status}
        </p>
        {lastLine && !done && <p className="text-xs text-zinc-400 sm:text-sm">{lastLine}</p>}
        {!seated && (
          <span className="text-sm text-zinc-400">
            You&apos;re watching. You&apos;ll be dealt in next round.
          </span>
        )}

        {myTurn && table.phase === "bet" && (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex flex-wrap justify-center gap-2"
              role="group"
              aria-label="Add chips"
            >
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setStake((s) => Math.min(s + c, chips))}
                  disabled={pending >= chips}
                  className="h-12 w-12 rounded-full border-4 border-dashed border-amber-300 bg-[#06030d] text-[0.8rem] text-amber-300 disabled:opacity-40"
                  aria-label={`Add ${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStake(0)}
                disabled={!pending}
                className="btn-ghost rounded-sm px-3 py-2 text-[0.8rem] disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  send(bet(table, pending));
                  setStake(0);
                }}
                disabled={pending < Math.min(MIN_BET, chips)}
                className="btn-arcade rounded-sm px-4 py-2 text-[0.88rem] disabled:opacity-40"
              >
                Bet {pending}
              </button>
              <button
                onClick={() => send(bet(table, 0))}
                className="btn-ghost rounded-sm px-3 py-2 text-[0.8rem]"
              >
                Sit out
              </button>
            </div>
          </div>
        )}

        {myTurn && playing && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => send(hit(table))}
              className="btn-arcade rounded-sm px-4 py-2 text-[0.88rem]"
            >
              Hit
            </button>
            <button
              onClick={() => send(stand(table))}
              className="btn-ghost rounded-sm px-4 py-2 text-[0.88rem]"
            >
              Stand
            </button>
            {canDouble(table) && (
              <button
                onClick={() => send(double(table))}
                className="btn-ghost rounded-sm px-4 py-2 text-[0.88rem] text-amber-300"
              >
                Double
              </button>
            )}
            {canSplit(table) && (
              <button
                onClick={() => send(split(table))}
                className="btn-ghost rounded-sm px-4 py-2 text-[0.88rem] text-amber-300"
              >
                Split
              </button>
            )}
            {canSurrender(table) && (
              <button
                onClick={() => send(surrender(table))}
                className="btn-ghost btn-danger rounded-sm px-4 py-2 text-[0.88rem]"
              >
                Surrender
              </button>
            )}
          </div>
        )}

        {done &&
          (isHost ? (
            <button onClick={next} className="btn-arcade play-pulse rounded-sm px-5 py-3">
              Next round
            </button>
          ) : (
            <span className="blink text-sm text-zinc-400">
              Waiting for {name(players[0]?.id)} to deal…
            </span>
          ))}
      </div>

      {upGone && isHost && (
        <button
          onClick={() => send(playing ? stand(table) : bet(table, 0))}
          className="btn-ghost absolute top-3 right-3 z-10 rounded-sm px-3 py-2 text-[0.8rem]"
        >
          Skip the player who left
        </button>
      )}
    </div>
  );
}
