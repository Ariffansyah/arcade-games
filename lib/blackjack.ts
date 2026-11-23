import { shuffle } from "./rng.ts";
import { rank } from "./cards.ts";

export const STACK = 1000;
export const MIN_BET = 10;
export const TURN_MS = 20_000;
// Hands one player may have going at once after splitting.
export const MAX_BOXES = 4;
const DECKS = 6;

export type Move = {
  by: string;
  act: "bet" | "sit" | "hit" | "stand" | "double" | "split" | "surrender";
  amount?: number;
  // The clock ran out and the table moved for them.
  late?: boolean;
};

// One hand on the felt with its own bet. Splitting a pair turns one box into two.
export type Box = {
  by: string;
  cards: number[];
  bet: number;
  split?: boolean;
  doubled?: boolean;
  surrendered?: boolean;
};

export type Blackjack = {
  seed: string;
  round: number;
  // Bets go round the table one at a time, then every box is played in seat order.
  phase: "bet" | "play" | "done";
  order: string[];
  // Chips behind, not counting what is bet on the table.
  chips: Record<string, number>;
  // What each player put down; nothing bet means sitting the round out.
  bets: Record<string, number>;
  boxes: Box[];
  dealer: number[];
  shoe: number[];
  // A seat in `order` while betting, a box in `boxes` while playing.
  turn: number;
  // What each player won or lost once the round is settled.
  paid: Record<string, number> | null;
  last: Move | null;
};

// Aces count 11 until that would bust, then 1. Soft means an ace is still counting 11.
export function count(cards: number[]) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const r = rank(c);
    if (r === 12) aces++;
    total += r === 12 ? 11 : Math.min(r + 2, 10);
  }
  for (; total > 21 && aces; aces--) total -= 10;
  return { total, soft: aces > 0 };
}

export const value = (cards: number[]) => count(cards).total;
export const natural = (cards: number[]) => cards.length === 2 && value(cards) === 21;
// 21 on two cards after a split is just 21, not blackjack.
export const blackjack = (b: Box) => !b.split && natural(b.cards);

export const current = (g: Blackjack) =>
  g.phase === "bet" ? g.order[g.turn] : (g.boxes[g.turn]?.by ?? "");
export const box = (g: Blackjack): Box | undefined =>
  g.phase === "play" ? g.boxes[g.turn] : undefined;

// A new round opens for bets. Chips carry over; anyone new or broke is staked a fresh stack.
export const open = (seed: string, ids: string[], prev?: Blackjack | null): Blackjack => ({
  seed,
  round: (prev?.round ?? 0) + 1,
  phase: "bet",
  order: ids,
  chips: Object.fromEntries(ids.map((id) => [id, prev?.chips[id] || STACK])),
  bets: {},
  boxes: [],
  dealer: [],
  shoe: [],
  turn: 0,
  paid: null,
  last: null,
});

// Someone the table opened without, arriving while bets are still going round, bets last.
export const sit = (g: Blackjack, id: string): Blackjack =>
  g.phase !== "bet" || g.order.includes(id)
    ? g
    : { ...g, order: [...g.order, id], chips: { ...g.chips, [id]: g.chips[id] || STACK } };

export function bet(g: Blackjack, amount: number): Blackjack {
  if (g.phase !== "bet") return g;
  const id = current(g);
  const stake = amount > 0 ? Math.min(Math.max(amount, MIN_BET), g.chips[id]) : 0;
  const next: Blackjack = {
    ...g,
    chips: { ...g.chips, [id]: g.chips[id] - stake },
    bets: { ...g.bets, [id]: stake },
    turn: g.turn + 1,
    last: { by: id, act: stake ? "bet" : "sit", amount: stake },
  };
  return next.turn < g.order.length ? next : start(next);
}

// Two cards each and two for the dealer, from a fresh six-deck shoe, dealt one at a time round
// the table. A dealer blackjack ends the round on the spot.
function start(g: Blackjack): Blackjack {
  const seated = g.order.filter((p) => g.bets[p]);
  if (!seated.length) return { ...g, phase: "done", paid: {} };
  const shoe = shuffle(
    Array.from({ length: 52 * DECKS }, (_, i) => i),
    `${g.seed}:${g.round}`
  );
  const k = seated.length;
  const dealt: Blackjack = {
    ...g,
    phase: "play",
    boxes: seated.map((p, i) => ({ by: p, cards: [shoe[i], shoe[i + k + 1]], bet: g.bets[p] })),
    dealer: [shoe[k], shoe[2 * k + 1]],
    shoe: shoe.slice(2 * k + 2),
    turn: -1,
  };
  return natural(dealt.dealer) ? settle(dealt) : move(dealt);
}

// Nothing left to decide: 21 or over, or split aces, which get one card each.
const finished = (b: Box) => value(b.cards) >= 21 || (!!b.split && rank(b.cards[0]) === 12);

