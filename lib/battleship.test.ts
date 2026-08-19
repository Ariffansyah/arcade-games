import assert from "node:assert/strict";
import test from "node:test";
import {
  SHIPS,
  TURN_MS,
  allSunk,
  fire,
  hullBox,
  newGame,
  randomFleet,
  setReady,
  timeout,
  type Battleship,
} from "./battleship.ts";

test("fleets are legal: right ships, in bounds, in a line, never overlapping", () => {
  for (const seed of ["1234", "0000", "9871", "4242", "5150"]) {
    const size = 8;
    const { ships } = randomFleet(seed, size);
    assert.deepEqual(ships.map((s) => s.length), SHIPS);

    const taken = new Set<number>();
    for (const ship of ships) {
      for (const c of ship) {
        assert.ok(c >= 0 && c < size * size, `cell ${c} out of bounds`);
        assert.ok(!taken.has(c), `overlap at ${c}`);
        taken.add(c);
      }
      const rows = new Set(ship.map((c) => (c / size) | 0));
      const cols = new Set(ship.map((c) => c % size));

      assert.ok(rows.size === 1 || cols.size === 1);
      const stride = rows.size === 1 ? 1 : size;
      ship.forEach((c, i) => assert.equal(c, ship[0] + i * stride));
    }
  }
});

const ready = (g: Battleship): Battleship => setReady(setReady(g, 1, 0), 2, 0);

test("miss passes the turn, hit keeps it", () => {
  const g = ready(newGame("1234"));
  const target = g.fleets[1].ships[0][0];
  assert.equal(fire(g, target, 1).turn, 1);
  const empty = [...Array(64).keys()].find((c) => !g.fleets[1].ships.flat().includes(c))!;
  assert.equal(fire(g, empty, 2), g);
  assert.equal(fire(g, empty, 1).turn, 2);
});

test("illegal shots change nothing", () => {
  const g = ready(newGame("1234"));
  assert.equal(fire(g, 0, 2), g);
  assert.equal(fire(g, 99, 1), g);
  const fresh = newGame("1234");
  assert.equal(fire(fresh, 0, 1), fresh);

  const hitCell = g.fleets[1].ships[0][0];
  const after = fire(g, hitCell, 1);
  assert.equal(fire(after, hitCell, 1), after);
});

test("sinking the last ship wins", () => {
  let g = ready(newGame("1234"));
  for (const cell of g.fleets[1].ships.flat()) g = fire(g, cell, 1);
  assert.ok(allSunk(g.fleets[1]));
  assert.equal(g.winner, 1);
});

test("the shot clock only starts once both fleets are locked in", () => {
  const g = newGame("1234");
  assert.equal(setReady(g, 1, 1000).deadline, 0);
  assert.equal(setReady(setReady(g, 1, 1000), 2, 2000).deadline, 2000 + TURN_MS);
});

test("running out of time passes the turn, and only the waiting player may call it", () => {
  const g = ready(newGame("1234"));
  assert.equal(timeout(g, 2, TURN_MS - 1), g);
  assert.equal(timeout(g, 1, TURN_MS + 1), g);
  const passed = timeout(g, 2, TURN_MS + 1);
  assert.equal(passed.turn, 2);
  assert.equal(passed.turnNo, g.turnNo + 1);
  assert.equal(passed.deadline, TURN_MS + 1 + TURN_MS);
});

test("every shot resets the clock and bumps the turn counter", () => {
  const g = ready(newGame("1234"));
  const shot = fire(g, g.fleets[1].ships[0][0], 1, 5000);
  assert.equal(shot.deadline, 5000 + TURN_MS);
  assert.equal(shot.turnNo, g.turnNo + 1);
});

test("hulls land exactly on the cells they occupy, upright or rotated", () => {
  const size = 8;
  const cell = 34;
  const m = 4;

  const project = (transform: string, [a, b]: [number, number]) => {
    const [, tx, ty] = transform.match(/translate\(([-\d.]+), ([-\d.]+)\)/)!.map(Number);
    const turned = /rotate\(90\)/.test(transform);
    return turned ? [tx - b, ty + a] : [tx + a, ty + b];
  };

  for (const cells of [[0, 1, 2, 3], [9, 17, 25], [63], [4, 12]]) {
    const box = hullBox(cells, size, cell, m);
    const corners = [project(box.transform, [0, 0]), project(box.transform, [box.w, box.h])];
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);

    const cols = cells.map((c) => c % size);
    const rows = cells.map((c) => (c / size) | 0);
    assert.deepEqual(
      [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)],
      [
        Math.min(...cols) * cell + m,
        (Math.max(...cols) + 1) * cell - m,
        Math.min(...rows) * cell + m,
        (Math.max(...rows) + 1) * cell - m,
      ],
      `ship ${cells} drawn off its cells`
    );
  }
});
