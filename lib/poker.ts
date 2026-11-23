import { shuffle } from "./rng.ts";
import { RANK_NAMES, rank, suit } from "./cards.ts";

export const STACK = 1000;
export const BLIND = 10;
// Blinds double every this many hands, so a long game still comes to an end.
export const BLINDS_EVERY = 10;
export const TURN_MS = 30_000;

export const blindAt = (hand: number) => BLIND * 2 ** Math.floor((hand - 1) / BLINDS_EVERY);

export const HANDS = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
];

export type Move = {
  by: string;
  act: "fold" | "check" | "call" | "bet" | "raise" | "allin";
  amount?: number;
  // The clock ran out and the table moved for them.
  late?: boolean;
};

export type Poker = {
  seed: string;
  hand: number;
  // The small blind this hand; the big blind is twice it.
  blind: number;
  order: string[];
  // Chips behind, not counting what is already bet.
  chips: Record<string, number>;
  holes: Record<string, number[]>;
  deck: number[];
  board: number[];
  // This street's bets, and everything each player has put in this hand.
  bets: Record<string, number>;
  put: Record<string, number>;
  folded: string[];
  // Who has acted since the last bet or raise.
  acted: string[];
  button: number;
  turn: number;
  // 0 preflop, 1 flop, 2 turn, 3 river.
  street: number;
  // The smallest raise allowed: the size of the last bet or raise.
  raise: number;
  // What each player took from the pot once the hand is over, and hand names at a showdown.
  won: Record<string, number> | null;
  shown: Record<string, string> | null;
  last: Move | null;
};

const TIE = 13 ** 5;

// One five-card hand as a single number to compare: category first, then the ranks that break
// ties, most important first.
function score5(cards: number[]) {
  const ranks = cards.map(rank).sort((a, b) => b - a);
  const count = new Map<number, number>();
  for (const r of ranks) count.set(r, (count.get(r) ?? 0) + 1);
  // Bigger groups first, then higher ranks: kings full of sevens is [K, 7].
  const groups = [...count].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = groups.map(([, n]) => n).join("");
  const flush = cards.every((c) => suit(c) === suit(cards[0]));
  const wheel = groups.length === 5 && ranks[0] === 12 && ranks[1] === 3;
  const straight = groups.length === 5 && (ranks[0] - ranks[4] === 4 || wheel);
  const category =
    straight && flush
      ? 8
      : shape === "41"
        ? 7
        : shape === "32"
          ? 6
          : flush
            ? 5
            : straight
              ? 4
              : shape === "311"
                ? 3
                : shape === "221"
                  ? 2
                  : shape === "2111"
                    ? 1
                    : 0;
  // A-2-3-4-5 is the lowest straight, topped by the five.
  const ties = straight ? [wheel ? 3 : ranks[0]] : groups.map(([r]) => r);
  return ties.reduce((v, r) => v * 13 + r, category) * 13 ** (5 - ties.length);
}

const fives = (cards: number[], k = 5): number[][] =>
  k === 0
    ? [[]]
    : cards.length < k
      ? []
      : [...fives(cards.slice(1), k - 1).map((c) => [cards[0], ...c]), ...fives(cards.slice(1), k)];

// The best five out of any five to seven cards.
export const best = (cards: number[]) => Math.max(...fives(cards).map((c) => score5(c)));
export const handName = (score: number) => HANDS[Math.floor(score / TIE)];

const plural = (r: number) => (RANK_NAMES[r] === "six" ? "sixes" : `${RANK_NAMES[r]}s`);
const title = (s: string) => s[0].toUpperCase() + s.slice(1);

// "Full house, kings full of sevens": the category, then the ranks that decide it.
export function describe(score: number) {
  const a = Math.floor(score / 13 ** 4) % 13;
  const b = Math.floor(score / 13 ** 3) % 13;
  const r = RANK_NAMES;
  switch (Math.floor(score / TIE)) {
    case 8:
      return a === 12 ? "Royal flush" : `Straight flush, ${r[a]} high`;
    case 7:
      return `Four ${plural(a)}`;
    case 6:
      return `Full house, ${plural(a)} full of ${plural(b)}`;
    case 5:
      return `Flush, ${r[a]} high`;
    case 4:
      return `Straight, ${r[a]} high`;
    case 3:
      return `Three ${plural(a)}`;
    case 2:
      return `Two pair, ${plural(a)} and ${plural(b)}`;
    case 1:
      return `Pair of ${plural(a)}`;
    default:
      return `${title(r[a])} high`;
  }
}

