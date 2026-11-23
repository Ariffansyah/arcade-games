import assert from "node:assert/strict";
import test from "node:test";
import { RANKS, SUITS } from "./cards.ts";
import {
  BLIND,
  BLINDS_EVERY,
  REBUY,
  STACK,
  best,
  call,
  current,
  deal,
  describe,
  fold,
  handName,
  pot,
  raise,
  read,
  rebuy,
  seat,
  timeout,
  type Poker,
} from "./poker.ts";

// "As" is the ace of spades, "10h" the ten of hearts.
const card = (s: string) => {
  const r = RANKS.indexOf(s.slice(0, -1).toUpperCase());
  const u = "shdc".indexOf(s.slice(-1));
  assert.ok(r >= 0 && u >= 0, s);
  return u * 13 + r;
};
const cards = (s: string) => s.split(" ").map(card);
const total = (g: Poker) => Object.values(g.chips).reduce((s, x) => s + x, 0) + pot(g);

test("card helpers line up with the suit symbols", () => {
  assert.equal(SUITS[Math.floor(card("Kh") / 13)], "♥");
});

test("hands rank in the usual order, with kickers and the wheel", () => {
  const ladder = [
    "2s 5h 9d Jc Kh",
    "2s 2h 9d Jc Kh",
    "2s 2h 9d 9c Kh",
    "2s 2h 2d Jc Kh",
    "As 2h 3d 4c 5h",
    "2s 3h 4d 5c 6h",
    "2s 5s 9s Js Ks",
    "2s 2h 2d Jc Jh",
    "2s 2h 2d 2c Kh",
    "9s 10s Js Qs Ks",
  ].map((h) => best(cards(h)));
  for (let i = 1; i < ladder.length; i++) assert.ok(ladder[i] > ladder[i - 1], `rung ${i}`);
  assert.equal(handName(ladder[4]), "Straight");
  assert.ok(best(cards("As Ah 9d 7c 3h")) > best(cards("As Ah 9d 7c 2h")), "kicker counts");
  assert.equal(best(cards("As Ah 9d 7c 3h")), best(cards("Ac Ad 9h 7s 3d")), "suits don't");
  assert.equal(handName(best(cards("2h 7h 9h Jh Kh As Ad"))), "Flush", "best five of seven");
});

test("a deal posts the blinds and the player after the big blind acts first", () => {
  const g = deal("room", ["a", "b", "c"]);
  assert.equal(g.bets.b, BLIND);
  assert.equal(g.bets.c, BLIND * 2);
  assert.equal(current(g), "a");
  assert.equal(g.holes.a.length, 2);
  assert.equal(total(g), 3 * STACK);

  const two = deal("room", ["a", "b"]);
  assert.equal(two.bets.a, BLIND, "heads-up the button posts the small blind");
  assert.equal(current(two), "a");
});

test("once everyone has called and the big blind checks, the flop comes", () => {
  let g = deal("room", ["a", "b", "c"]);
  g = call(call(g));
  assert.equal(current(g), "c", "the big blind gets the option");
  g = call(g);
  assert.equal(g.street, 1);
  assert.equal(g.board.length, 3);
  assert.deepEqual(g.bets, {});
  assert.equal(current(g), "b", "first live seat after the button");
  assert.equal(pot(g), 3 * BLIND * 2);
});

test("a raise reopens the betting, and folding round to one ends the hand", () => {
  let g = deal("room", ["a", "b", "c"]);
  g = raise(g, 60);
  assert.equal(g.bets.a, 60);
  g = call(g);
  g = raise(g, 200);
  assert.equal(current(g), "a");
  g = fold(fold(g));
  assert.deepEqual(g.won, { c: 60 + 60 + 200 });
  assert.equal(g.chips.c, STACK - 200 + 320);
  assert.equal(total(g) - pot(g), 3 * STACK);
});

test("a raise below the minimum is lifted to it", () => {
  const g = raise(deal("room", ["a", "b", "c"]), 25);
  assert.equal(g.bets.a, BLIND * 4);
});

test("a short all-in only wins the pot it covered; the side pot goes to the next best", () => {
  const prev = { hand: 0, chips: { a: 100, b: 1000, c: 1000 } } as unknown as Poker;
  let g = deal("room", ["a", "b", "c"], prev);
  g = {
    ...g,
    holes: { a: cards("As Ah"), b: cards("Ks Kh"), c: cards("7c 2d") },
    deck: cards("9c 5d 3h Js 4c 8h 8d"),
  };
  g = raise(g, 100);
  assert.equal(g.chips.a, 0);
  g = raise(g, 300);
  g = call(g);
  assert.equal(g.street, 1, "a is all in, so b and c play on alone");
  g = raise(g, 200);
  g = call(g);
  g = call(call(g));
  g = call(call(g));
  assert.ok(g.won);
  assert.deepEqual(g.won, { a: 300, b: 800 });
  assert.equal(g.shown?.a, "Pair of aces");
  assert.equal(g.chips.a + g.chips.b + g.chips.c, 2100);
});

