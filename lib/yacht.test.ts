import assert from "node:assert/strict";
import test from "node:test";
import {
  BONUS,
  CATEGORIES,
  ROLLS,
  hold,
  leave,
  mark,
  newYacht,
  roll,
  score,
  totals,
} from "./yacht.ts";

test("every category scores the way the card says", () => {
  assert.equal(score("threes", [3, 3, 1, 3, 6]), 9);
  assert.equal(score("three", [4, 4, 4, 1, 2]), 15);
  assert.equal(score("three", [4, 4, 1, 1, 2]), 0);
  assert.equal(score("four", [2, 2, 2, 2, 6]), 14);
  assert.equal(score("house", [5, 5, 2, 2, 2]), 25);
  assert.equal(score("house", [5, 5, 5, 5, 5]), 0);
  assert.equal(score("small", [1, 3, 2, 4, 6]), 30);
  assert.equal(score("small", [1, 2, 3, 5, 6]), 0);
  assert.equal(score("large", [2, 3, 4, 5, 6]), 40);
  assert.equal(score("yacht", [6, 6, 6, 6, 6]), 50);
  assert.equal(score("chance", [1, 2, 3, 4, 6]), 16);
});

test("63 in the top half earns the bonus", () => {
  const card = {
    ones: 3,
    twos: 6,
    threes: 9,
    fours: 12,
    fives: 15,
    sixes: 18,
    chance: 20,
  };
  assert.deepEqual(totals(card), {
    upper: 63,
    bonus: BONUS,
    total: 63 + 20 + BONUS,
  });
  assert.equal(totals({ ...card, sixes: 12 }).bonus, 0);
});

test("held dice stay put and the third roll is the last", () => {
  let y = roll(newYacht("room", ["a", "b"]));
  const first = y.dice;
  y = roll(hold(hold(y, 0), 2));
  assert.equal(y.dice[0], first[0]);
  assert.equal(y.dice[2], first[2]);
  y = roll(y);
  assert.equal(y.rolls, ROLLS);
  assert.equal(roll(y), y);
  assert.equal(hold(y, 1), y);
});

test("marking fills one box, passes the turn, and the game ends when every card is full", () => {
  let y = newYacht("room", ["a", "b"]);
  assert.equal(mark(y, "chance"), y);
  y = mark(roll(y), "chance");
  assert.equal(y.order[y.turn], "b");
  assert.equal(y.rolls, 0);
  assert.equal(mark(roll({ ...y, turn: 0 }), "chance").cards, y.cards);
  y = mark(roll(y), "chance");
  for (const { id } of CATEGORIES.filter((c) => c.id !== "chance"))
    y = mark(roll(mark(roll(y), id)), id);
  assert.ok(y.done);
});

test("a player leaving mid-game does not stall it", () => {
  let y = leave({ ...newYacht("room", ["a", "b"]), turn: 1 });
  assert.deepEqual(y.order, ["a"]);
  for (const { id } of CATEGORIES) y = mark(roll(y), id);
  assert.ok(y.done);
});
