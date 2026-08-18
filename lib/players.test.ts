import assert from "node:assert/strict";
import test from "node:test";
import { sortPlayers, type Player } from "./players.ts";

const p = (id: string, joinedAt: number): Player => ({ id, name: id, joinedAt });

test("earliest join is P1", () => {
  assert.deepEqual(
    sortPlayers([p("b", 2), p("a", 1)]).map((x) => x.id),
    ["a", "b"]
  );
});

test("identical timestamps still order the same for both clients", () => {
  const a = p("aaa", 5);
  const b = p("bbb", 5);
  assert.deepEqual(sortPlayers([a, b]).map((x) => x.id), sortPlayers([b, a]).map((x) => x.id));
});
