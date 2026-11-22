import assert from "node:assert/strict";
import test from "node:test";
import { COLS, DRAW, ROWS, drop, newFour } from "./four.ts";

const playOut = (moves: number[]) => moves.reduce(drop, newFour());

test("discs stack and turns alternate", () => {
  const f = playOut([3, 3, 4]);
  assert.deepEqual(f.cols[3], [0, 1]);
  assert.deepEqual(f.cols[4], [0]);
  assert.equal(f.turn, 1);
});

test("four across, up and on both diagonals win", () => {
  assert.equal(playOut([0, 0, 1, 1, 2, 2, 3]).winner, 0);
  assert.equal(playOut([0, 1, 0, 1, 0, 1, 0]).winner, 0);
  const rising = playOut([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
  assert.equal(rising.winner, 0);
  assert.equal(rising.line.length, 4);
  const falling = playOut([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
  assert.equal(falling.winner, 0);
  assert.deepEqual(falling.score, [1, 0]);
});

test("a full column and a finished game ignore drops", () => {
  const tall = playOut([0, 0, 0, 0, 0, 0]);
  assert.equal(drop(tall, 0), tall);
  const won = playOut([0, 0, 1, 1, 2, 2, 3]);
  assert.equal(drop(won, 5), won);
});

test("a full board with no line is a draw", () => {
  // Pairs flipped every two rows, and every other column inverted: no run longer than two.
  const even = [0, 0, 1, 1, 0, 0];
  const cols = Array.from({ length: COLS }, (_, c) => (c % 2 ? even.map((x) => 1 - x) : even));
  cols[COLS - 1] = cols[COLS - 1].slice(0, ROWS - 1);
  const f = drop({ ...newFour(), cols }, COLS - 1);
  assert.equal(f.winner, DRAW);
  assert.deepEqual(f.score, [0, 0]);
});
