"use client";

import { RANKS, SUITS, cardName, rank, suit } from "@/lib/cards";
import { Avatar } from "./LastCard";

const INK = "#120b22";
const RED = "#ff2e63";
const SHAPE =
  "relative block h-[8.7em] w-[6.2em] shrink-0 rounded-[0.7em] bg-[#f7f3ff] shadow-[0_0.3em_0.7em_rgba(0,0,0,0.55)]";

// A playing card sized in em, so the font size on `className` scales it. Without a card it is
// face down.
export function PlayingCard({
  card,
  className = "",
  style,
}: {
  card?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (card === undefined)
    return (
      <span
        role="img"
        aria-label="Face-down card"
        className={`${SHAPE} p-[0.35em] ${className}`}
        style={style}
      >
        <span
          className="block h-full w-full rounded-[0.45em]"
          style={{
            background: `repeating-linear-gradient(45deg, #ff2d95 0 0.16em, transparent 0.16em 0.8em), repeating-linear-gradient(-45deg, #22d3ee 0 0.16em, transparent 0.16em 0.8em), ${INK}`,
          }}
        />
      </span>
    );
  const r = RANKS[rank(card)];
  // The text selector keeps phones from drawing hearts and diamonds as emoji.
  const s = `${SUITS[suit(card)]}︎`;
  return (
    <span
      role="img"
      aria-label={cardName(card)}
      className={`${SHAPE} ${className}`}
      style={{ color: suit(card) === 1 || suit(card) === 2 ? RED : INK, ...style }}
    >
      {["top-[0.35em] left-[0.45em]", "right-[0.45em] bottom-[0.35em] rotate-180"].map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={`card-ink absolute flex flex-col items-center text-[1.45em] leading-[0.95] ${corner}`}
        >
          <span>{r}</span>
          <span className="not-italic">{s}</span>
        </span>
      ))}
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-[3.4em] leading-none"
      >
        {r === "J" || r === "Q" || r === "K" ? <span className="card-ink">{r}</span> : s}
      </span>
    </span>
  );
}

const TONES = {
  plain: "border-zinc-300 text-zinc-100",
  chip: "border-amber-300 text-amber-200",
  good: "border-emerald-400 text-emerald-300",
  bad: "border-red-400 text-red-300",
};

export type Say = { key: string; text: string; tone?: keyof typeof TONES };

// A player at the table: name and chips on a banner over their avatar, their cards under it.
// `say` pops their latest move up over the avatar, so everyone sees who just did what.
export function Seat({
  name,
  seat,
  chips,
  hot = false,
  dim = false,
  won = false,
  clock,
  badge,
  say,
  children,
}: {
  name: string;
  seat: number;
  chips: number;
  hot?: boolean;
  dim?: boolean;
  won?: boolean;
  // Share of the turn's time left, drawn under the avatar of whoever is up.
  clock?: number;
  badge?: React.ReactNode;
  say?: Say | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${dim ? "opacity-45" : ""} ${won ? "flash-win" : ""}`}
    >
      <div className="relative flex flex-col items-center">
        <span className={`seat-banner ${hot ? "seat-banner-hot" : ""}`}>
          <span className="truncate">{name}</span>
          <span className={hot ? "shrink-0" : "neon-green shrink-0"}>{chips}</span>
        </span>
        <Avatar
          seat={seat}
          className={`h-10 w-10 rounded-md border-2 sm:h-12 sm:w-12 ${
            hot
              ? "border-emerald-400 shadow-[0_0_14px_var(--color-emerald-500)]"
              : "border-zinc-200/70"
          }`}
        />
        {hot && clock !== undefined && (
          <span aria-hidden className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-zinc-800">
            <span
              className={`block h-full transition-[width] duration-200 ease-linear ${
                clock <= 0.25 ? "bg-red-500" : "bg-emerald-400"
              }`}
              style={{ width: `${clock * 100}%` }}
            />
          </span>
        )}
        {say && (
          <span
            key={say.key}
            aria-hidden
            className={`say-pop pixel absolute top-1/2 left-1/2 z-10 -translate-x-1/2 rounded-sm border-2 bg-[#06030d]/90 px-1.5 py-1 text-[0.68rem] whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${TONES[say.tone ?? "plain"]}`}
          >
            {say.text}
          </span>
        )}
        {badge}
      </div>
      {children}
    </div>
  );
}

export const GLOW = "0 0 0 0.16em #ffc83d, 0 0 1.2em rgba(255, 200, 61, 0.7)";

// A row of overlapping cards, face down where `cards` has no card. Given a `round`, each card
// flies in from `from` (a vertical offset) when it's dealt, the first two staggered by `delay`
// and `step` the way a dealer goes round the table; later cards are hits that arrive at once, or
// `later` ms apart when several land together, like the dealer drawing out.
// A card turned face up flips over where it lies. Cards in `glow` are lit, the rest dimmed.
// `mucked` slides the hand away, the way a folded hand goes into the middle.
export function Fan({
  cards,
  size,
  mucked = false,
  round,
  from = "-30vh",
  delay = 0,
  step = 0,
  later = 0,
  glow,
}: {
  cards: (number | undefined)[];
  size: string;
  mucked?: boolean;
  round?: string | number;
  from?: string;
  delay?: number;
  step?: number;
  later?: number;
  glow?: number[];
}) {
  return (
    <div className={`flex ${mucked ? "muck" : ""}`} style={{ fontSize: size }}>
      {cards.map((c, i) => {
        const lit = c !== undefined && glow?.includes(c);
        return (
          <span
            key={round === undefined ? `${i}-${c}` : `${round}-${i}`}
            className={round === undefined ? "" : "deal-in"}
            style={
              {
                marginLeft: i ? "-3.4em" : 0,
                "--dy": from,
                "--delay": `${i < 2 ? delay + i * step : (i - 1) * later}ms`,
              } as React.CSSProperties
            }
          >
            <span
              className="block transition-[transform,filter] duration-300"
              style={{
                transform: `rotate(${(i - (cards.length - 1) / 2) * 5}deg) translateY(${lit ? -0.7 : 0}em)`,
                filter: glow?.length && !lit ? "brightness(0.6)" : undefined,
              }}
            >
              <PlayingCard
                key={c ?? "back"}
                card={c}
                className="card-reveal"
                style={lit ? { boxShadow: GLOW } : undefined}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
