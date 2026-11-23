"use client";

import { useEffect, useState } from "react";
import {
  COLOURS,
  DARK,
  accept,
  backOf,
  challenge,
  current,
  deal,
  draw,
  faceOf,
  isWildDraw,
  leave,
  palette,
  pass,
  play,
  playable,
  type Card,
  type Colour,
  type LastCard as Game,
  type Mode,
} from "@/lib/lastcard.ts";
import { useTable } from "@/lib/useTable";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";

const HUE: Record<Colour | "wild", string> = {
  red: "#ff2e63",
  yellow: "#ffc83d",
  green: "#39ff88",
  blue: "#22d3ee",
  pink: "#ff4fd8",
  teal: "#14b8a6",
  orange: "#fb923c",
  purple: "#9b5cff",
  wild: "#120b22",
};

const NAMES: Record<string, string> = {
  skip: "Skip",
  reverse: "Reverse",
  flip: "Flip",
  "skip-all": "Skip Everyone",
  "+1": "Draw One",
  "+5": "Draw Five",
  "+4": "Wild Draw Four",
  "+colour": "Wild Draw Colour",
  wild: "Wild",
};
const describe = (c: Card) => {
  if (c.colour === "wild") return c.face === "+2" ? "Wild Draw Two" : NAMES[c.face];
  return `${c.colour} ${c.face === "+2" ? "Draw Two" : (NAMES[c.face] ?? c.face)}`;
};

const ORDER = [
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
  "+1",
  "skip",
  "skip-all",
  "reverse",
  "flip",
  "+2",
  "+5",
  "wild",
  "+4",
  "+colour",
];

const ICONS: Record<string, string> = {
  skip: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17M6 18L18 6",
  reverse: "M4 9h13M13.5 5L17.5 9L13.5 13M20 15H7M10.5 11L6.5 15L10.5 19",
  flip: "M4.5 11a7.5 7.5 0 0 1 13.2-4.6M19.5 13a7.5 7.5 0 0 1-13.2 4.6M18 2.5v4.2h-4.2M6 21.5v-4.2h4.2",
  "skip-all": "M12 3.5a8.5 8.5 0 1 1-8 5.6M3 3.5v5.6h5.6M9 12h6",
};

const OUTLINE =
  "0.07em 0.07em 0 #06030d, -0.04em -0.04em 0 #06030d, 0.07em -0.04em 0 #06030d, -0.04em 0.07em 0 #06030d";

const quadrants = (dark: boolean) =>
  (dark ? DARK : COLOURS).map((k, i) => `${HUE[k]} 0 ${(i + 1) * 25}%`).join(", ");

