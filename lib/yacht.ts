import { hash, rng } from "./rng.ts";

export const DICE = 5;
export const ROLLS = 3;
export const BONUS_AT = 63;
export const BONUS = 35;

export const CATEGORIES = [
  { id: "ones", label: "Ones", hint: "Sum of the 1s" },
  { id: "twos", label: "Twos", hint: "Sum of the 2s" },
  { id: "threes", label: "Threes", hint: "Sum of the 3s" },
  { id: "fours", label: "Fours", hint: "Sum of the 4s" },
  { id: "fives", label: "Fives", hint: "Sum of the 5s" },
  { id: "sixes", label: "Sixes", hint: "Sum of the 6s" },
  { id: "three", label: "3 of a kind", hint: "Sum of all dice" },
  { id: "four", label: "4 of a kind", hint: "Sum of all dice" },
  { id: "house", label: "Full house", hint: "25" },
  { id: "small", label: "Small straight", hint: "Four in a run: 30" },
  { id: "large", label: "Large straight", hint: "Five in a run: 40" },
  { id: "yacht", label: "Yacht", hint: "Five alike: 50" },
  { id: "chance", label: "Chance", hint: "Sum of all dice" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];
const UPPER: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];

export type Yacht = {
  round: number;
  seed: string;
  order: string[];
  turn: number;

  dice: number[];
  held: boolean[];
  rolls: number;
  throws: number;
  cards: Record<string, Partial<Record<Category, number>>>;
  done: boolean;
};

export const newYacht = (seed: string, order: string[], round = 1): Yacht => ({
  round,
  seed: `${seed}:${round}`,
  order,
  turn: 0,
  dice: [1, 2, 3, 4, 5],
  held: Array(DICE).fill(false),
  rolls: 0,
  throws: 0,
  cards: Object.fromEntries(order.map((id) => [id, {}])),
  done: false,
});

const runOf = (dice: number[]) => {
  const faces = new Set(dice);
  let best = 0;
  for (let start = 1; start <= 6; start++) {
    let n = 0;
    while (faces.has(start + n)) n++;
    best = Math.max(best, n);
  }
  return best;
};

export function score(category: Category, dice: number[]) {
  const counts = [1, 2, 3, 4, 5, 6].map((f) => dice.filter((d) => d === f).length);
  const sum = dice.reduce((a, b) => a + b, 0);
  const most = Math.max(...counts);
  const upper = UPPER.indexOf(category);
  if (upper >= 0) return counts[upper] * (upper + 1);
  switch (category) {
    case "three":
      return most >= 3 ? sum : 0;
    case "four":
      return most >= 4 ? sum : 0;
    case "house":
      return counts.includes(3) && counts.includes(2) ? 25 : 0;
    case "small":
      return runOf(dice) >= 4 ? 30 : 0;
    case "large":
      return runOf(dice) >= 5 ? 40 : 0;
    case "yacht":
      return most === 5 ? 50 : 0;
    default:
      return sum;
  }
}

export function totals(card: Partial<Record<Category, number>>) {
  const upper = UPPER.reduce((s, c) => s + (card[c] ?? 0), 0);
  const bonus = upper >= BONUS_AT ? BONUS : 0;
  const all = Object.values(card).reduce((s, v) => s + (v ?? 0), 0);
  return { upper, bonus, total: all + bonus };
}

export function roll(y: Yacht): Yacht {
  if (y.done || y.rolls >= ROLLS) return y;
  const random = rng(hash(`${y.seed}:${y.throws}`));
  return {
    ...y,
    dice: y.dice.map((d, i) => (y.held[i] && y.rolls > 0 ? d : 1 + Math.floor(random() * 6))),
    rolls: y.rolls + 1,
    throws: y.throws + 1,
  };
}

export const hold = (y: Yacht, i: number): Yacht =>
  y.rolls === 0 || y.rolls >= ROLLS ? y : { ...y, held: y.held.map((h, j) => (j === i ? !h : h)) };

const filled = (y: Yacht, order: string[]) =>
  order.every((p) => Object.keys(y.cards[p]).length === CATEGORIES.length);

export function mark(y: Yacht, category: Category): Yacht {
  const id = y.order[y.turn];
  if (y.done || y.rolls === 0 || y.cards[id][category] !== undefined) return y;
  const next = {
    ...y,
    cards: {
      ...y.cards,
      [id]: { ...y.cards[id], [category]: score(category, y.dice) },
    },
  };
  return {
    ...next,
    done: filled(next, y.order),
    turn: (y.turn + 1) % y.order.length,
    held: Array(DICE).fill(false),
    rolls: 0,
  };
}

// Whoever is up has left the room: take them out of the rotation so the game can finish.
export function leave(y: Yacht): Yacht {
  const order = y.order.filter((_, i) => i !== y.turn);
  if (!order.length) return y;
  return {
    ...y,
    order,
    turn: y.turn % order.length,
    held: Array(DICE).fill(false),
    rolls: 0,
    done: filled(y, order),
  };
}
