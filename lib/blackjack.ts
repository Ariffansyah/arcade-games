import { shuffle } from "./rng.ts";
import { rank } from "./cards.ts";

export const STACK = 1000;
export const MIN_BET = 10;
const DECKS = 6;

export type Move = { by: string; act: "bet" | "sit" | "hit" | "stand" | "double"; amount?: number };

export type Blackjack = {
  seed: string;
  round: number;
  // Bets go round the table one at a time, then everyone plays their hand in seat order.
  phase: "bet" | "play" | "done";
  order: string[];
  // Chips behind, not counting the bet on the table.
  chips: Record<string, number>;
  // Nothing bet means sitting the round out.
  bets: Record<string, number>;
  hands: Record<string, number[]>;
  dealer: number[];
  shoe: number[];
  turn: number;
  // What each player won or lost once the round is settled.
  paid: Record<string, number> | null;
  last: Move | null;
};

// Aces count 11 until that would bust, then 1.
export function value(cards: number[]) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const r = rank(c);
    if (r === 12) aces++;
    total += r === 12 ? 11 : Math.min(r + 2, 10);
  }
  for (; total > 21 && aces; aces--) total -= 10;
  return total;
}

export const natural = (cards: number[]) => cards.length === 2 && value(cards) === 21;
export const current = (g: Blackjack) => g.order[g.turn];

// A new round opens for bets. Chips carry over; anyone new or broke is staked a fresh stack.
export const open = (seed: string, ids: string[], prev?: Blackjack | null): Blackjack => ({
  seed,
  round: (prev?.round ?? 0) + 1,
  phase: "bet",
  order: ids,
  chips: Object.fromEntries(ids.map((id) => [id, prev?.chips[id] || STACK])),
  bets: {},
  hands: {},
  dealer: [],
  shoe: [],
  turn: 0,
  paid: null,
  last: null,
});

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

// Two cards each and two for the dealer, from a fresh six-deck shoe. A dealer blackjack ends the
// round on the spot.
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
    hands: Object.fromEntries(seated.map((p, i) => [p, [shoe[i], shoe[i + k + 1]]])),
    dealer: [shoe[k], shoe[2 * k + 1]],
    shoe: shoe.slice(2 * k + 2),
    turn: -1,
  };
  return natural(dealt.dealer) ? settle(dealt) : move(dealt);
}

// On to the next seated player with a hand to play; when there is none, the dealer plays.
function move(g: Blackjack): Blackjack {
  for (let i = g.turn + 1; i < g.order.length; i++) {
    const p = g.order[i];
    if (g.bets[p] && !natural(g.hands[p])) return { ...g, turn: i };
  }
  return settle(dealerPlays(g));
}

// The dealer draws to 17 and stands on every 17, but only if someone is still in to beat.
function dealerPlays(g: Blackjack): Blackjack {
  const contest = g.order.some((p) => g.bets[p] && value(g.hands[p]) <= 21 && !natural(g.hands[p]));
  let { dealer, shoe } = g;
  while (contest && value(dealer) < 17) {
    dealer = [...dealer, shoe[0]];
    shoe = shoe.slice(1);
  }
  return { ...g, dealer, shoe };
}

// Blackjack pays 3 to 2, a win evens, a tie pushes. A dealer blackjack beats any other 21.
function settle(g: Blackjack): Blackjack {
  const d = value(g.dealer);
  const dealerNatural = natural(g.dealer);
  const chips = { ...g.chips };
  const paid: Record<string, number> = {};
  for (const p of g.order) {
    const stake = g.bets[p];
    if (!stake) continue;
    const v = value(g.hands[p]);
    const back = natural(g.hands[p])
      ? dealerNatural
        ? stake
        : stake + Math.floor(stake * 1.5)
      : v > 21 || dealerNatural || (d <= 21 && d > v)
        ? 0
        : d === v
          ? stake
          : stake * 2;
    chips[p] += back;
    paid[p] = back - stake;
  }
  return { ...g, phase: "done", chips, paid, turn: -1 };
}

const draw = (g: Blackjack, id: string): Blackjack => ({
  ...g,
  hands: { ...g.hands, [id]: [...g.hands[id], g.shoe[0]] },
  shoe: g.shoe.slice(1),
});

export function hit(g: Blackjack): Blackjack {
  if (g.phase !== "play") return g;
  const id = current(g);
  const next = { ...draw(g, id), last: { by: id, act: "hit" as const } };
  return value(next.hands[id]) >= 21 ? move(next) : next;
}

export const stand = (g: Blackjack): Blackjack =>
  g.phase !== "play" ? g : move({ ...g, last: { by: current(g), act: "stand" } });

export const canDouble = (g: Blackjack) =>
  g.phase === "play" &&
  g.hands[current(g)].length === 2 &&
  g.chips[current(g)] >= g.bets[current(g)];

// Double the bet, take exactly one more card, and stand.
export function double(g: Blackjack): Blackjack {
  if (!canDouble(g)) return g;
  const id = current(g);
  const stake = g.bets[id];
  return move({
    ...draw(g, id),
    chips: { ...g.chips, [id]: g.chips[id] - stake },
    bets: { ...g.bets, [id]: stake * 2 },
    last: { by: id, act: "double" },
  });
}