function Quad({ dark, className = "" }: { dark: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full border-[0.08em] border-[#06030d] ${className}`}
      style={{ background: `conic-gradient(${quadrants(dark)})` }}
    />
  );
}

function Glyph({ c, dark, big }: { c: Card; dark: boolean; big?: boolean }) {
  const path = ICONS[c.face];
  if (path)
    return (
      <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={big ? 3 : 3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0.06em 0.06em 0 #06030d)" }}
      >
        <path d={path} />
      </svg>
    );
  if (c.face === "wild") return big ? null : <Quad dark={dark} className="h-[0.8em] w-[0.8em]" />;
  if (c.face === "+colour")
    return (
      <span className="inline-flex items-center gap-[0.05em]">
        +<Quad dark={dark} className="h-[0.7em] w-[0.7em]" />
      </span>
    );
  return (
    <span className={c.face === "6" || c.face === "9" ? "underline decoration-[0.08em]" : ""}>
      {c.face}
    </span>
  );
}

// A card face drawn like the real thing: rim, coloured body, tilted oval, corner indices.
// Sized in em, so the font size on `className` scales the whole card. Dark-side cards are
// black with a neon oval, the way the Flip deck prints them.
function Face({
  c,
  dark,
  className = "",
  style,
  lift = false,
}: {
  c: Card;
  dark: boolean;
  className?: string;
  style?: React.CSSProperties;
  lift?: boolean;
}) {
  const wild = c.colour === "wild";
  const body = wild ? "#120b22" : HUE[c.colour as Colour];
  const long = c.face.length > 1 && !ICONS[c.face];
  return (
    <span
      className={`relative block h-[9.4em] w-[6.2em] shrink-0 rounded-[0.8em] p-[0.38em] ${
        lift ? "shadow-[0_0.6em_1.2em_rgba(0,0,0,0.6)]" : "shadow-[0_0.3em_0.7em_rgba(0,0,0,0.55)]"
      } ${className}`}
      style={{ background: dark ? "#0b0618" : "#f7f3ff", ...style }}
    >
      <span
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[0.5em]"
        style={{
          background: dark && !wild ? "#0b0618" : body,
          boxShadow: dark && !wild ? `inset 0 0 0 0.2em ${body}` : undefined,
        }}
      >
        <span
          aria-hidden
          className="absolute h-[96%] w-[74%] rotate-[28deg] rounded-[50%]"
          style={{
            background: wild ? `conic-gradient(${quadrants(dark)})` : dark ? body : "#f7f3ff",
            boxShadow: wild ? "inset 0 0 0 0.18em #f7f3ff" : undefined,
          }}
        />
        <span
          aria-hidden
          className="card-ink relative flex items-center leading-none"
          style={{
            fontSize: long ? "2.3em" : ICONS[c.face] ? "3.4em" : "3.6em",
            color: wild ? "#f7f3ff" : dark ? "#0b0618" : body,
            textShadow: wild || !dark ? OUTLINE : undefined,
          }}
        >
          <Glyph c={c} dark={dark} big />
        </span>
        {["top-[0.3em] left-[0.4em]", "right-[0.4em] bottom-[0.3em] rotate-180"].map((corner) => (
          <span
            key={corner}
            aria-hidden
            className={`card-ink absolute flex text-[1.25em] leading-none ${corner}`}
            style={{ color: dark && !wild ? body : "#f7f3ff", textShadow: OUTLINE }}
          >
            <Glyph c={c} dark={dark} />
          </span>
        ))}
      </span>
    </span>
  );
}

function Back({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      className={`relative block h-[9.4em] w-[6.2em] shrink-0 rounded-[0.8em] bg-[#f7f3ff] p-[0.38em] shadow-[0_0.3em_0.7em_rgba(0,0,0,0.55)] ${className}`}
      style={style}
    >
      <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[0.5em] bg-[#120b22]">
        <span className="absolute h-[96%] w-[74%] rotate-[28deg] rounded-[50%] bg-[#ff2e63]" />
        <span
          className="card-ink relative -rotate-[20deg] text-center text-[1.25em] leading-[0.95] text-[#ffc83d]"
          style={{ textShadow: OUTLINE }}
        >
          LAST
          <br />
          CARD
        </span>
      </span>
    </span>
  );
}

type Seat = { id: string; angle: number };

// Everyone sits round the table in play order, you at the bottom, play running clockwise.
function seats(order: string[], me: string): Seat[] {
  const base = Math.max(0, order.indexOf(me));
  return order.map((_, k) => ({
    id: order[(base + k) % order.length],
    angle: 90 + (k * 360) / order.length,
  }));
}

const at = (angle: number, rx: number, ry: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: 50 + Math.cos(a) * rx, y: 50 + Math.sin(a) * ry };
};

function Fan({ cards, show }: { cards: number[]; show: (card: number) => React.ReactNode }) {
  const shown = cards.slice(0, 14);
  const m = shown.length;
  return (
    <div className="relative h-[9.4em]" style={{ width: `${6.2 + Math.max(0, m - 1) * 1.5}em` }}>
      {shown.map((card, i) => {
        const off = i - (m - 1) / 2;
        return (
          <span
            key={card}
            className="absolute bottom-0 left-1/2 origin-bottom"
            style={{
              transform: `translateX(calc(-50% + ${off * 1.5}em)) rotate(${off * 4}deg) translateY(${Math.abs(off) * 0.12}em)`,
            }}
          >
            {show(card)}
          </span>
        );
      })}
    </div>
  );
}

export default function LastCard({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`lastcard:${code}`, me.id);
  const [picking, setPicking] = useState(-1);
  const [mode, setMode] = useState<Mode | null>(null);

  const isHost = players[0]?.id === me.id;
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const up = table && !table.winner ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);
  const chosen = mode ?? table?.mode ?? "classic";

  const pileSize = table?.pile.length ?? 0;
  const held = Object.values(table?.hands ?? {}).flat().length;
  useEffect(() => {
    if (pileSize) sfx.card();
  }, [pileSize, held]);
  useEffect(() => {
    if (table?.winner) sfx.win();
  }, [table?.winner]);

  const sortKey = (card: number) => {
    const c = faceOf(table!, card);
    const colours = palette(table!) as readonly string[];
    return (c.colour === "wild" ? 4 : colours.indexOf(c.colour)) * 40 + ORDER.indexOf(c.face);
  };
  const hand =
    table?.hands[me.id] && table.order.includes(me.id)
      ? [...table.hands[me.id]].sort((a, b) => sortKey(a) - sortKey(b))
      : null;

  // A Flip whose other side is a wild asks for a colour from the side it turns up.
  const flipsTo = (card: number) => {
    const c = faceOf(table!, card);
    return c.face === "flip" ? { mode: table!.mode, dark: !table!.dark } : table!;
  };
  const tryPlay = (card: number) => {
    if (!table || !myTurn || !playable(table, card)) return;
    if (faceOf(flipsTo(card), card).colour === "wild") return setPicking(card);
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
        table?.scores ?? {},
        chosen
      )
    );

  const modePicker = isHost && (
    <div className="flex gap-2" role="group" aria-label="Deck">
      {(["classic", "flip"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-pressed={chosen === m}
          className={`btn-ghost rounded-sm px-3 py-2 text-[0.55rem] ${
            chosen === m ? "border-emerald-500 text-emerald-400" : ""
          }`}
        >
          {m === "classic" ? "Classic deck" : "Flip deck"}
        </button>
      ))}
    </div>
  );

  if (!table)
    return (
      <div className="flex w-full max-w-2xl flex-col items-center gap-5 text-center">
        <p className="text-sm text-zinc-400">
          Match the colour or the face. Skips, reverses, draw cards and wilds keep it nasty. First
          to empty their hand wins the round. The Flip deck has a dark side: play a Flip and every
          card on the table turns over.
        </p>
        <div className="flex gap-2 text-[9px] sm:text-[11px]" aria-hidden>
          {[
            { colour: "red", face: "7" },
            { colour: "yellow", face: "skip" },
            { colour: "wild", face: "+4" },
            { colour: "teal", face: "flip" },
            { colour: "purple", face: "skip-all" },
          ].map((c, i) => (
            <span
              key={i}
              style={{
                transform: `rotate(${(i - 2) * 8}deg) translateY(${Math.abs(i - 2) * 8}px)`,
              }}
            >
              <Face c={c as Card} dark={(DARK as readonly string[]).includes(c.colour)} />
            </span>
          ))}
        </div>
        {modePicker}
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

  const flip = table.mode === "flip";
  const dark = !!table.dark;
  const around = seats(table.order, me.id);
  const seatOf = (id: string) => around.find((s) => s.id === id) ?? around[0];
  const pile = table.pile.slice(-5);
  const pending = table.pending;
  const offender = pending ? faceOf(table, pending.card) : null;
  const victimDraws = offender
    ? offender.face === "+colour"
      ? `cards until ${table.colour} turns up`
      : `${offender.face.slice(1)} cards`
    : "";

  const last = table.last;
  const playedSide =
    last?.act === "play" && flip && faceOf({ mode: "flip", dark: !dark }, last.card).face === "flip"
      ? { mode: "flip" as const, dark: !dark }
      : table;
  const played = last && last.card >= 0 ? faceOf(playedSide, last.card) : null;
  const after = table.order[table.turn];
  const lastLine = !last
    ? ""
    : last.act === "play" && played
      ? `${name(last.by)} played ${describe(played)}${
          played.face === "flip"
            ? ` — the table flips to the ${dark ? "dark" : "light"} side!`
            : played.face === "skip-all"
              ? " — everyone else is skipped"
              : isWildDraw(played)
                ? ` — ${name(after)} takes it or calls the bluff`
                : ["+1", "+2", "+5"].includes(played.face)
                  ? ` — the next player picks up ${played.face.slice(1)}`
                  : ""
        }`
      : last.act === "draw"
        ? `${name(last.by)} drew a card`
        : last.act === "accept"
          ? `${name(last.by)} picked up ${last.took}`
          : last.act === "challenge"
            ? last.caught
              ? `${name(last.by)} called the bluff! The player who laid it picks up ${last.took}`
              : `${name(last.by)} challenged and was wrong — picks up ${last.took}`
            : `${name(last.by)} kept it`;

  const drawer = last?.to ?? "";
  const flying = drawer && last?.took ? Math.min(last.took, 6) : 0;
  const moveKey = `${table.round}-${table.pile.length}-${table.deck.length}-${table.shuffles}`;

  const deckTop = table.deck[0];
  const pickPalette = picking >= 0 ? palette(flipsTo(picking)) : [];

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <div className="w-full [perspective:1400px]">
        <div
          key={dark ? "dark" : "light"}
          className={`felt relative mx-auto aspect-[4/5] w-full rounded-[44%/36%] sm:aspect-[16/10] ${
            dark ? "felt-dark" : ""
          } ${flip && table.pile.length > 1 ? "table-flip" : ""}`}
        >
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className={`absolute top-1/2 left-1/2 h-[58cqmin] w-[58cqmin] -translate-x-1/2 -translate-y-1/2 opacity-60 ${
              table.dir === 1 ? "spin-slow" : "spin-slow-back"
            }`}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={HUE[table.colour]}
              strokeWidth="1.2"
              strokeDasharray="22 12"
            />
            {[0, 120, 240].map((r) => (
              <path
                key={r}
                d={table.dir === 1 ? "M50 2l5 4-5 4" : "M50 2l-5 4 5 4"}
                transform={`rotate(${r} 50 50)`}
                fill="none"
                stroke={HUE[table.colour]}
                strokeWidth="1.6"
              />
            ))}
          </svg>

          {around.slice(table.order.includes(me.id) ? 1 : 0).map(({ id, angle }) => {
            const fan = at(angle, 31, 27);
            const tag = at(angle, 43, 43);
            const count = table.hands[id].length;
            return (
              <div key={id}>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-[length:clamp(3.2px,0.75cqw,5px)]"
                  style={{ left: `${fan.x}%`, top: `${fan.y}%` }}
                >
                  <div style={{ transform: `rotate(${angle - 90}deg)` }}>
                    <Fan
                      cards={table.hands[id]}
                      show={(card) => {
                        const other = backOf(table, card);
                        return other ? <Face c={other} dark={!dark} /> : <Back />;
                      }}
                    />
                  </div>
                </div>
                <div
                  className={`cab absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-md px-2 py-1 text-xs whitespace-nowrap ${
                    up === id ? "cab-hot" : ""
                  } ${table.winner === id ? "flash-win border-emerald-500" : ""}`}
                  style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                >
                  <span className="max-w-24 truncate text-zinc-200">{name(id)}</span>
                  <span className="text-zinc-400">
                    {count} {count === 1 ? "card" : "cards"} ·{" "}
                    <span className="neon-green">{table.scores[id] ?? 0}</span>
                  </span>
                  {count === 1 && !table.winner && (
                    <span className="pixel blink text-[0.4rem] text-[color:var(--neon-amber)]">
                      Last card!
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[6cqw] text-[length:clamp(6px,1.25cqw,11px)]">
            <button
              onClick={() => myTurn && send(draw(table))}
              disabled={!myTurn || table.drawn >= 0 || !!pending}
              aria-label={`Draw a card. ${table.deck.length} left.`}
              className="relative text-[length:inherit] normal-case disabled:cursor-default"
            >
              {[3, 2, 1].map((n) => (
                <span
                  key={n}
                  aria-hidden
                  className="absolute inset-0"
                  style={{ transform: `translate(${n * 0.25}em, ${n * 0.25}em)` }}
                >
                  <Back className="opacity-80" />
                </span>
              ))}
              {flip && deckTop !== undefined ? (
                <Face c={backOf(table, deckTop)!} dark={!dark} className="relative" />
              ) : (
                <Back className="relative" />
              )}
              {myTurn && table.drawn < 0 && !pending && (
                <span className="pixel neon-green blink absolute -bottom-[2.2em] left-1/2 -translate-x-1/2 text-[0.75em] whitespace-nowrap">
                  Draw
                </span>
              )}
            </button>

            <div
              className="relative h-[9.4em] w-[6.2em] rounded-[0.8em]"
              style={{
                boxShadow: `0 0 0 0.35em #06030d, 0 0 0 0.6em ${HUE[table.colour]}, 0 0 3em ${HUE[table.colour]}`,
              }}
            >
              {pile.map((card, i) => {
                const newest = i === pile.length - 1;
                const from =
                  newest && last?.act === "play"
                    ? last.by === me.id
                      ? { x: 50, y: 115 }
                      : at(seatOf(last.by).angle, 31, 27)
                    : null;
                return (
                  <Face
                    key={`${card}-${table.pile.length - pile.length + i}`}
                    c={faceOf(table, card)}
                    dark={dark}
                    className={`absolute inset-0 ${from ? "card-fly" : ""}`}
                    style={
                      {
                        "--rot": `${((card * 37) % 24) - 12}deg`,
                        "--fx": from ? `${from.x - 50}cqw` : "0",
                        "--fy": from ? `${from.y - 50}cqh` : "0",
                        transform: "rotate(var(--rot))",
                      } as React.CSSProperties
                    }
                  />
                );
              })}
            </div>
          </div>

          {flying > 0 &&
            Array.from({ length: flying }, (_, i) => {
              const to = drawer === me.id ? { x: 50, y: 115 } : at(seatOf(drawer).angle, 31, 27);
              return (
                <span
                  key={`${moveKey}-${i}`}
                  aria-hidden
                  className="card-deal absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2 text-[length:clamp(6px,1.25cqw,11px)]"
                  style={
                    {
                      "--fx": `${to.x - 42}cqw`,
                      "--fy": `${to.y - 50}cqh`,
                      "--delay": `${i * 90}ms`,
                    } as React.CSSProperties
                  }
                >
                  {flip && deckTop !== undefined ? (
                    <Face c={backOf(table, deckTop)!} dark={!dark} />
                  ) : (
                    <Back />
                  )}
                </span>
              );
            })}

          {table.order.includes(me.id) && (
            <div
              className={`cab absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md px-2 py-1 text-xs whitespace-nowrap ${
                myTurn ? "cab-hot" : ""
              } ${table.winner === me.id ? "flash-win border-emerald-500" : ""}`}
            >
              <span className="text-zinc-200">{name(me.id)} (you)</span>
              <span className="neon-green">{table.scores[me.id] ?? 0}</span>
            </div>
          )}

          {flip && (
            <span className="pixel absolute top-[3%] left-1/2 -translate-x-1/2 text-[0.45rem] text-zinc-300">
              {dark ? "Dark side" : "Light side"}
            </span>
          )}
        </div>
      </div>

      <p role="status" className="min-h-6 text-center text-sm text-zinc-300">
        {table.winner
          ? ""
          : pending
            ? myTurn
              ? `Wild draw on you. Take ${victimDraws}, or challenge.`
              : `${name(up)} is deciding whether to challenge…`
            : myTurn
              ? table.drawn >= 0
                ? "It fits. Play it, or keep it and pass."
                : "Your turn — play a card or draw."
              : `${name(up)} is thinking…`}
      </p>
      {lastLine && <p className="-mt-3 text-center text-xs text-zinc-500">{lastLine}</p>}

      {table.winner && (
        <p className="flash-win neon-green pixel text-center text-[0.7rem]">
          {name(table.winner)} is out of cards!
        </p>
      )}

      {hand && (
        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full justify-center-safe overflow-x-auto px-4 pt-7 pb-2">
            <div className="flex pl-7 text-[11px] sm:pl-6 sm:text-[13px]">
              {hand.map((card) => {
                const ok = myTurn && playable(table, card);
                const c = faceOf(table, card);
                return (
                  <button
                    key={card}
                    onClick={() => tryPlay(card)}
                    disabled={!ok}
                    aria-label={`Play ${describe(c)}`}
                    className={`-ml-7 text-[length:inherit] normal-case transition-transform duration-150 sm:-ml-6 ${
                      ok
                        ? "-translate-y-3 hover:-translate-y-6 focus-visible:-translate-y-6"
                        : myTurn
                          ? "brightness-[0.6]"
                          : ""
                    }`}
                  >
                    <Face c={c} dark={dark} lift={ok} />
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

      {pending && myTurn && offender && (
        <div
          role="dialog"
          aria-label="Wild draw played on you"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="cab flex max-w-sm flex-col items-center gap-4 rounded-md p-6 text-center">
            <span className="text-[11px]">
              <Face c={offender} dark={dark} />
            </span>
            <p className="text-sm text-zinc-200">
              {name(pending.by)} played {describe(offender)} and called{" "}
              <span style={{ color: HUE[table.colour] }}>{table.colour}</span>.
            </p>
            <p className="text-xs text-zinc-400">
              It is only allowed with no {table.colour} card left to play. Challenge and, if they
              were bluffing, they pick up instead. If they weren&apos;t, you pick up two extra.
            </p>
            <div className="flex gap-3">
              <button
                autoFocus
                onClick={() => send(accept(table))}
                className="btn-arcade rounded-sm px-4 py-2"
              >
                Take it
              </button>
              <button
                onClick={() => send(challenge(table))}
                className="btn-ghost btn-danger rounded-sm px-4 py-2"
              >
                Challenge
              </button>
            </div>
          </div>
        </div>
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
              {pickPalette.map((c, i) => (
                <button
                  key={c}
                  autoFocus={i === 0}
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
        <div className="flex flex-col items-center gap-3">
          {modePicker}
          <button
            onClick={start}
            disabled={players.length < 2}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            Deal next round
          </button>
        </div>
      )}
    </div>
  );
}
