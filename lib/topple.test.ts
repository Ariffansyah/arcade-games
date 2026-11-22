import assert from "node:assert/strict";
import test from "node:test";
import { LEVELS, canPull, height, newTower, pull, risk, row, steadiness } from "./topple.ts";

const at = (level: number, slot: number) => level * 3 + slot;

test("the top level and the one under an unfinished top are off limits", () => {
  const t = newTower(["a", "b"]);
  assert.equal(height(t), LEVELS);
  assert.ok(!canPull(t, at(LEVELS - 1, 1)));
  assert.ok(canPull(t, at(LEVELS - 2, 1)));
  const started = pull(t, at(3, 1), 0);
  assert.equal(height(started), LEVELS + 1);
  assert.ok(!canPull(started, at(LEVELS - 1, 0)));
  assert.ok(canPull(started, at(LEVELS - 2, 0)));
});

test("a clean pull moves the block to the top and passes the turn", () => {
  const t = pull(newTower(["a", "b"]), at(2, 1), 0);
  assert.deepEqual(t.blocks[at(2, 1)], { level: LEVELS, slot: 0 });
  assert.deepEqual(row(t, 2), [true, false, true]);
  assert.equal(t.order[t.turn], "b");
  assert.equal(t.loser, "");
  const again = pull(t, at(4, 1), 0);
  assert.deepEqual(again.blocks[at(4, 1)], { level: LEVELS, slot: 1 });
});

test("the last block of a level cannot come out", () => {
  let t = pull(newTower(["a", "b"]), at(2, 0), 0);
  t = pull(t, at(2, 2), 0);
  assert.ok(!canPull(t, at(2, 1)));
  assert.equal(pull(t, at(2, 1), 0), t);
});

test("leaving one edge block is riskier than leaving the middle", () => {
  const t = pull(newTower(["a", "b"]), at(2, 0), 0);
  const edgeAlone = risk(t, at(2, 1));
  const middleAlone = risk(t, at(2, 2));
  assert.ok(edgeAlone > middleAlone);
  assert.ok(steadiness(edgeAlone) < steadiness(middleAlone));
  assert.ok(risk(newTower(["a"]), at(2, 1)) < risk(newTower(["a"]), at(2, 0)));
});

test("missing the window badly brings it down on whoever pulled", () => {
  const t = pull(newTower(["a", "b"]), at(1, 1), 3);
  assert.equal(t.loser, "a");
  assert.equal(t.falls.a, 1);
  assert.equal(pull(t, at(3, 1), 0), t);
});
