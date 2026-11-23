import { hash, rng } from "./rng.ts";

export const COLOURS = ["red", "yellow", "green", "blue"] as const;
export const DARK = ["pink", "teal", "orange", "purple"] as const;
export type Colour = (typeof COLOURS)[number] | (typeof DARK)[number];
export type Card = { colour: Colour | "wild"; face: string };
export type Mode = "classic" | "flip";

export const HAND = 7;

const TWICE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "+2"];

export const DECK: Card[] = [
  ...COLOURS.flatMap((colour) => ["0", ...TWICE, ...TWICE].map((face): Card => ({ colour, face }))),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "wild" })),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "+4" })),
];

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
  act: "play" | "draw" | "pass" | "accept" | "challenge";
  card: number;
  to?: string;
  took?: number;
  caught?: boolean;
};

// A wild draw card waits here until the next player takes it or calls the bluff.
export type Pending = { by: string; card: number; bluff: boolean };

export type LastCard = {
  mode?: Mode;
  dark?: boolean;
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
  g.mode === "flip" ? FLIP[card][g.dark ? "dark" : "light"] : DECK[card];

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

const DRAWS: Record<string, number> = { "+1": 1, "+2": 2, "+4": 4, "+5": 5 };

export function deal(
  seed: string,
  order: string[],
  round = 1,
  scores: Record<string, number> = {},
  mode: Mode = "classic"
): LastCard {
  const deck = shuffle(
    (mode === "flip" ? FLIP : DECK).map((_, i) => i),
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

export function playable(g: LastCard, card: number) {
  if (g.pending || (g.drawn >= 0 && card !== g.drawn)) return false;
  const c = faceOf(g, card);
  return c.colour === "wild" || c.colour === g.colour || c.face === topCard(g).face;
}

const seat = (g: LastCard, from: number, steps: number) => {
  const n = g.order.length;
  return (((from + g.dir * steps) % n) + n) % n;
};

// Draws `count` cards, or with `until` keeps drawing until that colour turns up.
function take(g: LastCard, id: string, count: number, until?: Colour): LastCard {
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
    if (until && faceOf(g, got[got.length - 1]).colour === until) break;
  }
  return {
    ...g,
    deck,
    pile,
    shuffles,
    hands: { ...g.hands, [id]: [...g.hands[id], ...got] },
  };
}

const penalty = (g: LastCard, id: string, card: number) => {
  const { face } = faceOf(g, card);
  return face === "+colour" ? take(g, id, 0, g.colour) : take(g, id, DRAWS[face] ?? 0);
};

const gained = (before: LastCard, after: LastCard, id: string) =>
  after.hands[id].length - before.hands[id].length;

export function play(g: LastCard, card: number, pick?: Colour): LastCard {
  const id = current(g);
  if (g.winner || !g.hands[id].includes(card) || !playable(g, card)) return g;

  const c = faceOf(g, card);
  const hand = g.hands[id].filter((x) => x !== card);
  const dark = c.face === "flip" ? !g.dark : !!g.dark;
  // A Flip turns the whole table over, so the colour comes from whatever is now face up.
  const shown = faceOf({ mode: g.mode, dark }, card);
  const colours = palette({ dark });
  let next: LastCard = {
    ...g,
    dark,
    hands: { ...g.hands, [id]: hand },
    pile: [...g.pile, card],
    colour:
      shown.colour !== "wild"
        ? shown.colour
        : pick && (colours as readonly string[]).includes(pick)
          ? pick
          : colours[0],
    drawn: -1,
    last: { by: id, act: "play", card },
  };
  const victim = g.order[seat(next, g.turn, 1)];

  const hit = () => {
    const before = next;
    next = penalty(next, victim, card);
    next = {
      ...next,
      last: { by: id, act: "play", card, to: victim, took: gained(before, next, victim) },
    };
  };

  if (!hand.length) {
    // Going out on a draw card still makes the next player pick up, and those cards score.
    if (DRAWS[c.face] || c.face === "+colour") hit();
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

  if (isWildDraw(c)) {
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
  if (DRAWS[c.face]) {
    hit();
    skip = 1;
  }
  return { ...next, turn: seat(next, g.turn, 1 + skip) };
}

// The wild draw stands: pick up and lose the turn.
export function accept(g: LastCard): LastCard {
  if (!g.pending || g.winner) return g;
  const id = current(g);
  const next = penalty(g, id, g.pending.card);
  return {
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
  };
}

// Calling the bluff: caught holding the colour, the player who laid it picks up instead and the
// challenger plays on. Played fairly, the challenger picks up two extra and loses the turn.
export function challenge(g: LastCard): LastCard {
  if (!g.pending || g.winner) return g;
  const id = current(g);
  const { by, card, bluff } = g.pending;
  if (bluff) {
    const next = penalty(g, by, card);
    return {
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
    };
  }
  const next = take(penalty(g, id, card), id, 2);
  return {
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
  };
}

export const pass = (g: LastCard): LastCard =>
  g.winner || g.pending
    ? g
    : {
        ...g,
        turn: seat(g, g.turn, 1),
        drawn: -1,
        last: { by: current(g), act: "pass", card: -1 },
      };

// One card from the deck. If it fits it may be played straight away, otherwise the turn moves on.
export function draw(g: LastCard): LastCard {
  const id = current(g);
  if (g.winner || g.drawn >= 0 || g.pending) return g;
  const next = take(g, id, 1);
  const got =
    next.hands[id].length > g.hands[id].length ? next.hands[id][next.hands[id].length - 1] : -1;
  const moved = {
    ...next,
    last: { by: id, act: "draw" as const, card: got, to: id, took: 1 },
  };
  if (got >= 0 && playable({ ...moved, drawn: -1 }, got)) return { ...moved, drawn: got };
  return { ...moved, turn: seat(g, g.turn, 1), drawn: -1 };
}

// Whoever is up has left the room: their hand goes with them, and the last one sitting wins.
export function leave(g: LastCard): LastCard {
  const order = g.order.filter((_, i) => i !== g.turn);
  if (!order.length || g.winner) return g;
  const turn = g.dir === 1 ? g.turn % order.length : (g.turn - 1 + order.length) % order.length;
  return {
    ...g,
    order,
    turn,
    drawn: -1,
    pending: null,
    winner: order.length === 1 ? order[0] : "",
  };
}
