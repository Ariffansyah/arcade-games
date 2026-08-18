import assert from "node:assert/strict";
import test from "node:test";
import { PADS, alive, fumble, newChain, recite, sequence } from "./chain.ts";

test("a longer sequence is the short one plus more", () => {
  const short = sequence("room:1", 3);
  const long = sequence("room:1", 6);
  assert.deepEqual(long.slice(0, 3), short);
  assert.ok(long.every((pad) => pad >= 0 && pad < PADS));
  assert.notDeepEqual(sequence("room:2", 3), short);
});

test("reciting it grows the sequence and passes the turn", () => {
  const start = newChain("room", ["a", "b"]);
  const next = recite(start);
  assert.equal(next.level, start.level + 1);
  assert.equal(next.order[next.turn], "b");
});

test("a fumble costs a life, keeps the level, and skips the dead", () => {
  const start = { ...newChain("room", ["a", "b", "c"]), lives: { a: 1, b: 0, c: 1 } };
  const after = fumble(start);
  assert.equal(after.lives.a, 0);
  assert.equal(after.level, start.level);
  assert.equal(after.order[after.turn], "c");
  assert.deepEqual(alive(after), ["c"]);
  assert.equal(after.winner, "c");
});
