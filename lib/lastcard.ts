import { hash, rng } from "./rng.ts";

export const COLOURS = ["red", "yellow", "green", "blue"] as const;
export const DARK = ["pink", "teal", "orange", "purple"] as const;
export type Colour = (typeof COLOURS)[number] | (typeof DARK)[number];
export type Card = { colour: Colour | "wild"; face: string };
export type Mode = "classic" | "flip" | "mercy";

export type Rule =
  | "numbers"
  | "uno"
  | "jumpIn"
  | "forcePlay"
  | "noBluffing"
  | "drawToMatch"
  | "stacking"
  | "sevens"
  | "zeros"
  | "mercy"
  | "numberFinish"
  | "deflect"
  | "lastLoses";
export type Rules = Partial<Record<Rule, boolean>>;

export const HAND = 7;

const TWICE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "+2"];

export const DECK: Card[] = [
  ...COLOURS.flatMap((colour) => ["0", ...TWICE, ...TWICE].map((face): Card => ({ colour, face }))),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "wild" })),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "+4" })),
];

// The classic deck plus Wild Draw Six and Wild Draw Ten, so classic cards keep their numbers.
export const NO_MERCY: Card[] = [
  ...DECK,
  ...["+6", "+10"].flatMap((face) =>
    Array.from({ length: 4 }, (): Card => ({ colour: "wild", face }))
  ),
];

export const MERCY = 25;

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const side = (colours: readonly Colour[], actions: string[], wilds: string[]): Card[] => [
  ...colours.flatMap((colour) =>
    [...NUMBERS, ...actions, ...NUMBERS, ...actions].map((face): Card => ({
      colour,
      face,
    }))
  ),
  ...wilds.flatMap((face) => Array.from({ length: 4 }, (): Card => ({ colour: "wild", face }))),
];
const LIGHT = side(COLOURS, ["+1", "reverse", "skip", "flip"], ["wild", "+2"]);
const SHADOW = side(DARK, ["+5", "reverse", "skip-all", "flip"], ["wild", "+colour"]);

// Every light face has a dark face printed on its back. The pairing is fixed, like a printed deck.
export const FLIP = shuffle(
  SHADOW.map((_, i) => i),
  "flip-deck"
).map((d, i) => ({ light: LIGHT[i], dark: SHADOW[d] }));

export type Move = {
  by: string;
  act: "play" | "draw" | "pass" | "accept" | "challenge" | "uno" | "catch";
  card: number;
  to?: string;
  took?: number;
  caught?: boolean;
  out?: string;
};

// A wild draw card waits here until the next player takes it or calls the bluff.
export type Pending = { by: string; card: number; bluff: boolean };

export type LastCard = {
  mode?: Mode;
  dark?: boolean;
  rules?: Rules;
  round: number;
  seed: string;
  order: string[];
  hands: Record<string, number[]>;
  deck: number[];
  pile: number[];
  turn: number;
  dir: 1 | -1;
  colour: Colour;

  drawn: number;
  pending?: Pending | null;
  // The number being laid in a Stack Numbers turn.
  run?: string;
  // Draw cards piled up under Stacking, waiting on whoever can't answer.
  stack?: number;
  // Down to one card without calling it, and catchable until they do.
  uncalled?: string;
  // Play to the loser: who has gone out so far, first one first, and who was left holding cards.
  safe?: string[];
  loser?: string;
  winner: string;
  scores: Record<string, number>;
  last: Move | null;
  shuffles: number;
};

