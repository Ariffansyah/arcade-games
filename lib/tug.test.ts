import assert from "node:assert/strict";
import test from "node:test";
import { ROPE_TO_WIN, rope, sideFor, taken } from "./tug.ts";

const pull = (id: string, side: 0 | 1, pulls: number) => ({ id, name: id, side, pulls });

test("join order alternates the two sides", () => {
  const order = ["a", "b", "c"];
  assert.equal(sideFor(order, "a"), 0);
  assert.equal(sideFor(order, "b"), 1);
  assert.equal(sideFor(order, "c"), 0);
});

test("the rope is the difference between the two sides", () => {
  assert.equal(rope([pull("a", 0, 10), pull("b", 1, 4)]), -6);
  assert.equal(rope([]), 0);
});

test("a side takes it only once the rope is all the way over", () => {
  assert.equal(taken([pull("a", 1, ROPE_TO_WIN - 1)]), null);
  assert.equal(taken([pull("a", 1, ROPE_TO_WIN)]), 1);
  assert.equal(taken([pull("a", 0, ROPE_TO_WIN)]), 0);
});
