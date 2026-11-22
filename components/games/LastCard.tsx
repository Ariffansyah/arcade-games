"use client";

import { useState } from "react";
import {
  COLOURS,
  DECK,
  current,
  deal,
  draw,
  leave,
  pass,
  play,
  playable,
  type Colour,
  type LastCard as Game,
} from "@/lib/lastcard.ts";
import { useTable } from "@/lib/useTable";
import type { GameProps } from "@/lib/useRoom";

const HUE: Record<Colour | "wild", string> = {
  red: "#ff2e63",
  yellow: "#ffc83d",
  green: "#39ff88",
  blue: "#22d3ee",
  wild: "#120b22",
};

const GLYPH: Record<string, string> = { skip: "⊘", reverse: "⇄", wild: "★" };
const FACES = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "skip",
  "reverse",
  "+2",
  "wild",
  "+4",
];
const WILD_BG = `conic-gradient(${HUE.red} 0 25%, ${HUE.yellow} 0 50%, ${HUE.green} 0 75%, ${HUE.blue} 0)`;

const glyph = (face: string) => GLYPH[face] ?? face;
const sortKey = (card: number) => {
  const { colour, face } = DECK[card];
  return (colour === "wild" ? 4 : COLOURS.indexOf(colour)) * 20 + FACES.indexOf(face);
};
const describe = (card: number) => {
  const { colour, face } = DECK[card];
  const what = face === "+4" ? "wild +4" : face === "wild" ? "wild" : face;
  return colour === "wild" ? what : `${colour} ${what}`;
};

