import assert from "node:assert/strict";
import test from "node:test";
import {
  DECK,
  HAND,
  current,
  deal,
  draw,
  pass,
  play,
  playable,
  topCard,
  type LastCard,
} from "./lastcard.ts";

const find = (colour: string, face: string, skip = 0) =>
  DECK.findIndex((c, i) => c.colour === colour && c.face === face && i >= skip);

const rig = (g: LastCard, id: string, cards: number[], top: number): LastCard => ({
  ...g,
  hands: { ...g.hands, [id]: cards },
  pile: [top],
  colour: DECK[top].colour === "wild" ? "red" : (DECK[top].colour as LastCard["colour"]),
});

test("a full deck is 108 cards and every deal adds up", () => {
  assert.equal(DECK.length, 108);
  const g = deal("room", ["a", "b", "c"]);
  for (const id of g.order) assert.equal(g.hands[id].length, HAND);
  assert.match(topCard(g).face, /^\d$/);
  const all = [...g.deck, ...g.pile, ...Object.values(g.hands).flat()].sort((x, y) => x - y);
  assert.deepEqual(
    all,
    DECK.map((_, i) => i)
  );
});

test("only matching colour, matching face, or a wild can go down", () => {
  const g = rig(
    deal("room", ["a", "b"]),
    "a",
    [find("red", "5"), find("blue", "7"), find("green", "3"), find("wild", "wild")],
    find("blue", "3")
  );
  assert.ok(playable(g, find("blue", "7")));
  assert.ok(playable(g, find("green", "3")));
  assert.ok(playable(g, find("wild", "wild")));
  assert.ok(!playable(g, find("red", "5")));
  assert.equal(play(g, find("red", "5")), g);
});

test("skip, reverse and +2 hand the turn on correctly", () => {
  const three = deal("room", ["a", "b", "c"]);
  const top = find("red", "1");
  const skipped = play(
    rig(three, "a", [find("red", "skip"), find("red", "2")], top),
    find("red", "skip")
  );
  assert.equal(current(skipped), "c");

  const reversed = play(
    rig(three, "a", [find("red", "reverse"), find("red", "2")], top),
    find("red", "reverse")
  );
  assert.equal(reversed.dir, -1);
  assert.equal(current(reversed), "c");

  const two = deal("room", ["a", "b"]);
  const again = play(
    rig(two, "a", [find("red", "reverse"), find("red", "2")], top),
    find("red", "reverse")
  );
  assert.equal(current(again), "a");

  const before = rig(three, "a", [find("red", "+2"), find("red", "2")], top);
  const hit = play(before, find("red", "+2"));
  assert.equal(hit.hands.b.length, before.hands.b.length + 2);
  assert.equal(current(hit), "c");
});

test("a wild +4 sets the colour and the next player picks up four", () => {
  const g = rig(
    deal("room", ["a", "b"]),
    "a",
    [find("wild", "+4"), find("red", "2")],
    find("red", "1")
  );
  const next = play(g, find("wild", "+4"), "green");
  assert.equal(next.colour, "green");
  assert.equal(next.hands.b.length, g.hands.b.length + 4);
  assert.equal(current(next), "a");
});

test("going out wins and scores what everyone else is holding", () => {
  const g = rig(deal("room", ["a", "b"]), "a", [find("red", "9")], find("red", "1"));
  const b = [find("blue", "5"), find("wild", "wild"), find("green", "skip")];
  const won = play({ ...g, hands: { ...g.hands, b } }, find("red", "9"));
  assert.equal(won.winner, "a");
  assert.equal(won.scores.a, 5 + 50 + 20);
  assert.equal(draw(won), won);
});

test("drawing a dud passes; drawing a fit lets only that card be played", () => {
  const g = deal("room", ["a", "b"]);
  const dud = find("blue", "4");
  const after = draw({
    ...rig(g, "a", [find("blue", "2")], find("red", "1")),
    deck: [dud, ...g.deck],
  });
  assert.equal(current(after), "b");
  assert.ok(after.hands.a.includes(dud));

  const fit = find("red", "8");
  const held = draw({
    ...rig(g, "a", [find("red", "2")], find("red", "1")),
    deck: [fit, ...g.deck],
  });
  assert.equal(current(held), "a");
  assert.equal(held.drawn, fit);
  assert.ok(!playable(held, find("red", "2")));
  assert.equal(current(pass(held)), "b");
});

test("an empty deck is rebuilt from the pile under the top card", () => {
  const g = rig(deal("room", ["a", "b"]), "a", [find("blue", "2")], find("red", "1"));
  const pile = [find("green", "4"), find("green", "5"), find("red", "1")];
  const after = draw({ ...g, deck: [], pile });
  assert.deepEqual(after.pile, [find("red", "1")]);
  assert.equal(after.hands.a.length + after.deck.length, 1 + 2);
});
