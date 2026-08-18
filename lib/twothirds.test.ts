import assert from "node:assert/strict";
import test from "node:test";
import { target, winners } from "./twothirds.ts";

test("the mark is two thirds of the average", () => {
  assert.equal(target([30, 60]), 30);
  assert.equal(target([]), 0);
});

test("closest to the mark wins", () => {
  const { mark, ids } = winners({ a: 30, b: 60, c: 90 });
  assert.equal(mark, 40);
  assert.deepEqual(ids, ["a"]);
});

test("an exact tie splits the round", () => {
  // Mean 20, mark 13.33: a and b are both 13.33 off, c is 46.67 off.
  const { ids } = winners({ a: 0, b: 0, c: 60 });
  assert.deepEqual(ids.sort(), ["a", "b"]);
});

test("everyone picking the same number ties everyone", () => {
  assert.deepEqual(winners({ a: 50, b: 50 }).ids.sort(), ["a", "b"]);
});
