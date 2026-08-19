import assert from "node:assert/strict";
import test from "node:test";
import { FUSE_START, alive, burn, isValid, newFuse, survive } from "./fuse.ts";

const start = () => newFuse("room", ["a", "b", "c"], 1, 0);

test("an answer needs the right letter, some length, and to be new", () => {
  assert.equal(isValid("Bear", "b", []), true);
  assert.equal(isValid("bear!", "b", ["bear"]), false);
  assert.equal(isValid("cat", "b", []), false);
  assert.equal(isValid("b", "b", []), false);
});

test("a good answer passes the turn and tightens the fuse", () => {
  const first = start();
  const next = survive(first, "Bear", 10);
  assert.equal(next.turn, 1);
  assert.equal(next.fuse, first.fuse - 1000);
  assert.deepEqual(next.used, ["bear"]);
});

test("the fuse never drops below the floor", () => {
  let f = start();
  for (let i = 0; i < 30; i++) f = survive(f, `word${i}`, 0);
  assert.equal(f.fuse, 5000);
});

test("burning out costs a life and skips the dead", () => {
  let f = start();
  f = { ...f, lives: { a: 1, b: 0, c: 1 } };
  const after = burn(f, 0);
  assert.equal(after.lives.a, 0);
  assert.equal(after.order[after.turn], "c");
  assert.equal(after.fuse, FUSE_START);
  assert.deepEqual(alive(after), ["c"]);
  assert.equal(after.winner, "c");
});
