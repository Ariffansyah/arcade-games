import { hash, rng } from "./rng.ts";

export const COLOURS = ["red", "yellow", "green", "blue"] as const;
export type Colour = (typeof COLOURS)[number];
export type Card = { colour: Colour | "wild"; face: string };

export const HAND = 7;

const TWICE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "+2"];

export const DECK: Card[] = [
  ...COLOURS.flatMap((colour) => ["0", ...TWICE, ...TWICE].map((face): Card => ({ colour, face }))),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "wild" })),
  ...Array.from({ length: 4 }, (): Card => ({ colour: "wild", face: "+4" })),
];

export type Move = { by: string; act: "play" | "draw" | "pass"; card: number };

export type LastCard = {
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

export const points = (card: number) => {
  const { face } = DECK[card];
  return /^\d$/.test(face) ? Number(face) : face === "wild" || face === "+4" ? 50 : 20;
};

export function deal(
  seed: string,
  order: string[],
  round = 1,
  scores: Record<string, number> = {}
): LastCard {
  const deck = shuffle(
    DECK.map((_, i) => i),
    `${seed}:${round}`
  );
  const hands = Object.fromEntries(
    order.map((id, i) => [id, deck.slice(i * HAND, (i + 1) * HAND)])
  );
  const rest = deck.slice(order.length * HAND);
  // Open on a number so nobody starts the round skipped or drawing.
  const first = rest.findIndex((c) => /^\d$/.test(DECK[c].face));
  const top = rest[first];
  return {
    round,
    seed,
    order,
    hands,
    deck: rest.filter((_, i) => i !== first),
    pile: [top],
    turn: (round - 1) % order.length,
    dir: 1,
    colour: DECK[top].colour as Colour,
    drawn: -1,
    winner: "",
    scores,
    last: null,
    shuffles: 0,
  };
}

export const topCard = (g: LastCard) => DECK[g.pile[g.pile.length - 1]];

export const current = (g: LastCard) => g.order[g.turn];

export function playable(g: LastCard, card: number) {
  if (g.drawn >= 0 && card !== g.drawn) return false;
  const c = DECK[card];
  return c.colour === "wild" || c.colour === g.colour || c.face === topCard(g).face;
}

const seat = (g: LastCard, from: number, steps: number) => {
  const n = g.order.length;
  return (((from + g.dir * steps) % n) + n) % n;
};

function take(g: LastCard, id: string, count: number): LastCard {
  let { deck, pile, shuffles } = g;
  const got: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!deck.length) {
      if (pile.length <= 1) break;
      shuffles++;
      deck = shuffle(pile.slice(0, -1), `${g.seed}:${g.round}:${shuffles}`);
      pile = pile.slice(-1);
    }
    got.push(deck[0]);
    deck = deck.slice(1);
  }
  return {
    ...g,
    deck,
    pile,
    shuffles,
    hands: { ...g.hands, [id]: [...g.hands[id], ...got] },
  };
}

export function play(g: LastCard, card: number, pick?: Colour): LastCard {
  const id = current(g);
  if (g.winner || !g.hands[id].includes(card) || !playable(g, card)) return g;

  const c = DECK[card];
  const hand = g.hands[id].filter((x) => x !== card);
  let next: LastCard = {
    ...g,
    hands: { ...g.hands, [id]: hand },
    pile: [...g.pile, card],
    colour: c.colour === "wild" ? (pick ?? g.colour) : c.colour,
    drawn: -1,
    last: { by: id, act: "play", card },
  };

  if (!hand.length) {
    const won = g.order.reduce(
      (sum, p) => sum + next.hands[p].reduce((s, x) => s + points(x), 0),
      0
    );
    return {
      ...next,
      winner: id,
      scores: { ...g.scores, [id]: (g.scores[id] ?? 0) + won },
    };
  }

  let skip = 0;
  if (c.face === "skip") skip = 1;
  if (c.face === "reverse") {
    next = { ...next, dir: g.dir === 1 ? -1 : 1 };
    if (g.order.length === 2) skip = 1;
  }
  if (c.face === "+2" || c.face === "+4") {
    next = take(next, g.order[seat(next, g.turn, 1)], c.face === "+2" ? 2 : 4);
    skip = 1;
  }
  return { ...next, turn: seat(next, g.turn, 1 + skip) };
}

export const pass = (g: LastCard): LastCard =>
  g.winner
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
  if (g.winner || g.drawn >= 0) return g;
  const next = take(g, id, 1);
  const got =
    next.hands[id].length > g.hands[id].length ? next.hands[id][next.hands[id].length - 1] : -1;
  const moved = { ...next, last: { by: id, act: "draw" as const, card: got } };
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
    winner: order.length === 1 ? order[0] : "",
  };
}
