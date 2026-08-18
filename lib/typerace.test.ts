import assert from "node:assert/strict";
import test from "node:test";
import { PASSAGES, mistyped, passage, passageIndex, progress, standings, wpm } from "./typerace.ts";

test("the same round gives everyone the same passage", () => {
  assert.equal(passage("room", 2), passage("room", 2));
  assert.ok(passage("room", 2).length > 200);
  assert.equal(new Set(PASSAGES).size, PASSAGES.length);
});

test("a race never repeats the passage the room just typed", () => {
  for (let i = 0; i < 50; i++) {
    const seed = `room-${i}`;
    const first = passageIndex(seed, 1);
    assert.notEqual(passageIndex(seed, 1, first), first);
    assert.ok(passageIndex(seed, 1, first) < PASSAGES.length);
  }
});

test("progress stops at the first wrong character", () => {
  assert.equal(progress("the qui", "the quick"), 7);
  assert.equal(progress("the qxi", "the quick"), 5);
  assert.equal(progress("", "the quick"), 0);
});

test("a wrong character in the box is a mistype", () => {
  assert.equal(mistyped("the q", "the quick"), false);
  assert.equal(mistyped("the x", "the quick"), true);
});

test("words per minute counts five characters to a word", () => {
  assert.equal(wpm(250, 60_000), 50);
  assert.equal(wpm(100, 0), 0);
});

test("finishers rank by time, the rest by distance", () => {
  const r = (id: string, chars: number, ms: number, done = false) => ({ id, name: id, chars, ms, done });
  const order = standings([r("a", 30, 0), r("b", 72, 9000, true), r("c", 55, 0), r("d", 72, 7000, true)]);
  assert.deepEqual(order.map((x) => x.id), ["d", "b", "c", "a"]);
});
