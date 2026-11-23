import assert from "node:assert/strict";
import test from "node:test";
import { RANKS } from "./cards.ts";
import {
  MAX_BOXES,
  MIN_BET,
  STACK,
  bet,
  canSplit,
  count,
  current,
  double,
  hit,
  natural,
  open,
  sit,
  split,
  stand,
  surrender,
  timeout,
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
    boxes: ids.map((id) => ({ by: id, cards: cards(hands[id]), bet: 100 })),
    dealer: cards(dealer),
    shoe: shoe ? cards(shoe) : [],
    turn: 0,
  };
};

test("hands add up, with aces as 11 until that busts", () => {
  assert.equal(value(cards("A K")), 21);
  assert.ok(natural(cards("A K")));
  assert.ok(!natural(cards("7 7 7")));
  assert.deepEqual(count(cards("A 6")), { total: 17, soft: true });
  assert.deepEqual(count(cards("A 6 K")), { total: 17, soft: false });
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
    assert.equal(g.boxes.find((b) => b.by === "a")?.cards.length, 2);
    assert.ok(!g.boxes.some((b) => b.by === "b"), "sitting out gets no cards");
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
  assert.deepEqual(doubled.boxes[0].cards, cards("5 6 K"));
  assert.equal(doubled.boxes[0].bet, 200);
  assert.equal(doubled.chips.a, STACK - 200);
  assert.equal(current(doubled), "b");
  const three = rig({ a: "5 6 2" }, "10 7");
  assert.equal(double(three), three, "only on the first two cards");
});

test("21 moves the turn on by itself, and nobody left in means the dealer doesn't draw", () => {
  const g = rig({ a: "10 5" }, "10 2", "6 K");
  const made = hit(g);
  assert.equal(value(made.boxes[0].cards), 21);
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

test("a pair splits into two hands with a bet each, and they settle on their own", () => {
  const g = rig({ a: "8 8", b: "10 9" }, "10 7", "3 K 10 2");
  assert.ok(canSplit(g));
  const two = split(g);
  assert.equal(two.boxes.length, 3);
  assert.deepEqual(two.boxes[0].cards, cards("8 3"));
  assert.deepEqual(two.boxes[1].cards, cards("8 K"));
  assert.equal(two.chips.a, STACK - 200);
  assert.equal(current(two), "a");

  const done = stand(stand(stand(hit(two))));
  assert.equal(done.phase, "done");
  // 8 3 10 = 21 wins, 8 K = 18 wins against 17, b's 19 wins too.
  assert.deepEqual(done.paid, { a: 200, b: 100 });
  assert.equal(done.chips.a, STACK + 200);
});

test("split aces take one card each, and 21 after a split is not blackjack", () => {
  const g = split(rig({ a: "A A" }, "10 7", "K 5"));
  assert.equal(g.phase, "done", "both aces are finished, so the dealer plays at once");
  assert.equal(g.paid?.a, 100 - 100, "21 wins even money, 16 loses");
});

test("no more than four hands from splitting, and only a matching pair", () => {
  let g = rig({ a: "8 8" }, "10 7", "8 8 8 8 8 8");
  for (let i = 1; i < MAX_BOXES; i++) g = split(g);
  assert.equal(g.boxes.length, MAX_BOXES);
  assert.ok(!canSplit(g));
  assert.ok(!canSplit(rig({ a: "8 9" }, "10 7")));
});

test("surrender gives up half the bet", () => {
  const g = surrender(rig({ a: "10 6" }, "10 9"));
  assert.equal(g.phase, "done");
  assert.equal(g.paid?.a, -50);
  assert.equal(g.chips.a, STACK - 50);
});

test("running out of time sits out the betting and stands in play", () => {
  const betting = timeout(open("room", ["a", "b"]));
  assert.equal(betting.bets.a, 0);
  assert.equal(betting.last?.late, true);
  const played = timeout(rig({ a: "10 6", b: "10 7" }, "10 9"));
  assert.equal(current(played), "b");
});

test("someone who arrives while bets are open is seated last", () => {
  const g = sit(bet(open("room", ["a", "b"]), 50), "c");
  assert.deepEqual(g.order, ["a", "b", "c"]);
  assert.equal(g.chips.c, STACK);
  assert.equal(sit(rig({ a: "10 6" }, "10 9"), "c").order.length, 1, "not once cards are out");
});
