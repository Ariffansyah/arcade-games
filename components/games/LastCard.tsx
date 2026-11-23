"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

const AVATAR_COLOURS = [
  "#ff2d95",
  "#22d3ee",
  "#ffc83d",
  "#39ff88",
  "#a78bfa",
  "#fb923c",
  "#ff2e63",
  "#5b7bff",
];

// A little arcade critter per seat, so everyone reads at a glance across the table.
function Avatar({ seat, className = "" }: { seat: number; className?: string }) {
  const colour = AVATAR_COLOURS[seat % AVATAR_COLOURS.length];
  const look = seat % 2 ? 1 : -1;
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <rect width="40" height="40" rx="6" fill="#120b22" />
      {seat % 3 === 0 && (
        <path
          d="M9 15 L12 5 L18 12 M31 15 L28 5 L22 12"
          fill={colour}
          stroke={colour}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {seat % 3 === 1 && (
        <>
          <path d="M20 10 V4" stroke={colour} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="4" r="2.6" fill={colour} />
        </>
      )}
      {seat % 3 === 2 && (
        <path
          d="M9 17 q-5 -11 6 -9 M31 17 q5 -11 -6 -9"
          fill="none"
          stroke={colour}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
      <rect x="7" y="10" width="26" height="26" rx="11" fill={colour} />
      <circle cx="15" cy="21" r="4.3" fill="#f7f3ff" />
      <circle cx="25" cy="21" r="4.3" fill="#f7f3ff" />
      <circle cx={15 + look} cy="21.5" r="2" fill="#06030d" />
      <circle cx={25 + look} cy="21.5" r="2" fill="#06030d" />
      <path
        d={seat % 2 ? "M15 29 q5 4 10 0" : "M16 30 h8"}
        stroke="#06030d"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Name banner over the avatar, cards left in a badge beside it.
function Tag({
  label,
  seat,
  count,
  score,
  hot,
  won,
  compact = false,
}: {
  label: string;
  seat: number;
  count: number;
  score: number;
  hot: boolean;
  won: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-end ${compact ? "gap-0.5" : "gap-1.5"} ${won ? "flash-win" : ""}`}>
      <div className={`relative flex flex-col ${compact ? "items-center" : "items-start"}`}>
        <span
          className={`seat-banner ${hot ? "seat-banner-hot" : ""} ${
            compact ? "max-w-[4.2rem] text-[0.58rem]" : ""
          }`}
        >
          <span className="truncate">{label}</span>
          <span className="neon-green shrink-0">{score}</span>
        </span>
        <Avatar
          seat={seat}
          className={`rounded-md border-2 ${compact ? "h-8 w-8" : "h-10 w-10 sm:h-12 sm:w-12"} ${
            hot
              ? "border-emerald-400 shadow-[0_0_14px_var(--color-emerald-500)]"
              : "border-zinc-200/70"
          }`}
        />
        {compact && (
          <span className="count-badge pixel absolute -right-3 -bottom-1 h-5 min-w-5 text-[0.72rem]">
            {count}
          </span>
        )}
      </div>
      {!compact && <span className="count-badge pixel">{count}</span>}
      {count === 1 && !compact && (
        <span className="pixel blink self-center text-[0.72rem] text-[color:var(--neon-amber)]">
          Last card!
        </span>
      )}
    </div>
  );
}

type Seat = { id: string; seat: number; angle: number };

// Everyone else spreads across the far side in play order, starting on your left, so play
// runs round the table clockwise.
function opponents(order: string[], me: string): Seat[] {
  const base = order.indexOf(me);
  const rest = base < 0 ? order : [...order.slice(base + 1), ...order.slice(0, base)];
  const k = rest.length;
  return rest.map((id, i) => ({
    id,
    seat: order.indexOf(id),
    angle: k === 1 ? 270 : 195 + (i * 150) / (k - 1),
  }));
}

const spot = (angle: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: 50 + 41 * Math.cos(a), y: 40 + 27 * Math.sin(a) };
};

const onResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const usePortrait = () =>
  useSyncExternalStore(
    onResize,
    () => innerHeight > innerWidth,
    () => false
  );

const TILT = 55;
const FORESHORTEN = Math.cos((TILT * Math.PI) / 180);

export default function LastCard({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`lastcard:${code}`, me.id);
  const [picking, setPicking] = useState(-1);
  const [mode, setMode] = useState<Mode | null>(null);
  const portrait = usePortrait();

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
          className={`btn-ghost rounded-sm px-3 py-2 text-[0.88rem] ${
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
      <div className="uno-stage absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
        <div className="menu-in cab flex w-full max-w-xl flex-col items-center gap-5 rounded-md p-5 text-center">
          <h2 className="pixel neon-cyan text-sm">Last Card</h2>
          <div className="flex gap-2 text-[length:clamp(7px,2.2vw,11px)]" aria-hidden>
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
          <p className="text-base text-zinc-300">
            Match the colour or the face. Skips, reverses, draw cards and wilds keep it nasty. First
            to empty their hand wins the round. The Flip deck has a dark side: play a Flip and every
            card on the table turns over.
          </p>
          {modePicker}
          {isHost ? (
            <button
              onClick={start}
              disabled={players.length < 2}
              className="btn-arcade play-pulse rounded-sm px-6 py-3 disabled:opacity-40"
            >
              Deal
            </button>
          ) : (
            <span className="blink text-base text-zinc-400">
              Waiting for {name(players[0]?.id)} to deal…
            </span>
          )}
        </div>
      </div>
    );

  const flip = table.mode === "flip";
  const dark = !!table.dark;
  const pile = table.pile.slice(-7);
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

  const rivals = opponents(table.order, me.id);
  // A phone held upright can't fit four or more round the arc, so they line up across the top.
  const row = portrait && rivals.length >= 4;
  const seatAt = (i: number) =>
    row ? { x: ((i + 0.5) / rivals.length) * 100, y: 13 } : spot(rivals[i]?.angle ?? 270);
  const seating = table.order.includes(me.id);
  const from = (id: string) =>
    id === me.id && seating ? { x: 50, y: 115 } : seatAt(rivals.findIndex((r) => r.id === id));
  const showBack = (card: number) => {
    const other = backOf(table, card);
    return other ? <Face c={other} dark={!dark} /> : <Back />;
  };
  const canDraw = myTurn && table.drawn < 0 && !pending;

  return (
    <div
      key={dark ? "dark" : "light"}
      className={`uno-stage absolute inset-0 overflow-hidden ${dark ? "uno-stage-dark" : ""} ${
        flip && table.pile.length > 1 ? "stage-flash" : ""
      }`}
    >
      {flip && (
        <span className="pixel absolute top-3 left-3 z-10 rounded-sm bg-[#06030d]/70 px-2 py-1 text-[0.72rem] text-zinc-300">
          {dark ? "Dark side" : "Light side"}
        </span>
      )}

      <div
        className="absolute top-[50%] left-1/2 h-[min(60vmin,540px)] w-[min(60vmin,540px)] -translate-x-1/2 -translate-y-1/2"
        style={{ transform: `perspective(1000px) rotateX(${TILT}deg)` }}
      >
        <div className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),rgba(255,255,255,0.03)_55%,transparent_70%)]" />
        <div
          aria-hidden
          className="absolute inset-[22%] rounded-full blur-2xl"
          style={{ background: HUE[table.colour], opacity: 0.35 }}
        />
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className={`absolute inset-0 h-full w-full ${table.dir === 1 ? "spin-slow" : "spin-slow-back"}`}
          style={{ filter: `drop-shadow(0 0 6px ${HUE[table.colour]})` }}
        >
          <g transform={table.dir === 1 ? undefined : "translate(100 0) scale(-1 1)"}>
            {[0, 180].map((r) => (
              <g key={r} transform={`rotate(${r} 50 50)`}>
                <path
                  d="M 12.4 36.3 A 40 40 0 0 1 76 19.6"
                  fill="none"
                  stroke={HUE[table.colour]}
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <path d="M 70 13 L 82 22 L 70 27.5 Z" fill={HUE[table.colour]} opacity="0.85" />
              </g>
            ))}
          </g>
        </svg>

        <button
          onClick={() => canDraw && send(draw(table))}
          disabled={!canDraw}
          aria-label={`Draw a card. ${table.deck.length} left.`}
          className="absolute top-[30%] left-[16%] text-[length:inherit] normal-case disabled:cursor-default"
          style={{ fontSize: "clamp(6px, 1.5vmin, 12px)" }}
        >
          {[4, 3, 2, 1].map((n) => (
            <span
              key={n}
              aria-hidden
              className="absolute inset-0"
              style={{ transform: `translate(${n * 0.22}em, ${n * 0.3}em)` }}
            >
              <Back className="opacity-80" />
            </span>
          ))}
          {flip && deckTop !== undefined ? (
            <Face c={backOf(table, deckTop)!} dark={!dark} className="relative" />
          ) : (
            <Back className="relative" />
          )}
        </button>

        <div
          className="absolute top-1/2 left-1/2 h-[9.4em] w-[6.2em] -translate-x-1/2 -translate-y-1/2"
          style={{ fontSize: "clamp(7px, 1.8vmin, 14px)" }}
        >
          {pile.map((card, i) => {
            const newest = i === pile.length - 1;
            const thrown = newest && last?.act === "play" ? from(last.by) : null;
            // Each card lands on the last one: its own layer, a little higher, at its own angle.
            return (
              <span
                key={`${card}-${table.pile.length - pile.length + i}`}
                className="absolute inset-0"
                style={{
                  transform: `translate(${((card * 53) % 13) / 10 - 0.6}em, ${
                    ((card * 29) % 11) / 10 - 0.5 + (i - pile.length + 1) * 0.3
                  }em)`,
                  zIndex: i,
                }}
              >
                <span
                  className={`absolute inset-0 ${thrown ? "card-fly" : ""}`}
                  style={
                    {
                      "--rot": `${((card * 37) % 44) - 22}deg`,
                      "--fx": thrown ? `${thrown.x - 50}cqw` : "0",
                      "--fy": thrown ? `${(thrown.y - 50) / FORESHORTEN}cqh` : "0",
                      transform: "rotate(var(--rot))",
                    } as React.CSSProperties
                  }
                >
                  <Face c={faceOf(table, card)} dark={dark} lift={newest} />
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {rivals.map(({ id, seat, angle }, i) => {
        const at = seatAt(i);
        const turn = row ? 0 : -Math.cos((angle * Math.PI) / 180) * 52;
        const cards = table.hands[id];
        const shown = cards.slice(0, 12);
        return (
          <div
            key={id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{
              left: row ? `${at.x}%` : `clamp(4.5rem, ${at.x}%, calc(100% - 4.5rem))`,
              top: `${at.y}%`,
            }}
          >
            <Tag
              label={name(id)}
              seat={seat}
              count={cards.length}
              score={table.scores[id] ?? 0}
              hot={up === id}
              won={table.winner === id}
              compact={row}
            />
            <div
              className={`flex ${row ? "text-[3px]" : "text-[length:clamp(3.6px,1.15vmin,8px)]"}`}
              style={{ transform: `perspective(600px) rotateY(${turn}deg)` }}
              aria-hidden
            >
              {shown.map((card, i) => (
                <span key={card} style={{ marginLeft: i ? "-4.3em" : 0 }}>
                  {showBack(card)}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {flying > 0 &&
        Array.from({ length: flying }, (_, i) => {
          const to = from(drawer);
          return (
            <span
              key={`${moveKey}-${i}`}
              aria-hidden
              className="card-deal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[length:clamp(6px,1.5vmin,12px)]"
              style={
                {
                  "--fx": `${to.x - 50}cqw`,
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

      {table.winner && (
        <div className="menu-in absolute top-[50%] left-1/2 z-20 flex w-[min(90%,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-md border-2 border-emerald-500 bg-[#06030d]/90 p-5 text-center shadow-[0_0_40px_rgba(57,255,136,0.35)]">
          <span className="flash-win neon-green pixel text-[1.12rem] leading-relaxed">
            {name(table.winner)} is out of cards!
          </span>
          <span className="text-base text-zinc-300">
            {name(table.winner)} has {table.scores[table.winner] ?? 0} points.
          </span>
          {isHost ? (
            <>
              {modePicker}
              <button
                onClick={start}
                disabled={players.length < 2}
                className="btn-arcade play-pulse rounded-sm px-5 py-3 disabled:opacity-40"
              >
                Deal next round
              </button>
            </>
          ) : (
            <span className="blink text-sm text-zinc-500">
              Waiting for {name(players[0]?.id)} to deal…
            </span>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-6xl items-end gap-2 px-3">
          {seating ? (
            <Tag
              label={name(me.id)}
              seat={table.order.indexOf(me.id)}
              count={table.hands[me.id].length}
              score={table.scores[me.id] ?? 0}
              hot={myTurn}
              won={table.winner === me.id}
            />
          ) : (
            <span className="text-sm text-zinc-400">
              You are watching. You&apos;ll be dealt in next round.
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <p
              role="status"
              className={`text-sm sm:text-base ${myTurn ? "neon-green" : "text-zinc-200"}`}
            >
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
            {lastLine && (
              <p className="line-clamp-2 text-xs text-zinc-400 sm:text-sm">{lastLine}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {canDraw && (
              <button
                onClick={() => send(draw(table))}
                className="btn-arcade rounded-sm px-3 py-2 text-[0.88rem]"
              >
                Draw
              </button>
            )}
            {myTurn && table.drawn >= 0 && (
              <button
                onClick={() => send(pass(table))}
                className="btn-ghost rounded-sm px-3 py-2 text-[0.8rem]"
              >
                Keep, pass
              </button>
            )}
          </div>
        </div>

        {hand && (
          <div className="w-full max-w-6xl overflow-x-auto px-3 pt-5 [container-type:inline-size]">
            <div
              className="flex justify-center-safe text-[length:clamp(8px,1.5vmin+3px,15px)]"
              style={{ "--n": hand.length } as React.CSSProperties}
            >
              {hand.map((card, i) => {
                const ok = myTurn && playable(table, card);
                const c = faceOf(table, card);
                return (
                  <button
                    key={card}
                    onClick={() => tryPlay(card)}
                    disabled={!ok}
                    aria-label={`Play ${describe(c)}`}
                    className={`shrink-0 text-[length:inherit] normal-case transition-transform duration-150 ${
                      ok
                        ? "-translate-y-3 hover:-translate-y-6 focus-visible:-translate-y-6"
                        : myTurn
                          ? "brightness-[0.6]"
                          : ""
                    }`}
                    style={{
                      marginLeft: i
                        ? "clamp(-4.6em, calc((100cqw - var(--n) * 6.2em) / (var(--n) - 1)), -1.4em)"
                        : 0,
                    }}
                  >
                    <Face c={c} dark={dark} lift={ok} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {upGone && isHost && !table.winner && (
        <button
          onClick={() => send(leave(table))}
          className="btn-ghost absolute top-3 right-3 z-10 rounded-sm px-3 py-2 text-[0.8rem]"
        >
          Skip the player who left
        </button>
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
            <span className="pixel text-[0.96rem] text-zinc-300">Call a colour</span>
            <div className="grid grid-cols-2 gap-3">
              {pickPalette.map((c, i) => (
                <button
                  key={c}
                  autoFocus={i === 0}
                  onClick={() => pickColour(c)}
                  className="h-20 w-20 rounded-md border-2 border-white/70 text-[0.88rem] text-[#06030d]"
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
    </div>
  );
}