// What a player is holding right now: its name and the cards that make it — the pair in a pair,
// all five in a flush, the top card when there's nothing. Before the flop there are only two.
export function read(cards: number[]): { name: string; five: number[]; category: number } {
  if (cards.length < 5) {
    const [hi, lo] = cards.map(rank).sort((x, y) => y - x);
    const suited = suit(cards[0]) === suit(cards[1]);
    return hi === lo
      ? { name: `Pair of ${plural(hi)}`, five: cards, category: 1 }
      : {
          name: `${title(RANK_NAMES[hi])}-${RANK_NAMES[lo]}${suited ? " suited" : ""}`,
          five: cards,
          category: 0,
        };
  }
  let top = { score: -1, five: [] as number[] };
  for (const five of fives(cards)) {
    const score = score5(five);
    if (score > top.score) top = { score, five };
  }
  const category = Math.floor(top.score / TIE);
  const { five } = top;
  const paired = five.filter((c) => five.filter((d) => rank(d) === rank(c)).length > 1);
  const made =
    category === 0
      ? [five.reduce((a, b) => (rank(b) > rank(a) ? b : a))]
      : [1, 2, 3, 7].includes(category)
        ? paired
        : five;
  return { name: describe(top.score), five: made, category };
}

const top = (g: Poker) => Math.max(0, ...Object.values(g.bets));
const live = (g: Poker) => g.order.filter((p) => !g.folded.includes(p));
export const current = (g: Poker) => g.order[g.turn];
export const pot = (g: Poker) => Object.values(g.put).reduce((s, x) => s + x, 0);

function post(g: Poker, id: string, amount: number): Poker {
  const paid = Math.min(amount, g.chips[id]);
  return {
    ...g,
    chips: { ...g.chips, [id]: g.chips[id] - paid },
    bets: { ...g.bets, [id]: (g.bets[id] ?? 0) + paid },
    put: { ...g.put, [id]: (g.put[id] ?? 0) + paid },
  };
}

// Still has a decision this street: short of the bet, or not yet acted with someone to bet
// against.
function needs(g: Poker, id: string) {
  if (g.folded.includes(id) || !g.chips[id]) return false;
  const rivals = live(g).some((p) => p !== id && g.chips[p] > 0);
  return (g.bets[id] ?? 0) < top(g) || (!g.acted.includes(id) && rivals);
}

// The next player round from `turn` with a decision gets it. With nobody left to act the street
// closes, the next cards come out, and after the river it goes to a showdown.
function advance(g: Poker): Poker {
  const alive = live(g);
  if (alive.length === 1) return settle(g, { [alive[0]]: pot(g) }, null);
  const n = g.order.length;
  for (let k = 1; k <= n; k++) {
    const i = (g.turn + k) % n;
    if (needs(g, g.order[i])) return { ...g, turn: i };
  }
  if (g.street === 3) return showdown(g);
  const count = g.street === 0 ? 3 : 1;
  return advance({
    ...g,
    street: g.street + 1,
    board: [...g.board, ...g.deck.slice(0, count)],
    deck: g.deck.slice(count),
    bets: {},
    acted: [],
    raise: g.blind * 2,
    turn: g.button,
  });
}

function settle(g: Poker, won: Record<string, number>, shown: Poker["shown"]): Poker {
  const chips = { ...g.chips };
  for (const [p, x] of Object.entries(won)) chips[p] += x;
  return { ...g, chips, won, shown };
}

