import { hash, rng } from "./rng.ts";

export const PADS = 4;
export const LIVES = 2;

export const FIRST_LEVEL = 2;

export type Chain = {
  round: number;

  order: string[];
  turn: number;

  level: number;
  lives: Record<string, number>;
  seed: string;
  winner: string;
};

export function sequence(seed: string, length: number): number[] {
  const random = rng(hash(seed));
  return Array.from({ length }, () => Math.floor(random() * PADS));
}

export const newChain = (seed: string, order: string[], round = 1): Chain => ({
  round,
  order,
  turn: 0,
  level: FIRST_LEVEL,
  lives: Object.fromEntries(order.map((id) => [id, LIVES])),
  seed: `${seed}:${round}`,
  winner: "",
});

export const alive = (c: Chain) => c.order.filter((id) => c.lives[id] > 0);

function pass(c: Chain, from: number) {
  for (let step = 1; step <= c.order.length; step++) {
    const at = (from + step) % c.order.length;
    if (c.lives[c.order[at]] > 0) return at;
  }
  return from;
}

export const recite = (c: Chain): Chain => ({
  ...c,
  level: c.level + 1,
  turn: pass(c, c.turn),
});

export function fumble(c: Chain): Chain {
  const loser = c.order[c.turn];
  const lives = { ...c.lives, [loser]: Math.max(0, (c.lives[loser] ?? 0) - 1) };
  const next = { ...c, lives };
  const standing = alive(next);
  return {
    ...next,
    turn: pass(next, c.turn),
    winner: standing.length === 1 ? standing[0] : "",
  };
}
