import { hash, rng } from "./rng.ts";

export const CATEGORIES = [
  "an animal", "a country", "a food", "a colour", "something in a kitchen",
  "a body part", "a sport", "a job", "something cold", "a musical instrument",
  "something you wear", "a fruit or vegetable", "a city", "something in a car",
  "a board game", "something at school", "a drink", "something that flies",
  "a tool", "something in this room",
];

const LETTERS = "abcdefghijklmnoprstuvw";

export const FUSE_START = 15_000;
export const FUSE_FLOOR = 5_000;
export const LIVES = 2;

export type Fuse = {
  round: number;

  order: string[];
  turn: number;
  category: string;
  letter: string;
  lives: Record<string, number>;

  fuse: number;
  startedAt: number;

  used: string[];
  winner: string;
};

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function newFuse(seed: string, order: string[], round = 1, now = Date.now()): Fuse {
  const random = rng(hash(`${seed}:${round}`));
  return {
    round,
    order,
    turn: 0,
    category: CATEGORIES[Math.floor(random() * CATEGORIES.length)],
    letter: LETTERS[Math.floor(random() * LETTERS.length)],
    lives: Object.fromEntries(order.map((id) => [id, LIVES])),
    fuse: FUSE_START,
    startedAt: now,
    used: [],
    winner: "",
  };
}

export function isValid(answer: string, letter: string, used: string[]) {
  const word = normalise(answer);
  return word.length > 1 && word.startsWith(letter) && !used.includes(word);
}

export const alive = (f: Fuse) => f.order.filter((id) => f.lives[id] > 0);

function pass(f: Fuse, from: number) {
  for (let step = 1; step <= f.order.length; step++) {
    const at = (from + step) % f.order.length;
    if (f.lives[f.order[at]] > 0) return at;
  }
  return from;
}

export function survive(f: Fuse, answer: string, now = Date.now()): Fuse {
  const random = rng(hash(`${answer}:${f.round}:${f.turn}`));
  return {
    ...f,
    turn: pass(f, f.turn),
    letter: LETTERS[Math.floor(random() * LETTERS.length)],
    fuse: Math.max(FUSE_FLOOR, f.fuse - 1000),
    startedAt: now,
    used: [...f.used, normalise(answer)],
  };
}

export function burn(f: Fuse, now = Date.now()): Fuse {
  const loser = f.order[f.turn];
  const lives = { ...f.lives, [loser]: Math.max(0, (f.lives[loser] ?? 0) - 1) };
  const next = { ...f, lives };
  const standing = alive(next);
  return {
    ...next,
    turn: pass(next, f.turn),
    fuse: FUSE_START,
    startedAt: now,
    winner: standing.length === 1 ? standing[0] : "",
  };
}