// Every layer of the pot goes to the best hand among those who paid into all of it, so a short
// all-in can only win what it covered. Odd chips go to the earliest seat.
function showdown(g: Poker): Poker {
  const alive = live(g);
  const score = Object.fromEntries(alive.map((p) => [p, best([...g.holes[p], ...g.board])]));
  const won: Record<string, number> = {};
  const levels = [...new Set(Object.values(g.put))].sort((a, b) => a - b);
  let floor = 0;
  for (const level of levels) {
    const layer = Object.values(g.put).reduce(
      (s, x) => s + Math.min(Math.max(x - floor, 0), level - floor),
      0
    );
    const paid = alive.filter((p) => g.put[p] >= level);
    const pool = paid.length ? paid : alive;
    const high = Math.max(...pool.map((p) => score[p]));
    const winners = pool.filter((p) => score[p] === high);
    winners.forEach((p, i) => {
      won[p] =
        (won[p] ?? 0) + Math.floor(layer / winners.length) + (i < layer % winners.length ? 1 : 0);
    });
    floor = level;
  }
  return settle(g, won, Object.fromEntries(alive.map((p) => [p, describe(score[p])])));
}

// A new hand. Chips carry over from `prev`; newcomers sit down with a full stack and anyone who
// is out of chips sits out. The button moves one seat each hand.
export function deal(seed: string, ids: string[], prev?: Poker | null): Poker {
  const chips = Object.fromEntries(ids.map((id) => [id, prev?.chips[id] ?? STACK]));
  const order = ids.filter((id) => chips[id] > 0);
  const hand = (prev?.hand ?? 0) + 1;
  const n = order.length;
  const cards = shuffle(
    Array.from({ length: 52 }, (_, i) => i),
    `${seed}:${hand}`
  );
  const button = (hand - 1) % n;
  const blind = blindAt(hand);
  // Heads-up the button posts the small blind and acts first before the flop.
  const small = n === 2 ? button : (button + 1) % n;
  const g: Poker = {
    seed,
    hand,
    blind,
    order,
    chips,
    holes: Object.fromEntries(order.map((id, i) => [id, [cards[i], cards[i + n]]])),
    deck: cards.slice(2 * n),
    board: [],
    bets: {},
    put: {},
    folded: [],
    acted: [],
    button,
    turn: (small + 1) % n,
    street: 0,
    raise: blind * 2,
    won: null,
    shown: null,
    last: null,
  };
  return advance(post(post(g, order[small], blind), order[(small + 1) % n], blind * 2));
}

export function fold(g: Poker): Poker {
  if (g.won) return g;
  const id = current(g);
  return advance({ ...g, folded: [...g.folded, id], last: { by: id, act: "fold" } });
}

// Check, or call the bet in front of you; short of chips, that is all in.
export function call(g: Poker): Poker {
  if (g.won) return g;
  const id = current(g);
  const owe = top(g) - (g.bets[id] ?? 0);
  const next = post(g, id, owe);
  return advance({
    ...next,
    acted: [...g.acted, id],
    last: {
      by: id,
      act: !owe ? "check" : next.chips[id] ? "call" : "allin",
      amount: next.bets[id],
    },
  });
}

export const minRaise = (g: Poker) => top(g) + g.raise;
export const maxRaise = (g: Poker) => g.chips[current(g)] + (g.bets[current(g)] ?? 0);

// Bet or raise so this street's bet totals `to`. Below the minimum it is raised to it, and
// anything past your stack is all in.
export function raise(g: Poker, to: number): Poker {
  if (g.won) return g;
  const id = current(g);
  const high = top(g);
  const total = Math.min(Math.max(to, minRaise(g)), maxRaise(g));
  if (total <= high) return g;
  const next = post(g, id, total - (g.bets[id] ?? 0));
  return advance({
    ...next,
    acted: [id],
    raise: Math.max(g.raise, total - high),
    last: { by: id, act: !next.chips[id] ? "allin" : high ? "raise" : "bet", amount: total },
  });
}

// Out of time: check if that's free, otherwise fold.
export function timeout(g: Poker): Poker {
  if (g.won) return g;
  const next = top(g) > (g.bets[current(g)] ?? 0) ? fold(g) : call(g);
  return { ...next, last: next.last && { ...next.last, late: true } };
}