// On to the next box with a decision to make; when there is none, the dealer plays.
function move(g: Blackjack): Blackjack {
  for (let i = g.turn + 1; i < g.boxes.length; i++)
    if (!finished(g.boxes[i])) return { ...g, turn: i };
  return settle(dealerPlays(g));
}

// The dealer draws to 17 and stands on every 17, but only if someone is still in to beat.
function dealerPlays(g: Blackjack): Blackjack {
  const contest = g.boxes.some((b) => !b.surrendered && value(b.cards) <= 21 && !blackjack(b));
  let { dealer, shoe } = g;
  while (contest && value(dealer) < 17) {
    dealer = [...dealer, shoe[0]];
    shoe = shoe.slice(1);
  }
  return { ...g, dealer, shoe };
}

// What comes back to the player off one box once the dealer is done: blackjack pays 3 to 2, a
// win evens, a tie pushes, surrender returns half. A dealer blackjack beats any other 21.
export function payout(g: Blackjack, b: Box) {
  const d = value(g.dealer);
  const v = value(b.cards);
  if (b.surrendered) return Math.floor(b.bet / 2);
  if (blackjack(b)) return natural(g.dealer) ? b.bet : b.bet + Math.floor(b.bet * 1.5);
  if (v > 21 || natural(g.dealer) || (d <= 21 && d > v)) return 0;
  return d === v ? b.bet : b.bet * 2;
}

function settle(g: Blackjack): Blackjack {
  const chips = { ...g.chips };
  const paid: Record<string, number> = {};
  for (const b of g.boxes) {
    const back = payout(g, b);
    chips[b.by] += back;
    paid[b.by] = (paid[b.by] ?? 0) + back - b.bet;
  }
  return { ...g, phase: "done", chips, paid, turn: -1 };
}

// Puts a box back at the turn, and moves on if it needs nothing more.
function update(g: Blackjack, next: Box, last: Move, extra: Partial<Blackjack> = {}) {
  const boxes = g.boxes.map((b, i) => (i === g.turn ? next : b));
  const after = { ...g, ...extra, boxes, last };
  return finished(next) || next.doubled || next.surrendered ? move(after) : after;
}

export function hit(g: Blackjack): Blackjack {
  const b = box(g);
  if (!b) return g;
  return update(
    g,
    { ...b, cards: [...b.cards, g.shoe[0]] },
    { by: b.by, act: "hit" },
    { shoe: g.shoe.slice(1) }
  );
}

export const stand = (g: Blackjack): Blackjack => {
  const b = box(g);
  return b ? move({ ...g, last: { by: b.by, act: "stand" } }) : g;
};

export const canDouble = (g: Blackjack) => {
  const b = box(g);
  return !!b && b.cards.length === 2 && g.chips[b.by] >= b.bet;
};

// Double the bet, take exactly one more card, and stand.
export function double(g: Blackjack): Blackjack {
  const b = box(g);
  if (!b || !canDouble(g)) return g;
  return update(
    g,
    { ...b, cards: [...b.cards, g.shoe[0]], bet: b.bet * 2, doubled: true },
    { by: b.by, act: "double" },
    { shoe: g.shoe.slice(1), chips: { ...g.chips, [b.by]: g.chips[b.by] - b.bet } }
  );
}

export const canSplit = (g: Blackjack) => {
  const b = box(g);
  return (
    !!b &&
    b.cards.length === 2 &&
    rank(b.cards[0]) === rank(b.cards[1]) &&
    g.chips[b.by] >= b.bet &&
    g.boxes.filter((x) => x.by === b.by).length < MAX_BOXES
  );
};

// A pair becomes two hands, each with the same bet and a fresh second card. Split aces get just
// that one card each.
export function split(g: Blackjack): Blackjack {
  const b = box(g);
  if (!b || !canSplit(g)) return g;
  const [one, two] = b.cards.map((c, i) => ({ ...b, cards: [c, g.shoe[i]], split: true }));
  const next: Blackjack = {
    ...g,
    boxes: [...g.boxes.slice(0, g.turn), one, two, ...g.boxes.slice(g.turn + 1)],
    shoe: g.shoe.slice(2),
    chips: { ...g.chips, [b.by]: g.chips[b.by] - b.bet },
    last: { by: b.by, act: "split" },
  };
  return finished(one) ? move(next) : next;
}

export const canSurrender = (g: Blackjack) => {
  const b = box(g);
  return !!b && b.cards.length === 2 && !b.split;
};

// Give up the hand on its first two cards and take half the bet back.
export function surrender(g: Blackjack): Blackjack {
  const b = box(g);
  if (!b || !canSurrender(g)) return g;
  return update(g, { ...b, surrendered: true }, { by: b.by, act: "surrender" });
}

// Out of time: sit the round out while betting, stand while playing.
export function timeout(g: Blackjack): Blackjack {
  const next = g.phase === "bet" ? bet(g, 0) : g.phase === "play" ? stand(g) : g;
  return next === g || !next.last ? next : { ...next, last: { ...next.last, late: true } };
}
