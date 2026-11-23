import assert from "node:assert/strict";
import test from "node:test";
import {
  BAIL,
  BOARD,
  GLITCH,
  JAIL,
  SALARY,
  START_CASH,
  actor,
  answer,
  bail,
  bid,
  build,
  buy,
  canBuild,
  canMortgage,
  canSell,
  current,
  decline,
  end,
  finish,
  fold,
  jailCard,
  leave,
  lift,
  liftCost,
  mortgage,
  newLandlord,
  propose,
  rentFor,
  roll,
  sell,
  step,
  type Landlord,
} from "./landlord.ts";

const fresh = () => newLandlord("room", ["a", "b"]);
const at = (g: Landlord, id: string, pos: number): Landlord => ({
  ...g,
  pos: { ...g.pos, [id]: pos },
});
// Pass on a deed and let the auction die with no bids.
const skip = (g: Landlord) => {
  let next = decline(g);
  while (next.auction) next = fold(next);
  return next;
};

test("the board has 40 spaces, 28 of them for sale", () => {
  assert.equal(BOARD.length, 40);
  assert.equal(BOARD.filter((s) => s.price).length, 28);
  assert.equal(BOARD[JAIL].kind, "jail");
  assert.equal(BOARD[30].kind, "arrest");
});

test("landing on a free deed offers it; buying pays the bank and ends nothing", () => {
  let g = step(fresh(), [1, 2]);
  assert.equal(g.pos.a, 3);
  assert.equal(g.offer, 3);
  assert.equal(end(g), g, "cannot end with a deed on the table");
  g = buy(g);
  assert.equal(g.owner[3], "a");
  assert.equal(g.cash.a, START_CASH - 60);
  assert.equal(current(end(g)), "b");
  assert.equal(skip(step(fresh(), [1, 2])).owner[3], undefined);
});

test("rent doubles on a full set, then follows the house table", () => {
  let g: Landlord = { ...fresh(), owner: { 1: "a" } };
  assert.equal(rentFor(g, 1, 7), 2);
  g = { ...g, owner: { 1: "a", 3: "a" } };
  assert.equal(rentFor(g, 1, 7), 4);
  assert.equal(rentFor({ ...g, houses: { 1: 3 } }, 1, 7), 90);
  assert.equal(rentFor({ ...fresh(), owner: { 5: "a", 15: "a", 25: "a" } }, 5, 7), 100);
  assert.equal(rentFor({ ...fresh(), owner: { 12: "a" } }, 12, 7), 28);
  assert.equal(rentFor({ ...fresh(), owner: { 12: "a", 28: "a" } }, 12, 7), 70);
});

test("landing on someone else's deed pays them", () => {
  const g = step(at({ ...fresh(), owner: { 6: "b" } }, "a", 1), [2, 3]);
  assert.equal(g.cash.a, START_CASH - 6);
  assert.equal(g.cash.b, START_CASH + 6);
});

test("passing GO pays the salary", () => {
  const g = step(at(fresh(), "a", 38), [1, 2]);
  assert.equal(g.pos.a, 1);
  assert.equal(g.cash.a, START_CASH + SALARY);
});

test("doubles roll again, and the third double goes to jail", () => {
  let g = step(fresh(), [3, 3]);
  assert.ok(g.canRoll);
  g = step(skip(g), [2, 2]);
  g = step(skip(g), [1, 1]);
  assert.equal(g.pos.a, JAIL);
  assert.ok("a" in g.jail);
  assert.ok(!g.canRoll);
});

