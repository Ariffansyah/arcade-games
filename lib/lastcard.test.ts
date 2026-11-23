import assert from "node:assert/strict";
import test from "node:test";
import {
  DECK,
  FLIP,
  HAND,
  accept,
  backOf,
  challenge,
  current,
  deal,
  draw,
  faceOf,
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

test("a wild +4 sets the colour and waits for the next player to take it or challenge", () => {
  const g = rig(
    deal("room", ["a", "b", "c"]),
    "a",
    [find("wild", "+4"), find("blue", "2")],
    find("red", "1")
  );
  const laid = play(g, find("wild", "+4"), "green");
  assert.equal(laid.colour, "green");
  assert.equal(current(laid), "b");
  assert.equal(laid.pending?.bluff, false);
  assert.ok(!playable(laid, laid.hands.b[0]), "nothing goes down until the +4 is answered");
  assert.equal(draw(laid), laid);

  const took = accept(laid);
  assert.equal(took.hands.b.length, g.hands.b.length + 4);
  assert.equal(current(took), "c");
  assert.equal(took.pending, null);

  const lost = challenge(laid);
  assert.equal(lost.hands.b.length, g.hands.b.length + 6);
  assert.equal(current(lost), "c");
});

test("a +4 laid while holding the colour is a bluff the challenger can catch", () => {
  const g = rig(
    deal("room", ["a", "b", "c"]),
    "a",
    [find("wild", "+4"), find("red", "2")],
    find("red", "1")
  );
  const laid = play(g, find("wild", "+4"), "blue");
  assert.equal(laid.pending?.bluff, true);
  const caught = challenge(laid);
  assert.equal(caught.hands.a.length, 1 + 4);
  assert.equal(caught.hands.b.length, g.hands.b.length);
  assert.equal(current(caught), "b", "the challenger plays on");
  assert.equal(caught.last?.caught, true);
});

test("going out on a +2 still makes the next player pick up, and it all scores", () => {
  const g = rig(deal("room", ["a", "b"]), "a", [find("red", "+2")], find("red", "1"));
  const b = [find("blue", "5")];
  const won = play(
    {
      ...g,
      hands: { ...g.hands, b },
      deck: [find("green", "3"), find("green", "4")],
    },
    find("red", "+2")
  );
  assert.equal(won.winner, "a");
  assert.equal(won.hands.b.length, 3);
  assert.equal(won.scores.a, 5 + 3 + 4);
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

const flipFind = (side: "light" | "dark", colour: string, face: string, skip = 0) =>
  FLIP.findIndex((c, i) => c[side].colour === colour && c[side].face === face && i >= skip);

const flipRig = (g: LastCard, id: string, cards: number[], top: number): LastCard => {
  const shown = faceOf(g, top);
  return {
    ...g,
    hands: { ...g.hands, [id]: cards },
    pile: [top],
    colour: (shown.colour === "wild"
      ? g.dark
        ? "pink"
        : "red"
      : shown.colour) as LastCard["colour"],
  };
};

test("the Flip deck is 112 double-sided cards with no zeros", () => {
  assert.equal(FLIP.length, 112);
  const light = FLIP.map((c) => c.light);
  const dark = FLIP.map((c) => c.dark);
  assert.equal(light.filter((c) => c.colour === "red").length, 26);
  assert.equal(dark.filter((c) => c.colour === "teal").length, 26);
  assert.equal(light.filter((c) => c.face === "+2").length, 4);
  assert.equal(dark.filter((c) => c.face === "+colour").length, 4);
  assert.ok(!light.some((c) => c.face === "0"));
  const g = deal("room", ["a", "b", "c"], 1, {}, "flip");
  const all = [...g.deck, ...g.pile, ...Object.values(g.hands).flat()].sort((x, y) => x - y);
  assert.deepEqual(
    all,
    FLIP.map((_, i) => i)
  );
  assert.match(topCard(g).face, /^\d$/);
  assert.deepEqual(backOf(g, 0), FLIP[0].dark);
});

test("a Flip card turns the table to the dark side and takes the colour from what is now on top", () => {
  const g = deal("room", ["a", "b", "c"], 1, {}, "flip");
  let flip = flipFind("light", "red", "flip");
  while (FLIP[flip].dark.colour === "wild") flip = flipFind("light", "red", "flip", flip + 1);
  const before = flipRig(
    g,
    "a",
    [flip, flipFind("light", "blue", "2")],
    flipFind("light", "red", "3")
  );
  const after = play(before, flip);
  assert.equal(after.dark, true);
  assert.equal(after.colour, FLIP[flip].dark.colour);
  assert.deepEqual(topCard(after), FLIP[flip].dark);
  assert.equal(current(after), "b");
});

test("dark side: Skip Everyone comes straight back, +5 hits the next player", () => {
  const g = { ...deal("room", ["a", "b", "c"], 1, {}, "flip"), dark: true };
  const skipAll = flipFind("dark", "teal", "skip-all");
  const top = flipFind("dark", "teal", "3");
  const again = play(flipRig(g, "a", [skipAll, flipFind("dark", "pink", "4")], top), skipAll);
  assert.equal(current(again), "a");

  const five = flipFind("dark", "teal", "+5");
  const before = flipRig(g, "a", [five, flipFind("dark", "pink", "4")], top);
  const hit = play(before, five);
  assert.equal(hit.hands.b.length, before.hands.b.length + 5);
  assert.equal(current(hit), "c");
});

test("Wild Draw Colour keeps dealing until the called colour turns up", () => {
  const g = { ...deal("room", ["a", "b"], 1, {}, "flip"), dark: true };
  const wild = flipFind("dark", "wild", "+colour");
  const deck = [
    flipFind("dark", "pink", "1"),
    flipFind("dark", "teal", "2"),
    flipFind("dark", "orange", "5"),
    flipFind("dark", "purple", "6"),
  ];
  const laid = play(
    {
      ...flipRig(g, "a", [wild, flipFind("dark", "pink", "8")], flipFind("dark", "pink", "3")),
      deck,
    },
    wild,
    "orange"
  );
  assert.equal(laid.colour, "orange");
  const took = accept(laid);
  assert.equal(took.last?.took, 3);
  assert.deepEqual(took.deck, [deck[3]]);
});
