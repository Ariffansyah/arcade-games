import assert from "node:assert/strict";
import test from "node:test";
import { FOUL, armDelay, rank, winner } from "./reaction.ts";

const shot = (id: string, ms: number) => ({ id, name: id, ms });

test("fastest first, fouls at the back", () => {
  const order = rank([shot("a", 320), shot("b", FOUL), shot("c", 180)]);
  assert.deepEqual(order.map((s) => s.id), ["c", "a", "b"]);
});

test("a round everyone jumped has no winner", () => {
  assert.equal(winner([shot("a", FOUL), shot("b", FOUL)]), null);
  assert.equal(winner([]), null);
  assert.equal(winner([shot("a", FOUL), shot("b", 900)])?.id, "b");
});

test("the wait is always between 1.5 and 6 seconds", () => {
  assert.equal(armDelay(() => 0), 1500);
  assert.ok(armDelay(() => 0.999) <= 6000);
});