function Face({ card, small = false }: { card: number; small?: boolean }) {
  const { colour, face } = DECK[card];
  const wild = colour === "wild";
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-white/80 shadow-[0_6px_14px_rgba(0,0,0,0.55)] ${
        small ? "h-20 w-14" : "h-28 w-[4.6rem] sm:h-32 sm:w-[5.3rem]"
      }`}
      style={{ background: wild ? "#120b22" : HUE[colour] }}
    >
      <span
        aria-hidden
        className="absolute h-[78%] w-[62%] -rotate-[28deg] rounded-[50%] border-2"
        style={{
          background: wild ? WILD_BG : "#06030d",
          borderColor: wild ? "#f7f3ff" : "#06030d",
        }}
      />
      <span
        aria-hidden
        className={`pixel relative ${small ? "text-sm" : "text-lg sm:text-xl"}`}
        style={{
          color: wild ? "#f7f3ff" : HUE[colour],
          textShadow: wild ? "0 0 4px #06030d, 2px 2px 0 #06030d" : `0 0 10px ${HUE[colour]}`,
        }}
      >
        {glyph(face)}
      </span>
      {["top-1 left-1.5", "right-1.5 bottom-1 rotate-180"].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={`pixel absolute text-[0.5rem] ${corner}`}
          style={{ color: wild ? "#f7f3ff" : "#06030d" }}
        >
          {glyph(face)}
        </span>
      ))}
    </span>
  );
}

function Back({ className = "", label = "" }: { className?: string; label?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-md border-2 border-[color:var(--neon-magenta)] bg-[#150c28] shadow-[0_0_10px_rgba(255,45,149,0.35)] ${className}`}
    >
      {label && (
        <span
          className={`pixel -rotate-[28deg] text-[0.5rem] ${
            label === "Draw" ? "neon-green" : "text-[color:var(--neon-amber)]"
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export default function LastCard({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`lastcard:${code}`, me.id);
  const [picking, setPicking] = useState(-1);

  const isHost = players[0]?.id === me.id;
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const up = table && !table.winner ? current(table) : "";
  const myTurn = up === me.id;
  const hand =
    table?.hands[me.id] && table.order.includes(me.id)
      ? [...table.hands[me.id]].sort((a, b) => sortKey(a) - sortKey(b))
      : null;
  const upGone = !!up && !players.some((p) => p.id === up);

  const tryPlay = (card: number) => {
    if (!table || !myTurn || !playable(table, card)) return;
    if (DECK[card].colour === "wild") return setPicking(card);
    send(play(table, card));
  };

  const pickColour = (colour: Colour) => {
    if (table && picking >= 0) send(play(table, picking, colour));
    setPicking(-1);
  };

  const start = () =>
    send(
      deal(
        `${code}-${Date.now()}`,
        players.map((p) => p.id),
        (table?.round ?? 0) + 1,
        table?.scores ?? {}
      )
    );

  const last = table?.last;
  const lastLine = !last
    ? ""
    : last.act === "play"
      ? `${name(last.by)} played ${describe(last.card)}${
          DECK[last.card].face === "+2" || DECK[last.card].face === "+4"
            ? ` — next player picks up ${DECK[last.card].face.slice(1)}`
            : ""
        }`
      : last.act === "draw"
        ? `${name(last.by)} drew a card`
        : `${name(last.by)} kept it`;

  if (!table)
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-5 text-center">
        <p className="text-sm text-zinc-400">
          Match the colour or the face. Skips, reverses, +2s and wilds keep it nasty. First to empty
          their hand wins the round.
        </p>
        <div className="flex gap-2" aria-hidden>
          {[
            find("red", "7"),
            find("yellow", "skip"),
            find("wild", "+4"),
            find("blue", "reverse"),
          ].map((c, i) => (
            <span
              key={c}
              style={{
                transform: `rotate(${(i - 1.5) * 8}deg) translateY(${Math.abs(i - 1.5) * 6}px)`,
              }}
            >
              <Face card={c} small />
            </span>
          ))}
        </div>
        {isHost ? (
          <button
            onClick={start}
            disabled={players.length < 2}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            Deal
          </button>
        ) : (
          <span className="blink text-sm text-zinc-500">
            Waiting for {name(players[0]?.id)} to deal…
          </span>
        )}
      </div>
    );

  const pile = table.pile.slice(-4);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5">
      <ul className="flex flex-wrap justify-center gap-2">
        {table.order.map((id) => {
          const count = table.hands[id].length;
          return (
            <li
              key={id}
              className={`cab flex flex-col items-center gap-1.5 rounded-md px-3 py-2 text-sm ${up === id ? "cab-hot" : ""} ${
                table.winner === id ? "flash-win border-emerald-500" : ""
              }`}
            >
              <span className="text-zinc-200">
                {name(id)}
                {id === me.id && " (you)"}{" "}
                <span className="neon-green">{table.scores[id] ?? 0}</span>
              </span>
              <span className="flex h-7 items-center pl-2" aria-label={`${count} cards`}>
                {Array.from({ length: Math.min(count, 12) }, (_, i) => (
                  <Back key={i} className="-ml-2 h-7 w-5" />
                ))}
                <span className="ml-1.5 text-xs text-zinc-400">{count}</span>
              </span>
              {count === 1 && !table.winner && (
                <span className="pixel blink text-[0.45rem] text-[color:var(--neon-amber)]">
                  Last card!
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="cab relative flex w-full flex-col items-center gap-3 rounded-md px-4 py-6">
        <div className="flex items-center gap-8 sm:gap-14">
          <button
            onClick={() => myTurn && send(draw(table))}
            disabled={!myTurn || table.drawn >= 0}
            aria-label="Draw a card"
            className="relative h-28 w-[4.6rem] normal-case disabled:cursor-default sm:h-32 sm:w-[5.3rem]"
          >
            <Back className="absolute inset-0 translate-x-1 translate-y-1 opacity-60" />
            <Back className="absolute inset-0 translate-x-0.5 translate-y-0.5 opacity-80" />
            <Back
              className="absolute inset-0"
              label={myTurn && table.drawn < 0 ? "Draw" : "Last"}
            />
          </button>

          <div
            className="relative flex h-28 w-[4.6rem] items-center justify-center rounded-xl sm:h-32 sm:w-[5.3rem]"
            style={{
              boxShadow: `0 0 0 4px #06030d, 0 0 0 7px ${HUE[table.colour]}, 0 0 38px ${HUE[table.colour]}`,
            }}
          >
            {pile.map((card, i) => (
              <span
                key={`${card}-${table.pile.length - pile.length + i}`}
                className={`absolute ${i === pile.length - 1 ? "card-in" : ""}`}
                style={
                  {
                    "--rot": `${((card * 37) % 24) - 12}deg`,
                    transform: `rotate(var(--rot))`,
                  } as React.CSSProperties
                }
              >
                <Face card={card} />
              </span>
            ))}
          </div>

          <span
            className="pixel text-2xl text-zinc-500"
            title={table.dir === 1 ? "Play runs left to right" : "Play runs right to left"}
            aria-label={table.dir === 1 ? "Play runs forward" : "Play runs backward"}
          >
            {table.dir === 1 ? "↻" : "↺"}
          </span>
        </div>

        <p role="status" className="min-h-6 text-center text-sm text-zinc-400">
          {table.winner
            ? ""
            : myTurn
              ? table.drawn >= 0
                ? "It fits. Play it, or keep it and pass."
                : "Your turn — play a card or draw."
              : `${name(up)} is thinking…`}
        </p>
        {lastLine && <p className="text-center text-xs text-zinc-500">{lastLine}</p>}

        {table.winner && (
          <p className="flash-win neon-green pixel text-center text-[0.7rem]">
            {name(table.winner)} is out of cards!
          </p>
        )}
      </div>

      {hand && (
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full justify-center-safe overflow-x-auto px-4 pt-6 pb-2">
            <div className="flex pl-8">
              {hand.map((card) => {
                const ok = myTurn && playable(table, card);
                return (
                  <button
                    key={card}
                    onClick={() => tryPlay(card)}
                    disabled={!ok}
                    aria-label={`Play ${describe(card)}`}
                    className={`-ml-8 normal-case transition-transform duration-150 sm:-ml-7 ${
                      ok
                        ? "-translate-y-3 hover:-translate-y-6 focus-visible:-translate-y-6"
                        : myTurn
                          ? "opacity-40"
                          : ""
                    }`}
                  >
                    <Face card={card} />
                  </button>
                );
              })}
            </div>
          </div>
          {myTurn && table.drawn >= 0 && (
            <button
              onClick={() => send(pass(table))}
              className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
            >
              Keep it, pass
            </button>
          )}
        </div>
      )}
      {!hand && (
        <p className="text-xs text-zinc-500">
          You are watching this round. You will be dealt in next time.
        </p>
      )}

      {picking >= 0 && (
        <div
          role="dialog"
          aria-label="Choose a colour"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPicking(-1)}
        >
          <div
            className="cab flex flex-col items-center gap-4 rounded-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="pixel text-[0.6rem] text-zinc-300">Call a colour</span>
            <div className="grid grid-cols-2 gap-3">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  autoFocus={c === "red"}
                  onClick={() => pickColour(c)}
                  className="h-20 w-20 rounded-md border-2 border-white/70 text-[0.55rem] text-[#06030d]"
                  style={{
                    background: HUE[c],
                    boxShadow: `0 0 20px ${HUE[c]}`,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {upGone && isHost && !table.winner && (
        <button
          onClick={() => send(leave(table))}
          className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
        >
          Whoever is up left the room — skip them
        </button>
      )}

      {isHost && table.winner && (
        <button
          onClick={start}
          disabled={players.length < 2}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          Deal next round
        </button>
      )}
    </div>
  );
}

function find(colour: string, face: string) {
  return DECK.findIndex((c) => c.colour === colour && c.face === face);
}
