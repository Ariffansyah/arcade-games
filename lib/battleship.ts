import { hash, rng } from "./rng.ts";

export const SHIPS = [4, 3, 3, 2];

/** Shot clock. Run out and the turn passes with nothing fired. */
export const TURN_MS = 30_000;

export type Fleet = {
  /** One entry per ship: the cell indices it occupies. */
  ships: number[][];
  /** Cells the opponent has fired at on this board. */
  shots: number[];
};

export type Battleship = {
  size: number;
  fleets: [Fleet, Fleet];
  ready: [boolean, boolean];
  turn: 1 | 2;
  /** Shots taken so far, both sides. Purely for the "Turn 12" readout. */
  turnNo: number;
  /** Epoch ms the current turn expires at; 0 until both fleets are locked in.
   * ponytail: absolute timestamp, so a few seconds of clock skew between the
   * two machines shifts the clock. Swap for a server-stamped now() if it bites. */
  deadline: number;
  winner: 0 | 1 | 2;
};

export function randomFleet(seed: string, size = 8): Fleet {
  const rand = rng(hash(seed));
  const ships: number[][] = [];
  const taken = new Set<number>();

  for (const len of SHIPS) {
    let placed = false;
    for (let tries = 0; tries < 500 && !placed; tries++) {
      const across = rand() < 0.5;
      const x = (rand() * (across ? size - len + 1 : size)) | 0;
      const y = (rand() * (across ? size : size - len + 1)) | 0;
      const cells = Array.from({ length: len }, (_, k) =>
        across ? y * size + x + k : (y + k) * size + x
      );
      if (cells.some((c) => taken.has(c))) continue;
      cells.forEach((c) => taken.add(c));
      ships.push(cells);
      placed = true;
    }
    if (!placed) throw new Error(`could not place a ship of length ${len}`);
  }
  return { ships, shots: [] };
}

export function newGame(seed: string, size = 8): Battleship {
  return {
    size,
    fleets: [randomFleet(`${seed}-p1`, size), randomFleet(`${seed}-p2`, size)],
    ready: [false, false],
    turn: 1,
    turnNo: 1,
    deadline: 0,
    winner: 0,
  };
}

/** Locks in one player's fleet. The shot clock starts when the second one lands. */
export function setReady(g: Battleship, by: 1 | 2, now = Date.now()): Battleship {
  const ready: [boolean, boolean] = by === 1 ? [true, g.ready[1]] : [g.ready[0], true];
  return { ...g, ready, deadline: ready[0] && ready[1] ? now + TURN_MS : 0 };
}

/**
 * Passes the turn when the shot clock runs out. Only the *waiting* player calls
 * this — the player on the clock may be asleep or offline, which is the whole
 * reason the clock exists.
 */
export function timeout(g: Battleship, by: 1 | 2, now = Date.now()): Battleship {
  if (g.winner || !g.ready[0] || !g.ready[1]) return g;
  if (g.turn === by || now < g.deadline) return g;
  return { ...g, turn: by, turnNo: g.turnNo + 1, deadline: now + TURN_MS };
}

/**
 * Where to draw a ship's hull. The hull is authored horizontally in its own
 * local space, so vertical ships are the same path rotated a quarter turn.
 */
export function hullBox(cells: number[], size: number, cell: number, margin: number) {
  const first = cells[0];
  const across = cells.length < 2 || cells[1] === first + 1;
  const x = (first % size) * cell;
  const y = ((first / size) | 0) * cell;
  return {
    across,
    w: cells.length * cell - margin * 2,
    h: cell - margin * 2,
    transform: across
      ? `translate(${x + margin}, ${y + margin})`
      : `translate(${x + cell - margin}, ${y + margin}) rotate(90)`,
  };
}

export const shipAt = (fleet: Fleet, cell: number) => fleet.ships.find((s) => s.includes(cell));

export const isSunk = (fleet: Fleet, ship: number[]) => ship.every((c) => fleet.shots.includes(c));

export const allSunk = (fleet: Fleet) => fleet.ships.every((s) => isSunk(fleet, s));

/** Pure turn transition. Illegal shots return the game unchanged. */
export function fire(g: Battleship, cell: number, by: 1 | 2, now = Date.now()): Battleship {
  const target = by === 1 ? 1 : 0; // you shoot at the other player's board
  const enemy = g.fleets[target];
  if (g.winner || g.turn !== by || !g.ready[0] || !g.ready[1]) return g;
  if (cell < 0 || cell >= g.size * g.size || enemy.shots.includes(cell)) return g;

  const hit = { ...enemy, shots: [...enemy.shots, cell] };
  const fleets: [Fleet, Fleet] = by === 1 ? [g.fleets[0], hit] : [hit, g.fleets[1]];
  const struck = !!shipAt(enemy, cell);

  return {
    ...g,
    fleets,
    // House rule: a hit buys another shot.
    turn: struck ? by : by === 1 ? 2 : 1,
    turnNo: g.turnNo + 1,
    deadline: now + TURN_MS,
    winner: allSunk(hit) ? by : 0,
  };
}
