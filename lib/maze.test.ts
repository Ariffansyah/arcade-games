import assert from "node:assert/strict";
import test from "node:test";
import { E, N, S, W, TRAIL, advance, generateMaze, newRun, solve, step } from "./maze.ts";

test("same seed, same maze", () => {
  assert.deepEqual(generateMaze("1234"), generateMaze("1234"));
  assert.notDeepEqual(generateMaze("1234").walls, generateMaze("9999").walls);
});

test("every cell is reachable from the start", () => {
  const maze = generateMaze("4242");
  const seen = new Set([maze.start]);
  const queue = [maze.start];
  while (queue.length) {
    const cell = queue.pop()!;
    for (const dir of [N, E, S, W]) {
      const next = step(maze, cell, dir);
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.equal(seen.size, maze.w * maze.h);
});

test("walls block movement in both directions", () => {
  const maze = generateMaze("0001");
  for (let cell = 0; cell < maze.w * maze.h; cell++) {
    for (const [dir, back] of [[N, S], [E, W], [S, N], [W, E]] as const) {
      const next = step(maze, cell, dir);
      if (next !== null) assert.equal(step(maze, next, back), cell);
    }
  }
});

test("no trap ever sits on the only route to the exit", () => {
  for (const seed of ["1234", "0000", "9871", "4242", "5150"]) {
    const maze = generateMaze(seed);
    const path = solve(maze);
    assert.equal(path[0], maze.start);
    assert.equal(path.at(-1), maze.exit);
    assert.equal(maze.traps.length, 10);
    for (const trap of maze.traps) assert.ok(!path.includes(trap), `seed ${seed} blocked at ${trap}`);
  }
});

test("a run bumps, springs traps and finishes", () => {
  const maze = generateMaze("1234", 5, 5, 0);
  maze.traps = [];
  const start = newRun(5, 100, "1234");

  const blocked = [N, E, S, W].find((d) => step(maze, 0, d) === null)!;
  const bumped = advance(maze, start, blocked, 200);
  assert.equal(bumped.pos, 0);
  assert.equal(bumped.bumps, 1);
  assert.deepEqual(bumped.trail, []);

  const open = [N, E, S, W].find((d) => step(maze, 0, d) !== null)!;
  const moved = advance(maze, start, open, 200);
  assert.equal(moved.pos, step(maze, 0, open));
  assert.deepEqual(moved.trail, [0]);

  maze.traps = [moved.pos];
  const sprung = advance(maze, start, open, 300);
  assert.equal(sprung.pos, maze.start);
  assert.equal(sprung.traps, 1);
  assert.equal(sprung.lastTrap, moved.pos);
});

test("the trail is capped and the exit stops the clock", () => {
  const maze = generateMaze("4242", 9, 9, 0);
  let run = newRun(9, 0, "4242");
  const path = solve(maze);
  for (let i = 1; i < path.length; i++) {
    const dir = [N, E, S, W].find((d) => step(maze, run.pos, d) === path[i])!;
    run = advance(maze, run, dir, i);
  }
  assert.equal(run.pos, maze.exit);
  assert.equal(run.finishedAt, path.length - 1);
  assert.ok(run.trail.length <= TRAIL);
  assert.equal(advance(maze, run, N, 999), run);
});