test("jail: doubles walk out, two misses wait, the third pays bail and moves", () => {
  const jailed = { ...at(fresh(), "a", JAIL), jail: { a: 0 } };
  const out = step(jailed, [2, 2]);
  assert.ok(!("a" in out.jail));
  assert.equal(out.pos.a, 14);
  assert.ok(!out.canRoll, "leaving on doubles does not roll again");

  let g = step(jailed, [1, 2]);
  assert.equal(g.pos.a, JAIL);
  g = { ...g, canRoll: true };
  g = step(g, [1, 2]);
  g = step({ ...g, canRoll: true }, [3, 5]);
  assert.ok(!("a" in g.jail));
  assert.equal(g.pos.a, 18);
  assert.equal(g.cash.a, START_CASH - BAIL);

  const paid = bail(jailed);
  assert.ok(!("a" in paid.jail));
  assert.ok(paid.canRoll);
});

test("houses go up evenly, only on a full set", () => {
  let g: Landlord = { ...fresh(), owner: { 1: "a", 3: "a" } };
  assert.ok(canBuild(g, 1));
  assert.ok(!canBuild({ ...g, owner: { 1: "a" } }, 1));
  g = build(g, 1);
  assert.equal(g.houses[1], 1);
  assert.equal(g.cash.a, START_CASH - 50);
  assert.ok(!canBuild(g, 1), "the other lot needs a house first");
  assert.ok(canBuild(g, 3));
});

test("an unpayable rent bankrupts the player to the owner and ends the game", () => {
  let g = at({ ...fresh(), owner: { 39: "b", 37: "b", 1: "a" }, houses: { 39: 5 } }, "a", 35);
  g = { ...g, cash: { a: 100, b: 0 } };
  g = step(g, [1, 3]);
  assert.deepEqual(g.out, ["a"]);
  assert.equal(g.winner, "b");
  assert.equal(g.owner[1], "b");
  assert.ok(g.mortgaged[1], "the deed was mortgaged trying to pay, and stays mortgaged");
  assert.equal(g.cash.b, 100 + 30);
});

test("short of cash, houses are sold back before going bust", () => {
  let g = at({ ...fresh(), owner: { 1: "a", 3: "a", 6: "b" }, houses: { 1: 2, 3: 2 } }, "a", 4);
  g = { ...g, cash: { a: 0, b: 0 }, pos: { ...g.pos, a: 1 } };
  g = step(g, [2, 3]);
  assert.equal(g.out.length, 0);
  assert.equal(g.cash.b, 6);
  assert.equal(g.houses[1] + g.houses[3], 3);
});

test("a player who leaves hands everything back and the turn moves on", () => {
  const three = newLandlord("room", ["a", "b", "c"]);
  const g = leave({ ...three, owner: { 1: "a" } });
  assert.deepEqual(g.out, ["a"]);
  assert.equal(g.owner[1], undefined);
  assert.equal(current(g), "b");
  assert.equal(current(end({ ...g, canRoll: false })), "c");
  assert.equal(current(end({ ...end({ ...g, canRoll: false }), canRoll: false })), "b");
});

test("calling it early crowns the richest on paper", () => {
  const g = finish({ ...fresh(), owner: { 39: "b" } });
  assert.equal(g.winner, "b");
});

test("a seeded roll is the same everywhere", () => {
  assert.deepEqual(roll(fresh()).dice, roll(fresh()).dice);
});

test("cards come off the deck in order, and a jail card is kept until it is used", () => {
  const jailFree = GLITCH.findIndex((c) => c.free);
  const prize = GLITCH.findIndex((c) => c.cash === 150);
  let g: Landlord = { ...fresh(), decks: { ...fresh().decks, glitch: [jailFree, prize] } };
  g = step(g, [3, 4]);
  assert.equal(BOARD[7].kind, "glitch");
  assert.deepEqual(g.free.a, ["glitch"]);
  assert.deepEqual(g.decks.glitch, [prize], "the jail card left the deck");
  assert.equal(g.drew?.card, jailFree);

  const jailed: Landlord = { ...at(g, "a", JAIL), jail: { a: 0 }, canRoll: true };
  const out = jailCard(jailed);
  assert.ok(!("a" in out.jail));
  assert.deepEqual(out.free.a, []);
  assert.deepEqual(out.decks.glitch, [prize, jailFree], "it goes back under the deck");
});

