import assert from "node:assert/strict";
import test from "node:test";
import { cleanName, sortPlayers, withGuests, type Player } from "./players.ts";

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

test("a nickname is one trimmed line, capped at 16 characters", () => {
  assert.equal(cleanName("  Ari  the   Great  "), "Ari the Great");
  assert.equal(cleanName("Bo\n\tb"), "Bo b");
  assert.equal(cleanName("x".repeat(40)).length, 16);
  assert.equal(cleanName("   "), "");
});

test("a nickname cannot smuggle invisible or control characters in", () => {
  assert.equal(cleanName("Ari\u200bffan"), "Ariffan");
  assert.equal(cleanName("bad\u0007name\n"), "badname");
  assert.equal(cleanName("  spaced   out  "), "spaced out");
});

test("guests sit at the table after the device they share, marked with its player", () => {
  const seated = withGuests([{ ...p("b", 2), guests: [p("g1", 3), p("g2", 4)] }, p("a", 1)]);
  assert.deepEqual(
    seated.map((x) => [x.id, x.host]),
    [
      ["a", undefined],
      ["b", undefined],
      ["g1", "b"],
      ["g2", "b"],
    ]
  );
  assert.ok(seated.every((x) => !("guests" in x)));
  assert.equal(withGuests([{ ...p("a", 1), guests: "x" as never }]).length, 1);
});

test("a guest added before another device joined still sits after its own device", () => {
  const seated = withGuests([{ ...p("b", 5), guests: [p("g", 3)] }, p("a", 1), p("c", 4)]);
  assert.deepEqual(
    seated.map((x) => x.id),
    ["a", "c", "b", "g"]
  );
});
