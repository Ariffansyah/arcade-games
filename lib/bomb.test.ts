import assert from "node:assert/strict";
import test from "node:test";
import {
  BUTTON_LABELS,
  COLUMNS,
  DIFFICULTY,
  accepts,
  buttonRule,
  fuseFor,
  holderFor,
  isDone,
  WORDS,
  keypadOrder,
  makeBomb,
  memoryTarget,
  solveWires,
  spellable,
  target,
  type Bomb,
  type ButtonModule,
  type Difficulty,
  type Glyph,
  type MemoryModule,
  type Wire,
  type WiresModule,
} from "./bomb.ts";

const wires = (...spec: [Wire["color"], number, boolean?][]): WiresModule => ({
  kind: "wires",
  wires: spec.map(([color, num, striped]) => ({ color, num, striped: striped ?? false })),
  stages: 1,
});

const rig = (serial: string, m: WiresModule): [Bomb, WiresModule] => [
  { serial, difficulty: "normal", modules: [m] },
  m,
];

const panel = (serial: string, ...spec: [Wire["color"], number, boolean?][]) =>
  rig(serial, wires(...spec));

test("a bomb is the same on every screen", () => {
  const one = makeBomb("room", 3, "hard");
  assert.deepEqual(makeBomb("room", 3, "hard"), one);
  assert.match(one.serial, /^[A-Z]{3}\d$/);
});

test("difficulty decides what is bolted on", () => {
  for (const d of Object.keys(DIFFICULTY) as Difficulty[]) {
    const spec = DIFFICULTY[d];
    const b = makeBomb("room", 1, d);
    assert.equal(b.modules.length, spec.modules);

    assert.deepEqual(
      b.modules.map((m) => m.kind),
      spec.kinds
    );
  }
  assert.ok(DIFFICULTY.hard.strikes < DIFFICULTY.easy.strikes);
});

test("bombs grow and fuses shrink, up to a floor", () => {
  assert.ok(makeBomb("room", 10, "easy").modules.length > DIFFICULTY.easy.modules);
  assert.ok(makeBomb("room", 30, "easy").modules.length <= 6);
  assert.ok(fuseFor("normal", 4) < fuseFor("normal", 1));
  assert.equal(fuseFor("hard", 99), 45_000);
});

test("rule 1 beats everything else", () => {
  assert.deepEqual(solveWires(...panel("ABC2", ["blue", 2], ["red", 3], ["white", 1]), []), {
    index: 1,
    rule: 0,
  });
});

test("two striped wires cut the last striped one", () => {
  assert.deepEqual(
    solveWires(...panel("ABC2", ["red", 2, true], ["red", 3], ["green", 1, true], ["blue", 4]), []),
    { index: 2, rule: 1 }
  );
});

test("a white last wire needs an odd serial digit", () => {
  const spec: [Wire["color"], number][] = [["red", 2], ["red", 3], ["white", 1]];
  assert.deepEqual(solveWires(...panel("BCD3", ...spec), []), { index: 0, rule: 2 });

  assert.deepEqual(solveWires(...panel("BCD2", ...spec), []), { index: 1, rule: 4 });
});

test("no yellow plus a vowel cuts the second wire", () => {
  assert.deepEqual(solveWires(...panel("BEC2", ["red", 2], ["red", 3], ["green", 4]), []), {
    index: 1,
    rule: 3,
  });
});

test("an even total cuts the highest, one blue cuts the wire after it", () => {
  assert.deepEqual(solveWires(...panel("BCD2", ["yellow", 2], ["green", 8], ["blue", 4]), []), {
    index: 1,
    rule: 4,
  });
  assert.deepEqual(solveWires(...panel("BCD2", ["yellow", 2], ["green", 8], ["blue", 5]), []), {
    index: 0,
    rule: 5,
  });
  assert.deepEqual(solveWires(...panel("BCD2", ["yellow", 2], ["green", 8], ["green", 5]), []), {
    index: 2,
    rule: 6,
  });
});

test("cut wires are invisible to the rules", () => {
  const [b, m] = panel("BCD2", ["red", 2], ["red", 3], ["green", 4]);
  assert.notEqual(solveWires(b, m, []).rule, 0);
  assert.deepEqual(solveWires(b, m, [0]), { index: 1, rule: 0 });
});

test("a keypad belongs to exactly one column, and that column is the order", () => {
  for (let round = 1; round < 100; round++) {
    const m = makeBomb("room", round, "easy").modules.find((x) => x.kind === "keypad");
    assert.ok(m && m.kind === "keypad");
    const owners = COLUMNS.filter((c) => m.keys.every((k) => c.includes(k)));
    assert.equal(owners.length, 1);
    const ordered = keypadOrder(m.keys);
    assert.deepEqual([...ordered].sort(), [...m.keys].sort());
    const at = ordered.map((g: Glyph) => owners[0].indexOf(g));
    assert.deepEqual(at, [...at].sort((a, b) => a - b));
  }
});