test("the nearest-train card charges double rent", () => {
  const card = GLITCH.findIndex((c) => c.nearest === "rail");
  const g: Landlord = {
    ...fresh(),
    owner: { 15: "b" },
    decks: { ...fresh().decks, glitch: [card] },
  };
  const next = step(at(g, "a", 4), [1, 2]);
  assert.equal(next.pos.a, 15);
  assert.equal(next.cash.a, START_CASH - 50);
  assert.equal(next.cash.b, START_CASH + 50);
});

test("a mortgaged deed charges no rent and blocks building until it is paid off", () => {
  let g: Landlord = { ...fresh(), owner: { 1: "a", 3: "a" } };
  g = mortgage(g, 1);
  assert.equal(g.cash.a, START_CASH + 30);
  assert.equal(rentFor(g, 1, 7), 0);
  assert.ok(!canBuild(g, 3));
  g = lift(g, 1);
  assert.equal(g.cash.a, START_CASH + 30 - liftCost(1));
  assert.equal(liftCost(1), 33);
  assert.ok(canBuild(g, 3));
  g = build(g, 3);
  assert.ok(!canMortgage(g, 1), "not while the set has a house on it");
  const visit = step(at({ ...fresh(), owner: { 6: "b" }, mortgaged: { 6: true } }, "a", 1), [2, 3]);
  assert.equal(visit.cash.a, START_CASH);
});

test("houses come back down evenly at half price", () => {
  const g: Landlord = { ...fresh(), owner: { 1: "a", 3: "a" }, houses: { 1: 2, 3: 1 } };
  assert.ok(canSell(g, 1));
  assert.ok(!canSell(g, 3), "sell from the taller lot first");
  const sold = sell(g, 1);
  assert.equal(sold.houses[1], 1);
  assert.equal(sold.cash.a, START_CASH + 25);
});

test("a deed nobody buys goes to auction and the last bidder standing pays", () => {
  const three = newLandlord("room", ["a", "b", "c"]);
  let g = decline(step(three, [1, 2]));
  assert.equal(g.offer, -1);
  assert.deepEqual(g.auction?.bidders, ["a", "b", "c"]);
  assert.equal(actor(g), "a");
  assert.equal(end(g), g, "the turn cannot end mid-auction");
  g = bid(g, 10);
  assert.equal(actor(g), "b");
  assert.equal(bid(g, 10), g, "a bid has to beat the last one");
  g = bid(g, 40);
  g = fold(g);
  assert.equal(actor(g), "a");
  g = fold(g);
  assert.equal(g.auction, null);
  assert.equal(g.owner[3], "b");
  assert.equal(g.cash.b, START_CASH - 40);
  assert.equal(current(g), "a", "the turn picks up where it was");
});

test("trades swap deeds and cash only when the other side says yes", () => {
  const g: Landlord = { ...fresh(), owner: { 1: "a", 6: "b" }, canRoll: false };
  const offered = propose(g, { from: "a", to: "b", give: [1], get: [6], cash: 50 });
  assert.equal(actor(offered), "b");
  const done = answer(offered, true);
  assert.equal(done.owner[1], "b");
  assert.equal(done.owner[6], "a");
  assert.equal(done.cash.a, START_CASH - 50);
  assert.equal(done.cash.b, START_CASH + 50);
  assert.equal(answer(offered, false).owner[1], "a");
  assert.equal(
    propose(
      { ...g, owner: { 1: "a", 3: "a", 6: "b" }, houses: { 3: 1 } },
      {
        from: "a",
        to: "b",
        give: [1],
        get: [],
        cash: 0,
      }
    ).trade,
    null,
    "nothing in a set with buildings can be traded"
  );
  assert.equal(propose(g, { from: "a", to: "b", give: [6], get: [], cash: 0 }).trade, null);
});
