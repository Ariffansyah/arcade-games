import assert from "node:assert/strict";
import test from "node:test";
import {
  DECK,
  FLIP,
  HAND,
  NO_MERCY,
  accept,
  backOf,
  callLast,
  catchOut,
  catchable,
  challenge,
  current,
  deal,
  draw,
  faceOf,
  join,
  leave,
  pass,
  play,
  playable,
  timeout,
  topCard,
  type LastCard,
  type Rules,
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

const ruled = (rules: Rules, order = ["a", "b", "c"], mode: LastCard["mode"] = "classic") => ({
  ...deal("room", order, 1, {}, mode),
  rules,
});

test("stack numbers: every card of one number goes down in the same turn", () => {
  const [red5, blue5] = [find("red", "5"), find("blue", "5")];
  const g = rig(ruled({ numbers: true }), "a", [red5, blue5, find("green", "9")], find("red", "1"));
  const first = play(g, red5);
  assert.equal(current(first), "a");
  assert.equal(first.run, "5");
  assert.ok(!playable(first, find("green", "9")));
  assert.equal(draw(first), first);
  assert.equal(current(pass(first)), "b");
  const second = play(first, blue5);
  assert.equal(second.colour, "blue");
  assert.equal(current(second), "b", "no fives left, so the turn moves on");
});

test("down to one card without calling it, anyone else can catch you for two", () => {
  const g = rig(ruled({ uno: true }), "a", [find("red", "5"), find("blue", "9")], find("red", "1"));
  const quiet = play(g, find("red", "5"));
  assert.equal(catchable(quiet), "a");
  assert.equal(catchOut(quiet, "a"), quiet);
  const caught = catchOut(quiet, "c");
  assert.equal(caught.hands.a.length, 3);
  assert.equal(catchable(caught), "");
  assert.equal(catchable(callLast(quiet, "a")), "");
  assert.equal(catchable(play(g, find("red", "5"), undefined, { uno: true })), "");
});

test("jump-in: an exact copy of the top card goes down out of turn", () => {
  const top = find("red", "5");
  const copy = find("red", "5", top + 1);
  const g = rig(ruled({ jumpIn: true }), "c", [copy, find("blue", "2")], top);
  assert.ok(playable(g, copy, "c"));
  assert.ok(!playable(g, find("blue", "2"), "c"));
  const jumped = play(g, copy, undefined, { by: "c" });
  assert.deepEqual(jumped.hands.c, [find("blue", "2")]);
  assert.equal(current(jumped), "a", "play carries on from the one who jumped in");
  const plain = rig(ruled({}), "c", [copy], top);
  assert.equal(play(plain, copy, undefined, { by: "c" }), plain);
});

test("force play lays a drawn fit; draw to match keeps drawing until one fits", () => {
  const g = rig(ruled({ forcePlay: true }), "a", [find("blue", "2")], find("red", "1"));
  const forced = draw({ ...g, deck: [find("red", "8"), ...g.deck] });
  assert.equal(topCard(forced).face, "8");
  assert.equal(current(forced), "b");

  const m = rig(ruled({ drawToMatch: true }), "a", [find("blue", "2")], find("red", "1"));
  const deck = [find("blue", "4"), find("green", "6"), find("red", "8"), find("yellow", "3")];
  const matched = draw({ ...m, deck });
  assert.equal(matched.hands.a.length, 4);
  assert.equal(matched.drawn, find("red", "8"));
  assert.equal(current(matched), "a");
});

test("no bluffing: a Wild Draw Four lands at once with nothing to challenge", () => {
  const g = rig(
    ruled({ noBluffing: true }),
    "a",
    [find("wild", "+4"), find("red", "2")],
    find("red", "1")
  );
  const hit = play(g, find("wild", "+4"), "blue");
  assert.equal(hit.pending, null);
  assert.equal(hit.hands.b.length, g.hands.b.length + 4);
  assert.equal(current(hit), "c");
});

test("stacking: draw cards pile onto whoever can't answer with an equal or bigger one", () => {
  const six = NO_MERCY.findIndex((c) => c.face === "+6");
  const base = rig(
    ruled({ stacking: true }, ["a", "b", "c"], "mercy"),
    "a",
    [find("red", "+2"), find("red", "3")],
    find("red", "1")
  );
  const g = { ...base, hands: { ...base.hands, b: [six, find("blue", "+2"), find("green", "4")] } };
  const laid = play(g, find("red", "+2"));
  assert.equal(laid.stack, 2);
  assert.equal(current(laid), "b");
  assert.ok(playable(laid, find("blue", "+2")));
  assert.ok(!playable(laid, find("green", "4")));
  const raised = play(laid, six, "green");
  assert.equal(raised.stack, 8);
  assert.ok(!playable(raised, find("yellow", "+2")), "a +2 can't go on a +6");
  assert.equal(pass(raised), raised);
  const took = draw(raised);
  assert.equal(took.hands.c.length, raised.hands.c.length + 8);
  assert.equal(took.stack, 0);
  assert.equal(current(took), "a");
});

test("7s swap hands with a chosen player, 0s move every hand on a seat", () => {
  const hand = [find("red", "7"), find("red", "0"), find("blue", "2")];
  const g = rig(ruled({ sevens: true, zeros: true }), "a", hand, find("red", "1"));
  const swapped = play(g, find("red", "7"), undefined, { to: "c" });
  assert.deepEqual(swapped.hands.a, g.hands.c);
  assert.deepEqual(swapped.hands.c, [find("red", "0"), find("blue", "2")]);
  assert.equal(current(swapped), "b");

  const passed = play(g, find("red", "0"));
  assert.deepEqual(passed.hands.b, [find("red", "7"), find("blue", "2")]);
  assert.deepEqual(passed.hands.c, g.hands.b);
  assert.deepEqual(passed.hands.a, g.hands.c);
});

test("mercy: 25 cards puts a player out, and the last one sitting wins", () => {
  const hit = (order: string[]) => {
    const g = rig(
      ruled({ mercy: true }, order),
      "a",
      [find("red", "+2"), find("red", "3")],
      find("red", "1")
    );
    const full = { ...g, hands: { ...g.hands, b: g.deck.slice(0, 23) }, deck: g.deck.slice(23) };
    return [full, play(full, find("red", "+2"))];
  };
  const [g, three] = hit(["a", "b", "c"]);
  assert.deepEqual(three.order, ["a", "c"]);
  assert.equal(current(three), "c");
  assert.equal(three.last?.out, "b");
  assert.deepEqual(three.hands.b, []);
  assert.equal(three.deck.length, g.deck.length - 2 + 25);
  assert.equal(three.winner, "");
  assert.equal(hit(["a", "b"])[1].winner, "a");
  assert.equal(current(leave(g)), "b");
});

test("finish on a number: a lone action or wild card can't go out", () => {
  const top = find("red", "1");
  const g = ruled({ numberFinish: true });
  assert.ok(!playable(rig(g, "a", [find("red", "skip")], top), find("red", "skip")));
  assert.ok(!playable(rig(g, "a", [find("wild", "wild")], top), find("wild", "wild")));
  assert.ok(playable(rig(g, "a", [find("red", "5")], top), find("red", "5")));
  assert.ok(
    playable(rig(g, "a", [find("red", "skip"), find("red", "5")], top), find("red", "skip"))
  );
});

test("bounce draws: under a stack a Reverse sends it back, a Skip passes it on", () => {
  const base = rig(
    ruled({ stacking: true, deflect: true }),
    "a",
    [find("red", "+2"), find("red", "3")],
    find("red", "1")
  );
  const reverse = find("red", "reverse");
  const skip = find("red", "skip");
  const laid = play(
    { ...base, hands: { ...base.hands, b: [reverse, skip, find("blue", "4")] } },
    find("red", "+2")
  );
  const back = play(laid, reverse);
  assert.equal(current(back), "a");
  assert.equal(back.stack, 2);
  const on = play(laid, skip);
  assert.equal(current(on), "c");
  assert.equal(on.stack, 2);
  assert.ok(!playable({ ...laid, rules: { stacking: true } }, reverse));
});

test("play to the loser: going out is safe, and the last one holding cards loses", () => {
  const g = rig(ruled({ lastLoses: true }), "a", [find("red", "5")], find("red", "1"));
  const one = play(
    {
      ...g,
      hands: { ...g.hands, b: [find("red", "6")], c: [find("blue", "2"), find("green", "9")] },
    },
    find("red", "5")
  );
  assert.deepEqual(one.order, ["b", "c"]);
  assert.deepEqual(one.safe, ["a"]);
  assert.equal(one.winner, "");
  assert.equal(one.scores.a, 6 + 2 + 9);
  assert.equal(current(one), "b");
  const two = play(one, find("red", "6"));
  assert.equal(two.winner, "a");
  assert.equal(two.loser, "c");
  assert.equal(two.scores.b, undefined);
});

test("a player the deal missed sits down with a fresh hand, and keeps theirs coming back", () => {
  const g = deal("room", ["a", "b"]);
  const joined = join(g, "c");
  assert.deepEqual(joined.order, ["a", "b", "c"]);
  assert.equal(joined.hands.c.length, HAND);
  assert.equal(joined.deck.length, g.deck.length - HAND);
  assert.equal(current(joined), current(g));
  assert.equal(join(joined, "c"), joined, "already seated");

  const left = leave(joined);
  const back = join(left, current(joined));
  assert.deepEqual(back.hands[current(joined)], joined.hands[current(joined)]);
  assert.equal(join({ ...g, hands: { ...g.hands, c: [] } }, "c").order.length, 2, "out on Mercy");
  assert.equal(join({ ...g, winner: "a" }, "c").order.length, 2, "not after the round");
});

test("running out of time draws and passes, or takes what is waiting", () => {
  const g = rig(deal("room", ["a", "b"]), "a", [find("red", "5")], find("blue", "3"));
  const late = timeout({ ...g, deck: [find("green", "9"), ...g.deck] });
  assert.equal(late.hands.a.length, 2);
  assert.equal(current(late), "b");
  assert.equal(late.last?.late, true);

  const fits = timeout({ ...g, deck: [find("blue", "9"), ...g.deck] });
  assert.equal(fits.hands.a.length, 2, "a drawn card that fits is kept, not played");
  assert.equal(current(fits), "b");

  const wild = find("wild", "+4");
  const pending = { ...g, pending: { by: "b", card: wild, bluff: false } };
  const took = timeout(pending);
  assert.equal(took.hands.a.length, 1 + 4);
  assert.equal(took.pending, null);
});
