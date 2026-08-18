import assert from "node:assert/strict";
import test from "node:test";
import { bandScore, giverFor, giverScore, pickSpectrum, pickTarget, seededTarget } from "./dial.ts";

test("the rings pay out by distance", () => {
  assert.equal(bandScore(50, 50), 4);
  assert.equal(bandScore(46, 50), 4);
  assert.equal(bandScore(41, 50), 3);
  assert.equal(bandScore(33, 50), 2);
  assert.equal(bandScore(22, 50), 1);
  assert.equal(bandScore(0, 50), 0);
});

test("the same round shows the same spectrum everywhere", () => {
  assert.deepEqual(pickSpectrum("1234", 3), pickSpectrum("1234", 3));
  assert.notDeepEqual(pickSpectrum("1234", 3), pickSpectrum("9999", 3));
});

test("the target stays off the edges", () => {
  assert.equal(pickTarget(() => 0), 5);
  assert.equal(pickTarget(() => 1), 95);
  const seeded = seededTarget("room:1");
  assert.ok(seeded >= 5 && seeded <= 95);
});

test("the giver's chair moves one seat a round and wraps", () => {
  const order = ["a", "b", "c"];
  assert.equal(giverFor(order, 1), "a");
  assert.equal(giverFor(order, 3), "c");
  assert.equal(giverFor(order, 4), "a");
  assert.equal(giverFor([], 1), "");
});

test("the giver is paid for the best read on their clue", () => {
  assert.equal(giverScore({ a: 50, b: 20 }, 52), 4);
  assert.equal(giverScore({}, 50), 0);
});
