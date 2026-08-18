import assert from "node:assert/strict";
import test from "node:test";
import { assignRound, score, tally } from "./imposter.ts";

const ids = ["a", "b", "c", "d"];

test("every client derives the same round from the same seed", () => {
  const first = assignRound("s", "1234", 1, ids);
  assert.deepEqual(assignRound("s", "1234", 1, ids), first);
  assert.ok(ids.includes(first.imposterId));
  assert.ok(first.word.length > 0);
});

test("a different room, round or secret is a different round", () => {
  const base = assignRound("s", "1234", 1, ids);
  const others = [
    assignRound("s", "1234", 2, ids),
    assignRound("s", "9999", 1, ids),
    assignRound("t", "1234", 1, ids),
  ];
  assert.ok(others.some((o) => o.word !== base.word || o.imposterId !== base.imposterId));
});

test("a tie accuses nobody", () => {
  assert.equal(tally({ a: "b", b: "a" }).accused, null);
  assert.equal(tally({ a: "b", b: "c", c: "b" }).accused, "b");
  assert.equal(tally({}).accused, null);
});

test("catching the imposter pays the detectives, missing pays the imposter", () => {
  assert.deepEqual(score({}, ids, "c", "c"), { a: 1, b: 1, d: 1 });
  assert.deepEqual(score({ c: 2 }, ids, "c", null), { c: 4 });
});
