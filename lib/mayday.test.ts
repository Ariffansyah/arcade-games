import assert from "node:assert/strict";
import test from "node:test";
import {
  DIFFICULTY,
  LEVER,
  SWITCHES,
  accepts,
  actText,
  altitudeAt,
  apply,
  condText,
  expected,
  holds,
  inputOf,
  makePlan,
  worldAt,
  type Difficulty,
} from "./mayday.ts";

test("an emergency is the same on every screen", () => {
  const one = makePlan("room", 2, "normal");
  assert.deepEqual(makePlan("room", 2, "normal"), one);
  assert.equal(one.steps.length, DIFFICULTY.normal.steps);
  assert.equal(one.start.switches.length, SWITCHES.length);
});

test("difficulty decides the length and the drop", () => {
  assert.ok(DIFFICULTY.hard.steps > DIFFICULTY.easy.steps);
  assert.ok(DIFFICULTY.hard.sink > DIFFICULTY.easy.sink);

  for (const d of Object.keys(DIFFICULTY) as Difficulty[]) {
    const spec = DIFFICULTY[d];
    assert.ok(spec.altitude / spec.sink > spec.steps * 2.5, d);
  }
});

test("both branches of a step do different things", () => {
  for (const d of Object.keys(DIFFICULTY) as Difficulty[])
    for (let round = 1; round < 60; round++)
      for (const s of makePlan("room", round, d).steps)
        assert.notEqual(inputOf(s.then), inputOf(s.else));
});

test("flipping a switch changes what the next step reads", () => {
  const w = { switches: [false, false], lever: 0 };
  const flipped = apply({ kind: "flip", i: 0 }, w);
  assert.deepEqual(flipped.switches, [true, false]);
  const readings = { fuel: 50, speed: 200, heading: 10, lamps: [false] };
  assert.equal(holds({ kind: "switch", i: 0 }, readings, w), false);
  assert.equal(holds({ kind: "switch", i: 0 }, readings, flipped), true);
});

test("the lever goes where it is put, and stays there", () => {
  const w = apply({ kind: "lever", p: 2 }, { switches: [], lever: 0 });
  assert.equal(w.lever, 2);
  assert.equal(apply({ kind: "lever", p: 2 }, w).lever, 2);
});

test("conditions read the instruments, not the checklist", () => {
  const r = { fuel: 30, speed: 200, heading: 200, lamps: [true, false, false] };
  const w = { switches: [false], lever: 0 };
  assert.equal(holds({ kind: "fuel", n: 40 }, r, w), true);
  assert.equal(holds({ kind: "fuel", n: 20 }, r, w), false);
  assert.equal(holds({ kind: "speed", n: 180 }, r, w), true);
  assert.equal(holds({ kind: "lamp", i: 0 }, r, w), true);
  assert.equal(holds({ kind: "lamp", i: 1 }, r, w), false);
  assert.equal(holds({ kind: "heading" }, r, w), true);
});

test("every run can be flown through, step by step", () => {
  for (const d of Object.keys(DIFFICULTY) as Difficulty[]) {
    for (let round = 1; round < 60; round++) {
      const plan = makePlan("room", round, d);
      let world = plan.start;
      plan.steps.forEach((s, i) => {
        assert.deepEqual(worldAt(plan, i), world, `${d} round ${round} step ${i}`);
        const want = expected(s, plan.readings, world);
        assert.equal(accepts(s, plan.readings, world, inputOf(want)), true);
        assert.equal(accepts(s, plan.readings, world, inputOf(want) + 1), false);
        world = apply(want, world);
      });
    }
  }
});

test("altitude runs out on the clock, and faster with mistakes", () => {
  const clean = altitudeAt("normal", 10_000, 0);
  assert.equal(clean, DIFFICULTY.normal.altitude - 10 * DIFFICULTY.normal.sink);
  assert.equal(altitudeAt("normal", 10_000, 2), clean - 2 * DIFFICULTY.normal.hit);
  assert.equal(altitudeAt("normal", 10_000, 99), 0);
});

test("the book says something for every step it can print", () => {
  const plan = makePlan("room", 7, "hard");
  for (const s of plan.steps) {
    assert.ok(condText(s.when).length > 3);
    assert.ok(actText(s.then).length > 3);
    assert.ok(
      SWITCHES.some((n) => actText(s.then).includes(n)) ||
        LEVER.some((n) => actText(s.then).includes(n))
    );
  }
});
