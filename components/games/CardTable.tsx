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

// A player at the table: name and chips on a banner over their avatar, their cards under it.
export function Seat({
  name,
  seat,
  chips,
  hot = false,
  dim = false,
  badge,
  children,
}: {
  name: string;
  seat: number;
  chips: number;
  hot?: boolean;
  dim?: boolean;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center gap-1.5 ${dim ? "opacity-45" : ""}`}>
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
        {badge}
      </div>
      {children}
    </div>
  );
}

// A row of overlapping cards, face down where `cards` has no card.
export function Fan({ cards, size }: { cards: (number | undefined)[]; size: string }) {
  return (
    <div className="flex" style={{ fontSize: size }}>
      {cards.map((c, i) => (
        <span
          key={`${i}-${c}`}
          style={{
            marginLeft: i ? "-3.4em" : 0,
            transform: `rotate(${(i - (cards.length - 1) / 2) * 5}deg)`,
          }}
        >
          <PlayingCard card={c} className="card-reveal" />
        </span>
      ))}
    </div>
  );
}
