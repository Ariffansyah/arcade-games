import assert from "node:assert/strict";
import test from "node:test";
import { RANKS } from "./cards.ts";
import {
  MIN_BET,
  STACK,
  bet,
  current,
  double,
  hit,
  natural,
  open,
  stand,
  value,
  type Blackjack,
} from "./blackjack.ts";

// Suits don't matter in 21, so cards are named by rank: "A K" is a blackjack.
const cards = (s: string) => s.split(" ").map((r) => RANKS.indexOf(r));

// Mid-round, with the hands, dealer and shoe set by hand.
const rig = (hands: Record<string, string>, dealer: string, shoe = ""): Blackjack => {
  const ids = Object.keys(hands);
  return {
    ...open("room", ids),
    phase: "play",
    bets: Object.fromEntries(ids.map((id) => [id, 100])),
    chips: Object.fromEntries(ids.map((id) => [id, STACK - 100])),
    hands: Object.fromEntries(ids.map((id) => [id, cards(hands[id])])),
    dealer: cards(dealer),
    shoe: shoe ? cards(shoe) : [],
    turn: 0,
  };
};

test("hands add up, with aces as 11 until that busts", () => {
  assert.equal(value(cards("A K")), 21);
  assert.ok(natural(cards("A K")));
  assert.ok(!natural(cards("7 7 7")));
  assert.equal(value(cards("A A 9")), 21);
  assert.equal(value(cards("K Q 5")), 25);
  assert.equal(value(cards("A 6")), 17);
  assert.equal(value(cards("A 6 K")), 17);
});

test("bets go round the table, then the cards come out", () => {
  let g = open("room", ["a", "b", "c"]);
  g = bet(g, 50);
  assert.equal(g.chips.a, STACK - 50);
  assert.equal(current(g), "b");
  g = bet(bet(g, 0), 3);
  assert.equal(g.bets.c, MIN_BET, "small bets are lifted to the minimum");
  if (g.phase === "play") {
    assert.equal(g.hands.a.length, 2);
    assert.equal(g.hands.b, undefined, "sitting out gets no cards");
    assert.equal(g.dealer.length, 2);
  } else assert.ok(g.paid, "a dealer blackjack settles at once");
});

test("the dealer draws to 17 and the round settles: win, push, bust and blackjack", () => {
  const g = rig({ a: "K Q", b: "10 8", c: "K 6", d: "A K" }, "10 6", "2 5 9");
  const played = stand(stand(stand(g)));
  assert.equal(played.phase, "done");
  assert.deepEqual(played.dealer, cards("10 6 2"));
  assert.deepEqual(played.paid, { a: 100, b: 0, c: -100, d: 150 });
  assert.equal(played.chips.a, STACK + 100);
  assert.equal(played.chips.d, STACK + 150);
});

test("a dealer bust pays everyone still standing", () => {
  const g = rig({ a: "10 2" }, "10 6", "K");
  const played = stand(g);
  assert.equal(value(played.dealer), 26);
  assert.equal(played.paid?.a, 100);
});

test("doubling takes one card, doubles the bet and stands", () => {
  const g = rig({ a: "5 6", b: "10 9" }, "10 7", "K");
  const doubled = double(g);
  assert.deepEqual(doubled.hands.a, cards("5 6 K"));
  assert.equal(doubled.bets.a, 200);
  assert.equal(current(doubled), "b");
  assert.equal(double(rig({ a: "5 6 2" }, "10 7")).bets.a, 100, "only on the first two cards");
});

test("21 moves the turn on by itself, and nobody left in means the dealer doesn't draw", () => {
  const g = rig({ a: "10 5" }, "10 2", "6 K");
  const made = hit(g);
  assert.equal(value(made.hands.a), 21);
  assert.equal(made.phase, "done");
  const bust = hit(rig({ a: "10 5" }, "10 2", "K 9"));
  assert.equal(bust.paid?.a, -100);
  assert.deepEqual(bust.dealer, cards("10 2"));
});

test("a broke player is staked again next round", () => {
  const prev = { ...open("room", ["a", "b"]), round: 4, chips: { a: 0, b: 400 } };
  const g = open("room", ["a", "b"], prev);
  assert.deepEqual(g.chips, { a: STACK, b: 400 });
  assert.equal(g.round, 5);
});
