"use client";

import { useEffect, useState } from "react";
import {
  MIN_BET,
  STACK,
  bet,
  canDouble,
  current,
  double,
  hit,
  natural,
  open,
  stand,
  value,
  type Blackjack as Game,
} from "@/lib/blackjack.ts";
import { useTable } from "@/lib/useTable";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { Fan, Seat } from "./CardTable";

const CHIPS = [10, 25, 100, 500];

export default function Blackjack({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`blackjack:${code}`, me.id);
  const [stake, setStake] = useState(0);

  const isHost = players[0]?.id === me.id;
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const up = table && table.phase !== "done" ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);

  const dealt = (table?.dealer.length ?? 0) + Object.values(table?.hands ?? {}).flat().length;
  useEffect(() => {
    if (dealt) sfx.card();
  }, [dealt]);
  const mine = table?.paid?.[me.id] ?? 0;
  useEffect(() => {
    if (mine > 0) sfx.win();
  }, [mine, table?.round]);

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
            Picture cards count 10, aces 1 or 11. Everyone starts with {STACK} chips.
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
  const seated = table.order.includes(me.id);
  const chips = table.chips[me.id] ?? 0;
  const dealer = value(table.dealer);

  const result = (id: string) => {
    const paid = table.paid?.[id];
    if (paid === undefined) return null;
    const hand = table.hands[id] ?? [];
    return paid > 0 ? (
      <span className="neon-green">
        {natural(hand) ? "Blackjack! " : ""}+{paid}
      </span>
    ) : paid === 0 ? (
      <span className="text-zinc-200">Push</span>
    ) : (
      <span className="text-red-400">
        {value(hand) > 21 ? "Bust " : ""}
        {paid}
      </span>
    );
  };

  const last = table.last;
  const lastLine = !last
    ? ""
    : `${name(last.by)} ${
        last.act === "bet"
          ? `bet ${last.amount}`
          : last.act === "sit"
            ? "sat this one out"
            : last.act === "hit"
              ? "hit"
              : last.act === "double"
                ? "doubled down"
                : `stood on ${value(table.hands[last.by] ?? [])}`
      }`;

  const status = done
    ? table.paid?.[me.id] === undefined
      ? natural(table.dealer)
        ? "Dealer blackjack."
        : "Round over."
      : mine > 0
        ? `You win ${mine}!`
        : mine === 0
          ? "Push — your bet comes back."
          : `You lose ${-mine}.`
    : table.phase === "bet"
      ? myTurn
        ? "Place your bet."
        : `${name(up)} is betting…`
      : myTurn
        ? `You have ${value(table.hands[me.id])}. Hit or stand?`
        : `${name(up)} is playing…`;

  const pending = Math.min(stake, chips);

  return (
    <div className="uno-stage absolute inset-0 flex flex-col items-center overflow-x-hidden overflow-y-auto">
      <div className="flex flex-col items-center gap-2 pt-4">
        <span className="seat-banner rounded-[3px]">Dealer</span>
        {table.dealer.length > 0 && (
          <Fan
            cards={playing ? [table.dealer[0], undefined] : table.dealer}
            size="clamp(7px, 1.9vmin, 13px)"
          />
        )}
        {done && table.dealer.length > 0 && (
          <span className="pixel text-[0.8rem] text-zinc-200">
            {natural(table.dealer) ? "Blackjack" : dealer > 21 ? `Bust with ${dealer}` : dealer}
          </span>
        )}
      </div>

      <div className="mx-auto my-auto flex w-[min(94%,820px)] flex-col items-center gap-4 rounded-[50%/38%] border-4 border-emerald-500/50 bg-[radial-gradient(ellipse_at_center,#0f5132,#06281a_72%)] px-4 py-6 shadow-[0_0_40px_rgba(57,255,136,0.2),inset_0_0_60px_rgba(0,0,0,0.6)]">
        <span className="pixel text-center text-[0.65rem] text-emerald-300/80">
          Blackjack pays 3 to 2 · Dealer stands on 17
        </span>
        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-4">
          {table.order.map((id, i) => {
            const hand = table.hands[id];
            return (
              <Seat
                key={id}
                name={name(id)}
                seat={i}
                chips={table.chips[id]}
                hot={up === id}
                dim={table.phase !== "bet" && !table.bets[id]}
              >
                {hand && (
                  <Fan
                    cards={hand}
                    size={id === me.id ? "clamp(7px, 1.9vmin, 13px)" : "clamp(5px, 1.4vmin, 9px)"}
                  />
                )}
                <div className="flex min-h-5 flex-wrap items-center justify-center gap-1.5 text-xs">
                  {hand && (
                    <span className="count-badge pixel h-5 min-w-5 text-[0.7rem]">
                      {value(hand)}
                    </span>
                  )}
                  {!!table.bets[id] && (
                    <span className="rounded-sm bg-[#06030d]/70 px-1.5 py-0.5 text-amber-300">
                      {table.bets[id]}
                    </span>
                  )}
                  {table.phase !== "bet" && !table.bets[id] && (
                    <span className="text-zinc-400">Sitting out</span>
                  )}
                  {result(id)}
                </div>
              </Seat>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
          <div className="flex gap-2">
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
