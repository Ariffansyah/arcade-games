import { hash, rng } from "./rng.ts";

export const N = 1, E = 2, S = 4, W = 8;

export type Maze = {
  w: number;
  h: number;
  /** Per cell: bitmask of walls still standing (N|E|S|W). */
  walls: number[];
  traps: number[];
  start: number;
  exit: number;
};

const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

/**
 * Recursive-backtracker maze. Pure and seeded: both players derive the same
 * maze from the room code, so nothing about the layout needs to be sent.
 */
export function generateMaze(seed: string, w = 13, h = 13, trapCount = 10): Maze {
  const rand = rng(hash(seed));
  const walls = new Array(w * h).fill(N | E | S | W);
  const seen = new Array(w * h).fill(false);
  const stack = [0];
  seen[0] = true;

  while (stack.length) {
    const cell = stack[stack.length - 1];
    const x = cell % w;
    const y = (cell / w) | 0;
    const options: [number, number][] = [];
    if (y > 0 && !seen[cell - w]) options.push([N, cell - w]);
    if (x < w - 1 && !seen[cell + 1]) options.push([E, cell + 1]);
    if (y < h - 1 && !seen[cell + w]) options.push([S, cell + w]);
    if (x > 0 && !seen[cell - 1]) options.push([W, cell - 1]);

    if (!options.length) {
      stack.pop();
      continue;
    }
    const [dir, next] = options[(rand() * options.length) | 0];
    walls[cell] &= ~dir;
    walls[next] &= ~OPPOSITE[dir];
    seen[next] = true;
    stack.push(next);
  }

  const exit = w * h - 1;
  const maze: Maze = { w, h, walls, traps: [], start: 0, exit };

  // A perfect maze has exactly one route to the exit, so a trap anywhere on it
  // makes the maze unwinnable. Traps go in the dead-end branches only: stepping
  // into one still costs a reset, it just can never seal the way out.
  const onPath = new Set(solve(maze));
  const candidates: number[] = [];
  for (let c = 0; c < w * h; c++) if (!onPath.has(c)) candidates.push(c);

  for (let i = 0; i < Math.min(trapCount, candidates.length); i++) {
    const j = i + ((rand() * (candidates.length - i)) | 0);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    maze.traps.push(candidates[i]);
  }

  return maze;
}

/** The route from start to exit, both ends included. */
export function solve(maze: Maze): number[] {
  const prev = new Map<number, number>([[maze.start, -1]]);
  const queue = [maze.start];
  while (queue.length) {
    const cell = queue.shift()!;
    if (cell === maze.exit) break;
    for (const dir of [N, E, S, W]) {
      const next = step(maze, cell, dir);
      if (next !== null && !prev.has(next)) {
        prev.set(next, cell);
        queue.push(next);
      }
    }
  }
  const path: number[] = [];
  for (let c = maze.exit; c !== undefined && c !== -1; c = prev.get(c)!) path.push(c);
  return path.reverse();
}

/** How many breadcrumbs of the runner's recent path to keep. */
export const TRAIL = 12;

export type Run = {
  /** Drives the whole layout. Fresh every run, so no two escapes are alike. */
  seed: string;
  size: number;
  pos: number;
  /** Recent cells, oldest first — the guide's view of where the runner has been. */
  trail: number[];
  traps: number;
  bumps: number;
  /** Cell of the last trap hit, for the blast effect. -1 before the first one. */
  lastTrap: number;
  startedAt: number;
  /** 0 while still running. */
  finishedAt: number;
};

export const newRun = (
  size: number,
  now = Date.now(),
  seed = Math.random().toString(36).slice(2)
): Run => ({
  seed,
  size,
  pos: 0,
  trail: [],
  traps: 0,
  bumps: 0,
  lastTrap: -1,
  startedAt: now,
  finishedAt: 0,
});

/** One keypress. Walls bump, traps send you back to the start, the exit ends it. */
export function advance(maze: Maze, run: Run, dir: number, now = Date.now()): Run {
  if (run.finishedAt) return run;
  const next = step(maze, run.pos, dir);
  if (next === null) return { ...run, bumps: run.bumps + 1 };
  if (maze.traps.includes(next))
    return { ...run, pos: maze.start, trail: [], traps: run.traps + 1, lastTrap: next };
  return {
    ...run,
    pos: next,
    trail: [...run.trail, run.pos].slice(-TRAIL),
    finishedAt: next === maze.exit ? now : 0,
  };
}

/** Returns the cell reached by moving, or null when a wall blocks the move. */
export function step(maze: Maze, cell: number, dir: number): number | null {
  if (maze.walls[cell] & dir) return null;
  if (dir === N) return cell - maze.w;
  if (dir === S) return cell + maze.w;
  if (dir === E) return cell + 1;
  return cell - 1;
}