function shuffle(cards: number[], seed: string) {
  const random = rng(hash(seed));
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Side = Pick<LastCard, "mode" | "dark">;

export const faceOf = (g: Side, card: number): Card =>
  g.mode === "flip" ? FLIP[card][g.dark ? "dark" : "light"] : NO_MERCY[card];

// What everyone else sees of a card: its other side in Flip, nothing but the back otherwise.
export const backOf = (g: Side, card: number): Card | null =>
  g.mode === "flip" ? FLIP[card][g.dark ? "light" : "dark"] : null;

export const palette = (g: Side) => (g.dark ? DARK : COLOURS);

const isNumber = (face: string) => /^\d$/.test(face);

export function points(g: Side, card: number) {
  const { colour, face } = faceOf(g, card);
  if (isNumber(face)) return Number(face);
  if (colour !== "wild") return face === "+1" ? 10 : face === "skip-all" ? 30 : 20;
  if (g.mode !== "flip") return 50;
  return face === "wild" ? 40 : face === "+2" ? 50 : 60;
}

export const isWildDraw = (c: Card) => c.colour === "wild" && c.face !== "wild";

const DRAWS: Record<string, number> = { "+1": 1, "+2": 2, "+4": 4, "+5": 5, "+6": 6, "+10": 10 };
const isDraw = (face: string) => !!DRAWS[face] || face === "+colour";

export function deal(
  seed: string,
  order: string[],
  round = 1,
  scores: Record<string, number> = {},
  mode: Mode = "classic",
  rules: Rules = {}
): LastCard {
  const deck = shuffle(
    (mode === "flip" ? FLIP : mode === "mercy" ? NO_MERCY : DECK).map((_, i) => i),
    `${seed}:${round}`
  );
  const hands = Object.fromEntries(
    order.map((id, i) => [id, deck.slice(i * HAND, (i + 1) * HAND)])
  );
  const rest = deck.slice(order.length * HAND);
  // Open on a number so nobody starts the round skipped or drawing.
  const first = rest.findIndex((c) => isNumber(faceOf({ mode }, c).face));
  const top = rest[first];
  return {
    mode,
    dark: false,
    rules,
    round,
    seed,
    order,
    hands,
    deck: rest.filter((_, i) => i !== first),
    pile: [top],
    turn: (round - 1) % order.length,
    dir: 1,
    colour: faceOf({ mode }, top).colour as Colour,
    drawn: -1,
    pending: null,
    winner: "",
    scores,
    last: null,
    shuffles: 0,
  };
}

export const topCard = (g: LastCard) => faceOf(g, g.pile[g.pile.length - 1]);

export const current = (g: LastCard) => g.order[g.turn];

export function playable(g: LastCard, card: number, by = current(g)) {
  const c = faceOf(g, card);
  const top = topCard(g);
  const hand = g.hands[by] ?? [];
  if (g.rules?.numberFinish && hand.length === 1 && hand[0] === card && !isNumber(c.face))
    return false;
  // Jump-In: an exact copy of the top card goes down out of turn.
  if (by !== current(g))
    return (
      !!g.rules?.jumpIn &&
      !g.winner &&
      c.colour !== "wild" &&
      c.colour === top.colour &&
      c.face === top.face
    );
  if (g.pending || (g.drawn >= 0 && card !== g.drawn)) return false;
  if (g.run) return c.face === g.run;
  const fits = c.colour === "wild" || c.colour === g.colour || c.face === top.face;
  if (!fits || !g.stack) return fits;
  const bounce = !!g.rules?.deflect && (c.face === "reverse" || c.face === "skip");
  return bounce || (DRAWS[c.face] ?? 0) >= DRAWS[top.face];
}

const seat = (g: LastCard, from: number, steps: number) => {
  const n = g.order.length;
  return (((from + g.dir * steps) % n) + n) % n;
};

// Draws `count` cards, or with `until` keeps drawing until a card passes it.
function take(g: LastCard, id: string, count: number, until?: (card: number) => boolean): LastCard {
  let { deck, pile, shuffles } = g;
  const got: number[] = [];
  for (let i = 0; until ? true : i < count; i++) {
    if (!deck.length) {
      if (pile.length <= 1) break;
      shuffles++;
      deck = shuffle(pile.slice(0, -1), `${g.seed}:${g.round}:${shuffles}`);
      pile = pile.slice(-1);
    }
    got.push(deck[0]);
    deck = deck.slice(1);
    if (until?.(got[got.length - 1])) break;
  }
  return {
    ...g,
    deck,
    pile,
    shuffles,
    hands: { ...g.hands, [id]: [...g.hands[id], ...got] },
  };
}

const penalty = (g: LastCard, id: string, card: number, extra = 0) => {
  const { face } = faceOf(g, card);
  return face === "+colour"
    ? take(g, id, 0, (x) => faceOf(g, x).colour === g.colour)
    : take(g, id, (DRAWS[face] ?? 0) + extra);
};

const gained = (before: LastCard, after: LastCard, id: string) =>
  after.hands[id].length - before.hands[id].length;

type Say = { by?: string; to?: string; uno?: boolean };

// `by` is who lays the card (someone else is a Jump-In), `to` who a 7 swaps with, and `uno`
// whether they called their last card as they laid the one before it.
export const play = (g: LastCard, card: number, pick?: Colour, say: Say = {}) =>
  spare(retire(lay(g, card, pick, say)));

function lay(g: LastCard, card: number, pick?: Colour, say: Say = {}): LastCard {
  const id = say.by ?? current(g);
  if (g.winner || !g.hands[id]?.includes(card) || !playable(g, card, id)) return g;
  if (id !== current(g)) g = { ...g, turn: g.order.indexOf(id), drawn: -1, run: "" };
  const rules = g.rules ?? {};

  const c = faceOf(g, card);
  const hand = g.hands[id].filter((x) => x !== card);
  const dark = c.face === "flip" ? !g.dark : !!g.dark;
  // A Flip turns the whole table over, so the colour comes from whatever is now face up.
  const shown = faceOf({ mode: g.mode, dark }, card);
  const colours: readonly Colour[] = palette({ dark });
  const held = (k: Colour) =>
    hand.filter((x) => faceOf({ mode: g.mode, dark }, x).colour === k).length;
  let next: LastCard = {
    ...g,
    dark,
    hands: { ...g.hands, [id]: hand },
    pile: [...g.pile, card],
    colour:
      shown.colour !== "wild"
        ? shown.colour
        : pick && colours.includes(pick)
          ? pick
          : colours.reduce((a, b) => (held(b) > held(a) ? b : a)),
    drawn: -1,
    run: "",
    uncalled: rules.uno && hand.length === 1 && !say.uno ? id : g.uncalled,
    last: { by: id, act: "play", card },
  };
  const victim = g.order[seat(next, g.turn, 1)];

  const hit = () => {
    const before = next;
    next = penalty(next, victim, card, g.stack ?? 0);
    next = {
      ...next,
      stack: 0,
      last: { by: id, act: "play", card, to: victim, took: gained(before, next, victim) },
    };
  };

  // Playing to the loser, going out is just another play; `retire` takes the player off after.
  const toLoser = rules.lastLoses && g.order.length + (g.safe?.length ?? 0) > 2;
  if (!hand.length && !toLoser) {
    // Going out on a draw card still makes the next player pick up, and those cards score.
    if (isDraw(c.face)) hit();
    const won = g.order.reduce(
      (sum, p) => sum + next.hands[p].reduce((s, x) => s + points(next, x), 0),
      0
    );
    return {
      ...next,
      winner: id,
      scores: { ...g.scores, [id]: (g.scores[id] ?? 0) + won },
    };
  }

  const seven = rules.sevens && c.face === "7" && hand.length > 0;
  const zero = rules.zeros && c.face === "0" && hand.length > 0;
  if (seven) {
    const others = g.order.filter((p) => p !== id);
    const to =
      say.to && others.includes(say.to)
        ? say.to
        : others.reduce((a, b) => (g.hands[b].length < g.hands[a].length ? b : a));
    next = {
      ...next,
      hands: { ...next.hands, [id]: next.hands[to], [to]: hand },
      last: { by: id, act: "play", card, to },
    };
  }
  if (zero)
    next = {
      ...next,
      hands: {
        ...next.hands,
        ...Object.fromEntries(g.order.map((p, i) => [g.order[seat(next, i, 1)], next.hands[p]])),
      },
    };

  if (rules.stacking && DRAWS[c.face])
    return { ...next, stack: (g.stack ?? 0) + DRAWS[c.face], turn: seat(next, g.turn, 1) };
  // Deflect: under a stack a Reverse sends it back the way it came, a Skip passes it on.
  if (g.stack && (c.face === "reverse" || c.face === "skip")) {
    if (c.face === "reverse") next = { ...next, dir: g.dir === 1 ? -1 : 1 };
    return { ...next, turn: seat(next, g.turn, 1) };
  }

  if (isWildDraw(c) && !rules.noBluffing) {
    const bluff = hand.some((x) => faceOf(g, x).colour === g.colour);
    return {
      ...next,
      pending: { by: id, card, bluff },
      turn: seat(next, g.turn, 1),
    };
  }

  let skip = 0;
  if (c.face === "skip") skip = 1;
  if (c.face === "skip-all") skip = g.order.length - 1;
  if (c.face === "reverse") {
    next = { ...next, dir: g.dir === 1 ? -1 : 1 };
    if (g.order.length === 2) skip = 1;
  }
  if (isDraw(c.face)) {
    hit();
    skip = 1;
  }
  if (
    rules.numbers &&
    !seven &&
    !zero &&
    isNumber(c.face) &&
    hand.some((x) => faceOf(g, x).face === c.face)
  )
    return { ...next, run: c.face };
  return { ...next, turn: seat(next, g.turn, 1 + skip) };
}

// The wild draw stands: pick up and lose the turn.
export function accept(g: LastCard): LastCard {
  if (!g.pending || g.winner) return g;
  const id = current(g);
  const next = penalty(g, id, g.pending.card);
  return spare({
    ...next,
    pending: null,
    turn: seat(g, g.turn, 1),
    last: {
      by: id,
      act: "accept",
      card: g.pending.card,
      to: id,
      took: gained(g, next, id),
    },
  });
}

// Calling the bluff: caught holding the colour, the player who laid it picks up instead and the
// challenger plays on. Played fairly, the challenger picks up two extra and loses the turn.
export function challenge(g: LastCard): LastCard {
  if (!g.pending || g.winner) return g;
  const id = current(g);
  const { by, card, bluff } = g.pending;
  if (bluff) {
    const next = penalty(g, by, card);
    return spare({
      ...next,
      pending: null,
      last: {
        by: id,
        act: "challenge",
        card,
        caught: true,
        to: by,
        took: gained(g, next, by),
      },
    });
  }
  const next = take(penalty(g, id, card), id, 2);
  return spare({
    ...next,
    pending: null,
    turn: seat(g, g.turn, 1),
    last: {
      by: id,
      act: "challenge",
      card,
      caught: false,
      to: id,
      took: gained(g, next, id),
    },
  });
}

export const pass = (g: LastCard): LastCard =>
  g.winner || g.pending || g.stack
    ? g
    : {
        ...g,
        turn: seat(g, g.turn, 1),
        drawn: -1,
        run: "",
        last: { by: current(g), act: "pass", card: -1 },
      };

// One card from the deck (or until one fits, under Draw to Match). If it fits it may be played
// straight away, otherwise the turn moves on. Facing a stack, drawing takes the whole stack.
export function draw(g: LastCard): LastCard {
  const id = current(g);
  if (g.winner || g.drawn >= 0 || g.pending || g.run) return g;
  if (g.stack) {
    const next = take(g, id, g.stack);
    return spare({
      ...next,
      stack: 0,
      turn: seat(g, g.turn, 1),
      last: {
        by: id,
        act: "accept",
        card: g.pile[g.pile.length - 1],
        to: id,
        took: gained(g, next, id),
      },
    });
  }
  const next = take(g, id, 1, g.rules?.drawToMatch ? (x) => playable(g, x) : undefined);
  const took = gained(g, next, id);
  const got = took ? next.hands[id][next.hands[id].length - 1] : -1;
  const moved = { ...next, last: { by: id, act: "draw" as const, card: got, to: id, took } };
  if (got < 0 || !playable(moved, got)) return spare({ ...moved, turn: seat(g, g.turn, 1) });
  return g.rules?.forcePlay ? play({ ...moved, drawn: got }, got) : spare({ ...moved, drawn: got });
}

export const catchable = (g: LastCard) =>
  g.rules?.uno && !g.winner && g.uncalled && g.hands[g.uncalled]?.length === 1 ? g.uncalled : "";

export const callLast = (g: LastCard, id: string): LastCard =>
  catchable(g) === id ? { ...g, uncalled: "", last: { by: id, act: "uno", card: -1 } } : g;

// Caught on one card without calling it: pick up two.
export function catchOut(g: LastCard, by: string): LastCard {
  const id = catchable(g);
  if (!id || id === by || !g.order.includes(by)) return g;
  const next = take(g, id, 2);
  return spare({
    ...next,
    uncalled: "",
    last: { by, act: "catch", card: -1, to: id, took: gained(g, next, id) },
  });
}

function drop(g: LastCard, i: number): LastCard {
  const order = g.order.filter((_, k) => k !== i);
  const n = order.length;
  const turn = g.turn !== i ? g.turn - (g.turn > i ? 1 : 0) : g.dir === 1 ? i % n : (i - 1 + n) % n;
  return { ...g, order, turn, winner: n === 1 ? order[0] : "" };
}

// Whoever is up has left the room: their hand goes with them, and the last one sitting wins.
export const leave = (g: LastCard): LastCard =>
  g.winner || g.order.length < 2 ? g : { ...drop(g, g.turn), drawn: -1, pending: null, run: "" };

// Play to the loser: whoever runs out is safe, and the first one out scores the round. Play goes
// on until one player is left holding cards.
function retire(g: LastCard): LastCard {
  const i = g.rules?.lastLoses && !g.winner ? g.order.findIndex((p) => !g.hands[p].length) : -1;
  if (i < 0) return g;
  const id = g.order[i];
  const safe = [...(g.safe ?? []), id];
  const won = g.order.reduce((sum, p) => sum + g.hands[p].reduce((s, x) => s + points(g, x), 0), 0);
  const scores = safe.length === 1 ? { ...g.scores, [id]: (g.scores[id] ?? 0) + won } : g.scores;
  const out = drop({ ...g, safe, scores, drawn: -1 }, i);
  return out.winner ? { ...out, winner: safe[0], loser: out.order[0] } : out;
}

// Mercy: a hand of 25 or more is out of the round, and its cards go under the deck.
function spare(g: LastCard): LastCard {
  const i = g.rules?.mercy && !g.winner ? g.order.findIndex((p) => g.hands[p].length >= MERCY) : -1;
  if (i < 0) return g;
  const id = g.order[i];
  const out = drop({ ...g, deck: [...g.deck, ...g.hands[id]], hands: { ...g.hands, [id]: [] } }, i);
  return spare({
    ...out,
    ...(i === g.turn && { drawn: -1, run: "" }),
    last: g.last && { ...g.last, out: id },
  });
}