test("the button reads colour, label, serial and strikes", () => {
  const b = (m: ButtonModule, serial = "BCD2"): Bomb => ({
    serial,
    difficulty: "normal",
    modules: [m],
  });
  const mod = (color: ButtonModule["color"], label: ButtonModule["label"]): ButtonModule => ({
    kind: "button",
    color,
    label,
    strip: "blue",
  });

  const abort = mod("blue", "Abort");
  assert.deepEqual(buttonRule(b(abort), abort, 0), { rule: 0, hold: true, digit: 4 });

  const det = mod("white", "Detonate");
  assert.equal(buttonRule(b(det, "BEC2"), det, 0).hold, false);
  assert.equal(buttonRule(b(det, "BCD2"), det, 0).hold, true);

  const press = mod("white", "Press");
  assert.equal(buttonRule(b(press, "BCD3"), press, 0).hold, false);

  const red = mod("red", "Hold");
  assert.equal(buttonRule(b(red), red, 0).hold, false);
  assert.equal(buttonRule(b(red), red, 1).hold, true);
});

test("a held button only accepts a release on the right digit", () => {
  const m: ButtonModule = { kind: "button", color: "yellow", label: "Press", strip: "white" };
  const b: Bomb = { serial: "BCD2", difficulty: "normal", modules: [m] };
  assert.equal(accepts(b, m, [], 15, 0), true);
  assert.equal(accepts(b, m, [], 23, 0), false);
  assert.equal(accepts(b, m, [], -1, 0), false);
});

test("the memory panel always names a real position", () => {
  for (let round = 1; round < 100; round++) {
    const m = makeBomb("room", round, "hard").modules.find((x) => x.kind === "memory");
    assert.ok(m && m.kind === "memory");
    const pressed: number[] = [];
    for (let stage = 0; stage < 5; stage++) {
      const want = memoryTarget(m as MemoryModule, pressed);
      assert.ok(want >= 0 && want < 4, `stage ${stage + 1} of round ${round}`);
      pressed.push(want);
    }
    assert.equal(memoryTarget(m as MemoryModule, pressed), -1);
  }
});

test("every bomb can be talked down, module by module", () => {
  for (const d of Object.keys(DIFFICULTY) as Difficulty[]) {
    for (let round = 1; round < 40; round++) {
      const b = makeBomb("room", round, d);
      for (const m of b.modules) {
        const done: number[] = [];
        while (!isDone(m, done)) {
          const input =
            m.kind === "wires"
              ? solveWires(b, m, done).index
              : m.kind === "keypad"
                ? m.keys.indexOf(keypadOrder(m.keys)[done.length])
                : m.kind === "memory"
                  ? memoryTarget(m, done)
                  : m.kind === "password"
                    ? WORDS.indexOf(m.answer)
                    : buttonRule(b, m, 0).hold
                      ? buttonRule(b, m, 0).digit
                      : -1;
          assert.equal(accepts(b, m, done, input, 0), true, `${d} round ${round} ${m.kind}`);
          done.push(input);
        }
        assert.equal(done.length, target(m));
      }
    }
  }
});

test("a wrong input is refused, not quietly swallowed", () => {
  const b = makeBomb("room", 5, "hard");
  const m = b.modules[0];
  const right = solveWires(b, m as WiresModule, []).index;
  const wrong = (right + 1) % (m as WiresModule).wires.length;
  assert.equal(accepts(b, m, [], wrong, 0), false);
});

test("a password panel spells exactly one word on the list", () => {
  for (let round = 1; round < 100; round++) {
    const m = makeBomb("room", round, "hard").modules.find((x) => x.kind === "password");
    assert.ok(m && m.kind === "password");
    assert.equal(m.columns.length, 5);
    for (const c of m.columns) assert.equal(new Set(c).size, 6);
    const spellables = WORDS.filter((w) => spellable(w, m.columns));
    assert.deepEqual(spellables, [m.answer], `round ${round}`);
  }
});

test("the bomb changes hands every round", () => {
  const order = ["a", "b", "c"];
  assert.equal(holderFor(order, 1), "a");
  assert.equal(holderFor(order, 2), "b");
  assert.equal(holderFor(order, 3), "a");
  assert.equal(holderFor([], 1), "");
});

test("every button label is one the manual mentions", () => {
  assert.deepEqual([...BUTTON_LABELS].sort(), ["Abort", "Detonate", "Hold", "Press"]);
});