test("everyone all in runs the board out to a showdown", () => {
  const prev = { hand: 0, chips: { a: 50, b: 50 } } as unknown as Poker;
  const g = call(raise(deal("room", ["a", "b"], prev), 50));
  assert.equal(g.board.length, 5);
  assert.ok(g.won);
  assert.equal(g.chips.a + g.chips.b, 100);
});

test("busted players sit out the next hand and newcomers get a stack", () => {
  const prev = { hand: 3, chips: { a: 0, b: 500, c: 700 } } as unknown as Poker;
  const g = deal("room", ["a", "b", "c", "d"], prev);
  assert.deepEqual(g.order, ["b", "c", "d"]);
  assert.equal(g.chips.d + (g.put.d ?? 0), STACK);
});

test("hands are named the way players say them", () => {
  const name = (h: string) => describe(best(cards(h)));
  assert.equal(name("Ks Kh Kd 7c 7h"), "Full house, kings full of sevens");
  assert.equal(name("10s Js Qs Ks As"), "Royal flush");
  assert.equal(name("5h 6h 7h 8h 9h"), "Straight flush, nine high");
  assert.equal(name("As 2h 3d 4c 5h"), "Straight, five high");
  assert.equal(name("6s 6h 9d 9c Kh"), "Two pair, nines and sixes");
  assert.equal(name("Qs Qh Qd 2c 5h"), "Three queens");
  assert.equal(name("2s 5h 9d Jc Ah"), "Ace high");
  assert.equal(read(cards("As Ks")).name, "Ace-king suited");
  assert.equal(read(cards("8c 8d")).name, "Pair of eights");

  const seven = read(cards("2h 7h 9h Jh Kh As Ad"));
  assert.equal(seven.name, "Flush, king high");
  assert.deepEqual(
    [...seven.five].sort((x, y) => x - y),
    cards("2h 7h 9h Jh Kh").sort((x, y) => x - y)
  );
  assert.deepEqual(read(cards("8c 8d 2h 5s Kd")).five, cards("8c 8d"), "a pair lights the pair");
  assert.deepEqual(read(cards("9c 3d 2h 5s Kd")).five, cards("Kd"), "nothing lights the top card");
});

test("blinds double every few hands", () => {
  const prev = { hand: BLINDS_EVERY, chips: { a: 1000, b: 1000, c: 1000 } } as unknown as Poker;
  const g = deal("room", ["a", "b", "c"], prev);
  assert.equal(g.blind, BLIND * 2);
  assert.equal(Math.max(...Object.values(g.bets)), BLIND * 4);
  assert.equal(raise(g, 0).bets[current(g)], BLIND * 8, "the minimum raise grows with them");
});

test("out of time: a free check, otherwise a fold", () => {
  const g = deal("room", ["a", "b", "c"]);
  const folded = timeout(g);
  assert.deepEqual(folded.folded, ["a"]);
  assert.equal(folded.last?.late, true);
  const checked = timeout(call(call(g)));
  assert.equal(checked.street, 1, "the big blind checks and the flop comes");
  assert.deepEqual(checked.folded, []);
});

test("a player the deal missed sits in before the flop, and plays the hand", () => {
  const g = deal("room", ["a", "b", "c"]);
  const late = seat(g, "d");
  assert.deepEqual(late.order, ["a", "b", "c", "d"]);
  assert.deepEqual(late.holes.d, g.deck.slice(0, 2));
  assert.equal(late.chips.d, STACK);
  assert.equal(current(late), current(g), "whoever was up still is");
  assert.equal(seat(late, "d"), late);

  let h = late;
  for (let i = 0; i < 3; i++) h = call(h);
  assert.equal(h.street, 0);
  assert.equal(current(h), "d", "d still has to call the big blind");
  h = call(h);
  assert.equal(h.street, 1);
  assert.equal(pot(h), 4 * BLIND * 2);
  assert.equal(seat(h, "e"), h, "not once the flop is out");
  assert.equal(seat({ ...g, chips: { ...g.chips, e: 0 } }, "e").order.length, 3, "broke waits");
});

test("out of chips, a player buys back in for half a stack and is dealt the next hand", () => {
  const busted: Poker = { ...deal("room", ["a", "b"]), won: { b: 1000 }, chips: { a: 0, b: 2000 } };
  assert.equal(rebuy(busted, "b"), busted, "only when broke");

  const back = rebuy(busted, "a");
  assert.equal(back.chips.a, REBUY);
  assert.deepEqual(back.last, { by: "a", act: "rebuy", amount: REBUY });
  assert.deepEqual(deal("room", ["a", "b"], back).order, ["a", "b"]);
  assert.deepEqual(deal("room", ["a", "b"], busted).order, ["b"], "without it they sit out");

  const allIn = { ...deal("room", ["a", "b"]), chips: { a: 0, b: 900 } };
  assert.equal(rebuy(allIn, "a"), allIn, "not while all in on a live hand");
});
