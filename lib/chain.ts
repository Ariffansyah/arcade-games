import { hash, rng } from "./rng.ts";

/** Four pads, four notes. More would be memory torture, fewer would be a coin flip. */
export const PADS = 4;
export const LIVES = 2;
/** How long a round starts at. It only ever gets longer. */
export const FIRST_LEVEL = 2;

export type Chain = {
  round: number;
  /** Player ids in turn order, fixed when the round starts. */
  order: string[];
  turn: number;
  /** How many pads the player on the clock has to repeat. */
  level: number;
  lives: Record<string, number>;
  seed: string;
  winner: string;
};

/**
 * The whole sequence comes from one seed, so `sequence(seed, n)` is always the
 * first n of the same stream — every client lights the same pads without
 * anybody broadcasting them.
 */
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

/** Repeated it: the sequence grows by one and the next player is up. */
export const recite = (c: Chain): Chain => ({
  ...c,
  level: c.level + 1,
  turn: pass(c, c.turn),
});

/** Fumbled it: a life goes, the sequence stays where it is. */
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
