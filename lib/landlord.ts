import { hash, rng } from "./rng.ts";

export const START_CASH = 1500;
export const SALARY = 200;
export const BAIL = 50;
export const JAIL = 10;
export const HOTEL = 5;

export type Kind =
  "go" | "prop" | "rail" | "util" | "tax" | "glitch" | "bonus" | "jail" | "park" | "arrest";

export type Space = {
  name: string;
  kind: Kind;
  group?: number;
  price?: number;
  house?: number;
  rent?: number[];
  tax?: number;
};

export const GROUPS = [
  "#a0673a",
  "#7dd3fc",
  "#ff2d95",
  "#fb923c",
  "#ff2e63",
  "#ffc83d",
  "#39ff88",
  "#5b7bff",
];

const prop = (
  name: string,
  group: number,
  price: number,
  house: number,
  rent: number[]
): Space => ({
  name,
  kind: "prop",
  group,
  price,
  house,
  rent,
});
const rail = (name: string): Space => ({ name, kind: "rail", price: 200 });
const util = (name: string): Space => ({ name, kind: "util", price: 150 });

export const BOARD: Space[] = [
  { name: "GO", kind: "go" },
  prop("Pixel Alley", 0, 60, 50, [2, 10, 30, 90, 160, 250]),
  { name: "Bonus", kind: "bonus" },
  prop("Byte Lane", 0, 60, 50, [4, 20, 60, 180, 320, 450]),
  { name: "Income Tax", kind: "tax", tax: 200 },
  rail("Night Train"),
  prop("Joystick Row", 1, 100, 50, [6, 30, 90, 270, 400, 550]),
  { name: "Glitch", kind: "glitch" },
  prop("Coin Slot St", 1, 100, 50, [6, 30, 90, 270, 400, 550]),
  prop("Cabinet Ave", 1, 120, 50, [8, 40, 100, 300, 450, 600]),
  { name: "Jail", kind: "jail" },
  prop("Neon Strip", 2, 140, 100, [10, 50, 150, 450, 625, 750]),
  util("Power Grid"),
  prop("Laser Lane", 2, 140, 100, [10, 50, 150, 450, 625, 750]),
  prop("Arcade Blvd", 2, 160, 100, [12, 60, 180, 500, 700, 900]),
  rail("Neon Express"),
  prop("Synth Way", 3, 180, 100, [14, 70, 200, 550, 750, 950]),
  { name: "Bonus", kind: "bonus" },
  prop("Cassette Ct", 3, 180, 100, [14, 70, 200, 550, 750, 950]),
  prop("Vinyl Vale", 3, 200, 100, [16, 80, 220, 600, 800, 1000]),
  { name: "Free Parking", kind: "park" },
  prop("Turbo Drive", 4, 220, 150, [18, 90, 250, 700, 875, 1050]),
  { name: "Glitch", kind: "glitch" },
  prop("Rocket Road", 4, 220, 150, [18, 90, 250, 700, 875, 1050]),
  prop("Comet Circle", 4, 240, 150, [20, 100, 300, 750, 925, 1100]),
  rail("Hover Line"),
  prop("Glitch Gardens", 5, 260, 150, [22, 110, 330, 800, 975, 1150]),
  prop("Sprite Square", 5, 260, 150, [22, 110, 330, 800, 975, 1150]),
  util("Coolant Works"),
  prop("Polygon Park", 5, 280, 150, [24, 120, 360, 850, 1025, 1200]),
  { name: "Go to Jail", kind: "arrest" },
  prop("Mainframe Mile", 6, 300, 200, [26, 130, 390, 900, 1100, 1275]),
  prop("Circuit Court", 6, 300, 200, [26, 130, 390, 900, 1100, 1275]),
  { name: "Bonus", kind: "bonus" },
  prop("Silicon St", 6, 320, 200, [28, 150, 450, 1000, 1200, 1400]),
  rail("Mag Rail"),
  { name: "Glitch", kind: "glitch" },
  prop("Hi-Score Heights", 7, 350, 200, [35, 175, 500, 1100, 1300, 1500]),
  { name: "Luxury Tax", kind: "tax", tax: 100 },
  prop("Boss Level Blvd", 7, 400, 200, [50, 200, 600, 1400, 1700, 2000]),
];

export type Card = {
  text: string;
  cash?: number;
  to?: number;
  back?: number;
  jail?: true;
  each?: number;
  repairs?: [number, number];
  nearest?: "rail" | "util";
  free?: true;
};

export type Deck = "glitch" | "bonus";

export const GLITCH: Card[] = [
  { text: "Warp to GO. Collect $200", to: 0 },
  { text: "Warp to Boss Level Blvd", to: 39 },
  { text: "Warp to Comet Circle. Collect $200 if you pass GO", to: 24 },
  { text: "Warp to Neon Strip. Collect $200 if you pass GO", to: 11 },
  { text: "Warp to the nearest train line. If it is owned, pay double rent", nearest: "rail" },
  { text: "Warp to the nearest train line. If it is owned, pay double rent", nearest: "rail" },
  { text: "Warp to the nearest utility. If it is owned, pay 10× the dice", nearest: "util" },
  { text: "Ad revenue pays out: collect $50", cash: 50 },
  { text: "Cheat code: get out of jail free. Keep this card until you need it", free: true },
  { text: "Lag spike: go back 3 spaces", back: 3 },
  { text: "Busted for cheat codes: go straight to jail", jail: true },
  { text: "Firmware patch: pay $25 a house, $100 a hotel", repairs: [25, 100] },
  { text: "Overclocking fine: pay $15", cash: -15 },
  { text: "Ride the Night Train. Collect $200 if you pass GO", to: 5 },
  { text: "Elected guild master: pay every player $50", each: -50 },
  { text: "Speedrun prize: collect $150", cash: 150 },
];

export const BONUS: Card[] = [
  { text: "Warp to GO. Collect $200", to: 0 },
  { text: "Bank glitch in your favour: collect $200", cash: 200 },
  { text: "Joystick repair: pay $50", cash: -50 },
  { text: "Sold an old cartridge: collect $50", cash: 50 },
  { text: "Save state: get out of jail free. Keep this card until you need it", free: true },
  { text: "Caught on camera: go straight to jail", jail: true },
  { text: "Holiday tournament pays out: collect $100", cash: 100 },
  { text: "Token refund: collect $20", cash: 20 },
  { text: "It's your birthday: collect $10 from every player", each: 10 },
  { text: "Season pass matures: collect $100", cash: 100 },
  { text: "Arcade repairs: pay $100", cash: -100 },
  { text: "Coding bootcamp fees: pay $50", cash: -50 },
  { text: "Beta tester fee: collect $25", cash: 25 },
  { text: "Neon sign repairs: pay $40 a house, $115 a hotel", repairs: [40, 115] },
  { text: "Second place in a high-score contest: collect $10", cash: 10 },
  { text: "Inherit a cabinet collection: collect $100", cash: 100 },
];

export const CARDS: Record<Deck, Card[]> = { glitch: GLITCH, bonus: BONUS };

// A deed nobody bought goes round the table: raise or drop out, last one standing pays.
export type Auction = {
  space: number;
  bid: number;
  leader: string;
  bidders: string[];
  turn: number;
};

// `cash` above zero is paid by the proposer, below zero by the other side.
export type Trade = { from: string; to: string; give: number[]; get: number[]; cash: number };

export type Landlord = {
  round: number;
  seed: string;
  order: string[];
  turn: number;

  pos: Record<string, number>;
  cash: Record<string, number>;
  owner: Record<number, string>;
  houses: Record<number, number>;

  jail: Record<string, number>;
  out: string[];

  decks: Record<Deck, number[]>;
  free: Record<string, Deck[]>;
  drew: { deck: Deck; card: number; by: string; n: number } | null;
  mortgaged: Record<number, boolean>;
  auction: Auction | null;
  trade: Trade | null;

  dice: [number, number];
  throws: number;
  doubles: number;
  canRoll: boolean;
  offer: number;
  log: string[];
  winner: string;
};

function shuffle(n: number, seed: string) {
  const random = rng(hash(seed));
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const newLandlord = (seed: string, order: string[], round = 1): Landlord => ({
  round,
  seed: `${seed}:${round}`,
  order,
  turn: 0,
  pos: Object.fromEntries(order.map((id) => [id, 0])),
  cash: Object.fromEntries(order.map((id) => [id, START_CASH])),
  owner: {},
  houses: {},
  jail: {},
  out: [],
  decks: {
    glitch: shuffle(GLITCH.length, `${seed}:${round}:glitch`),
    bonus: shuffle(BONUS.length, `${seed}:${round}:bonus`),
  },
  free: {},
  drew: null,
  mortgaged: {},
  auction: null,
  trade: null,
  dice: [1, 1],
  throws: 0,
  doubles: 0,
  canRoll: true,
  offer: -1,
  log: [],
  winner: "",
});

export const current = (g: Landlord) => g.order[g.turn];
export const active = (g: Landlord) => g.order.filter((id) => !g.out.includes(id));

// Whoever the table is waiting on: the bidder in an auction, the other side of a trade, or
// the player whose turn it is.
export const actor = (g: Landlord) =>
  g.auction ? g.auction.bidders[g.auction.turn] : g.trade ? g.trade.to : current(g);

const busy = (g: Landlord) => !!(g.winner || g.auction || g.trade);

const note = (g: Landlord, line: string): Landlord => ({ ...g, log: [...g.log, line].slice(-8) });

const ownedBy = (g: Landlord, id: string) =>
  BOARD.map((_, i) => i).filter((i) => g.owner[i] === id);

export const ownsGroup = (g: Landlord, id: string, group: number) =>
  BOARD.every((s, i) => s.group !== group || g.owner[i] === id);

export function rentFor(g: Landlord, i: number, roll: number) {
  const space = BOARD[i];
  const owner = g.owner[i];
  if (!owner || g.mortgaged[i]) return 0;
  if (space.kind === "rail")
    return 25 * 2 ** (ownedBy(g, owner).filter((j) => BOARD[j].kind === "rail").length - 1);
  if (space.kind === "util")
    return (ownedBy(g, owner).filter((j) => BOARD[j].kind === "util").length === 2 ? 10 : 4) * roll;
  const built = g.houses[i] ?? 0;
  if (built) return space.rent![built];
  return space.rent![0] * (ownsGroup(g, owner, space.group!) ? 2 : 1);
}

export const mortgageValue = (i: number) => BOARD[i].price! / 2;
export const liftCost = (i: number) => Math.round(mortgageValue(i) * 1.1);

export function worth(g: Landlord, id: string) {
  return ownedBy(g, id).reduce(
    (sum, i) =>
      sum +
      (g.mortgaged[i] ? mortgageValue(i) : BOARD[i].price!) +
      (g.houses[i] ?? 0) * (BOARD[i].house ?? 0),
    g.cash[id] ?? 0
  );
}

function settle(g: Landlord): Landlord {
  const left = active(g);
  return left.length === 1 && !g.winner ? note({ ...g, winner: left[0] }, `${left[0]} wins!`) : g;
}

// Short of cash, buildings go back to the bank at half what they cost, priciest first, then
// deeds are mortgaged, cheapest first.
function liquidate(g: Landlord, id: string, need: number): Landlord {
  const houses = { ...g.houses };
  const cash = { ...g.cash };
  const mortgaged = { ...g.mortgaged };
  const built = ownedBy(g, id)
    .filter((i) => houses[i])
    .sort((a, b) => BOARD[b].house! - BOARD[a].house!);
  for (const i of built)
    while (cash[id] < need && houses[i]) {
      houses[i]--;
      cash[id] += BOARD[i].house! / 2;
    }
  const deeds = ownedBy(g, id)
    .filter((i) => !mortgaged[i])
    .sort((a, b) => BOARD[a].price! - BOARD[b].price!);
  for (const i of deeds) {
    if (cash[id] >= need) break;
    mortgaged[i] = true;
    cash[id] += mortgageValue(i);
  }
  return { ...g, houses, cash, mortgaged };
}

// Whatever is left, and every deed, goes to whoever they owed — or back to the bank.
function bankrupt(g: Landlord, id: string, to = ""): Landlord {
  const owner = { ...g.owner };
  const houses = { ...g.houses };
  const mortgaged = { ...g.mortgaged };
  for (const i of ownedBy(g, id)) {
    delete houses[i];
    if (to) owner[i] = to;
    else {
      delete owner[i];
      delete mortgaged[i];
    }
  }
  const cash = { ...g.cash, [id]: 0 };
  if (to) cash[to] += g.cash[id];
  const jail = { ...g.jail };
  delete jail[id];
  // Jail cards go back under their decks.
  const decks = { ...g.decks };
  for (const deck of g.free[id] ?? [])
    decks[deck] = [...decks[deck], CARDS[deck].findIndex((c) => c.free)];
  return settle(
    note(
      {
        ...g,
        cash,
        owner,
        houses,
        mortgaged,
        jail,
        decks,
        free: { ...g.free, [id]: [] },
        out: [...g.out, id],
      },
      `${id} is bankrupt${to ? ` to ${to}` : ""}`
    )
  );
}

function charge(g: Landlord, id: string, amount: number, to = ""): Landlord {
  const next = g.cash[id] < amount ? liquidate(g, id, amount) : g;
  if (next.cash[id] < amount) return bankrupt(next, id, to);
  const cash = { ...next.cash, [id]: next.cash[id] - amount };
  if (to) cash[to] += amount;
  return { ...next, cash };
}

function arrest(g: Landlord, id: string): Landlord {
  return note(
    {
      ...g,
      pos: { ...g.pos, [id]: JAIL },
      jail: { ...g.jail, [id]: 0 },
      canRoll: false,
      doubles: 0,
    },
    `${id} goes to jail`
  );
}

type Boost = "rail" | "util";

function goTo(
  g: Landlord,
  id: string,
  to: number,
  roll: number,
  passGo = true,
  boost?: Boost
): Landlord {
  const from = g.pos[id];
  let next: Landlord = { ...g, pos: { ...g.pos, [id]: to } };
  if (passGo && to < from)
    next = note(
      { ...next, cash: { ...next.cash, [id]: next.cash[id] + SALARY } },
      `${id} passes GO`
    );
  return land(next, id, roll, boost);
}

// Cards come off the top in order and go back underneath, like a real deck. A jail card stays
// with whoever drew it until it is used.
function draw(g: Landlord, id: string, deck: Deck, roll: number): Landlord {
  const [top, ...rest] = g.decks[deck];
  const card = CARDS[deck][top];
  let next = note(
    {
      ...g,
      decks: { ...g.decks, [deck]: card.free ? rest : [...rest, top] },
      drew: { deck, card: top, by: id, n: (g.drew?.n ?? 0) + 1 },
    },
    `${id}: ${card.text}`
  );
  if (card.free) next = { ...next, free: { ...next.free, [id]: [...(next.free[id] ?? []), deck] } };
  if (card.nearest) {
    let to = next.pos[id];
    do to = (to + 1) % 40;
    while (BOARD[to].kind !== card.nearest);
    next = goTo(next, id, to, roll, true, card.nearest);
  }
  if (card.cash)
    next =
      card.cash > 0
        ? { ...next, cash: { ...next.cash, [id]: next.cash[id] + card.cash } }
        : charge(next, id, -card.cash);
  if (card.to !== undefined) next = goTo(next, id, card.to, roll);
  if (card.back) next = goTo(next, id, (next.pos[id] + 40 - card.back) % 40, roll, false);
  if (card.jail) next = arrest(next, id);
  if (card.each)
    for (const other of active(next).filter((p) => p !== id))
      next =
        card.each > 0 ? charge(next, other, card.each, id) : charge(next, id, -card.each, other);
  if (card.repairs) {
    const [house, hotel] = card.repairs;
    const bill = ownedBy(next, id).reduce((sum, i) => {
      const built = next.houses[i] ?? 0;
      return sum + (built === HOTEL ? hotel : built * house);
    }, 0);
    if (bill) next = charge(next, id, bill);
  }
  return next;
}

function land(g: Landlord, id: string, roll: number, boost?: Boost): Landlord {
  const i = g.pos[id];
  const space = BOARD[i];
  if (space.price) {
    const owner = g.owner[i];
    if (!owner) return { ...g, offer: i };
    if (owner === id || g.mortgaged[i]) return g;
    const rent = boost === "util" ? 10 * roll : rentFor(g, i, roll) * (boost === "rail" ? 2 : 1);
    return charge(note(g, `${id} pays $${rent} rent to ${owner}`), id, rent, owner);
  }
  if (space.tax) return charge(note(g, `${id} pays $${space.tax} ${space.name}`), id, space.tax);
  if (space.kind === "glitch") return draw(g, id, "glitch", roll);
  if (space.kind === "bonus") return draw(g, id, "bonus", roll);
  if (space.kind === "arrest") return arrest(g, id);
  return g;
}

// A roll with the dice already known, so tests can pick them.
export function step(g: Landlord, dice: [number, number]): Landlord {
  const id = current(g);
  if (busy(g) || !g.canRoll || g.offer >= 0) return g;
  const sum = dice[0] + dice[1];
  const double = dice[0] === dice[1];
  let next: Landlord = { ...g, dice, throws: g.throws + 1 };

  if (id in g.jail) {
    const jail = { ...g.jail };
    if (!double && jail[id] < 2) {
      jail[id]++;
      return note({ ...next, jail, canRoll: false }, `${id} stays in jail`);
    }
    delete jail[id];
    next = { ...next, jail, canRoll: false, doubles: 0 };
    if (!double) next = charge(note(next, `${id} pays $${BAIL} bail`), id, BAIL);
    if (next.out.includes(id)) return end(next);
  } else if (double && g.doubles === 2) {
    return arrest(note(next, `${id} rolls a third double`), id);
  } else {
    next = { ...next, doubles: double ? g.doubles + 1 : 0, canRoll: double };
  }
  next = goTo(next, id, (g.pos[id] + sum) % 40, sum);
  return next.out.includes(id) ? end(next) : next;
}

export const roll = (g: Landlord): Landlord => {
  const random = rng(hash(`${g.seed}:${g.throws}`));
  return step(g, [1 + Math.floor(random() * 6), 1 + Math.floor(random() * 6)]);
};

export function buy(g: Landlord): Landlord {
  const id = current(g);
  const price = BOARD[g.offer]?.price ?? Infinity;
  if (busy(g) || g.offer < 0 || g.cash[id] < price) return g;
  return note(
    {
      ...g,
      cash: { ...g.cash, [id]: g.cash[id] - price },
      owner: { ...g.owner, [g.offer]: id },
      offer: -1,
    },
    `${id} buys ${BOARD[g.offer].name}`
  );
}

// Passing on a deed puts it up for auction, starting with whoever passed.
export function decline(g: Landlord): Landlord {
  if (busy(g) || g.offer < 0) return g;
  const left = active(g);
  const start = left.indexOf(current(g));
  const bidders = [...left.slice(start), ...left.slice(0, start)];
  return note(
    { ...g, offer: -1, auction: { space: g.offer, bid: 0, leader: "", bidders, turn: 0 } },
    `${BOARD[g.offer].name} goes up for auction`
  );
}

function hammer(g: Landlord): Landlord {
  const a = g.auction!;
  const name = BOARD[a.space].name;
  if (!a.bidders.length) return note({ ...g, auction: null }, `Nobody bids on ${name}`);
  if (a.bidders.length > 1 || a.leader !== a.bidders[0]) return g;
  return note(
    {
      ...g,
      auction: null,
      cash: { ...g.cash, [a.leader]: g.cash[a.leader] - a.bid },
      owner: { ...g.owner, [a.space]: a.leader },
    },
    `${a.leader} wins ${name} at auction for $${a.bid}`
  );
}

export function bid(g: Landlord, amount: number): Landlord {
  const a = g.auction;
  if (!a || g.winner) return g;
  const id = a.bidders[a.turn];
  if (!Number.isInteger(amount) || amount <= a.bid || amount > g.cash[id]) return g;
  return hammer({
    ...g,
    auction: { ...a, bid: amount, leader: id, turn: (a.turn + 1) % a.bidders.length },
  });
}

export function fold(g: Landlord): Landlord {
  const a = g.auction;
  if (!a || g.winner) return g;
  const bidders = a.bidders.filter((_, k) => k !== a.turn);
  return hammer({
    ...g,
    auction: { ...a, bidders, turn: bidders.length ? a.turn % bidders.length : 0 },
  });
}

const builtGroup = (g: Landlord, i: number) =>
  BOARD[i].group !== undefined &&
  BOARD.some((s, j) => s.group === BOARD[i].group && (g.houses[j] ?? 0) > 0);

export const canMortgage = (g: Landlord, i: number) =>
  !busy(g) && g.owner[i] === current(g) && !g.mortgaged[i] && !builtGroup(g, i);

export function mortgage(g: Landlord, i: number): Landlord {
  if (!canMortgage(g, i)) return g;
  const id = current(g);
  return note(
    {
      ...g,
      mortgaged: { ...g.mortgaged, [i]: true },
      cash: { ...g.cash, [id]: g.cash[id] + mortgageValue(i) },
    },
    `${id} mortgages ${BOARD[i].name}`
  );
}

export const canLift = (g: Landlord, i: number) =>
  !busy(g) && g.owner[i] === current(g) && !!g.mortgaged[i] && g.cash[current(g)] >= liftCost(i);

export function lift(g: Landlord, i: number): Landlord {
  if (!canLift(g, i)) return g;
  const id = current(g);
  const mortgaged = { ...g.mortgaged };
  delete mortgaged[i];
  return note(
    { ...g, mortgaged, cash: { ...g.cash, [id]: g.cash[id] - liftCost(i) } },
    `${id} pays off the mortgage on ${BOARD[i].name}`
  );
}

export function canBuild(g: Landlord, i: number) {
  const id = current(g);
  const space = BOARD[i];
  if (
    busy(g) ||
    space.kind !== "prop" ||
    g.owner[i] !== id ||
    !ownsGroup(g, id, space.group!) ||
    BOARD.some((s, j) => s.group === space.group && g.mortgaged[j])
  )
    return false;
  const built = g.houses[i] ?? 0;
  const lowest = Math.min(
    ...BOARD.map((s, j) => (s.group === space.group ? (g.houses[j] ?? 0) : HOTEL))
  );
  // Build evenly: nothing gets a second house while a neighbour has none.
  return built < HOTEL && built === lowest && g.cash[id] >= space.house!;
}

export function build(g: Landlord, i: number): Landlord {
  if (!canBuild(g, i)) return g;
  const id = current(g);
  const built = (g.houses[i] ?? 0) + 1;
  return note(
    {
      ...g,
      cash: { ...g.cash, [id]: g.cash[id] - BOARD[i].house! },
      houses: { ...g.houses, [i]: built },
    },
    `${id} builds ${built === HOTEL ? "a hotel" : "a house"} on ${BOARD[i].name}`
  );
}

// Houses come back down evenly too, at half what they cost.
export function canSell(g: Landlord, i: number) {
  const built = g.houses[i] ?? 0;
  if (busy(g) || g.owner[i] !== current(g) || !built) return false;
  return BOARD.every((s, j) => s.group !== BOARD[i].group || (g.houses[j] ?? 0) <= built);
}

export function sell(g: Landlord, i: number): Landlord {
  if (!canSell(g, i)) return g;
  const id = current(g);
  return note(
    {
      ...g,
      houses: { ...g.houses, [i]: g.houses[i] - 1 },
      cash: { ...g.cash, [id]: g.cash[id] + BOARD[i].house! / 2 },
    },
    `${id} sells a building on ${BOARD[i].name}`
  );
}

export const tradeable = (g: Landlord, i: number) => !!g.owner[i] && !builtGroup(g, i);

const fits = (g: Landlord, t: Trade) =>
  t.from !== t.to &&
  active(g).includes(t.to) &&
  t.give.every((i) => g.owner[i] === t.from && tradeable(g, i)) &&
  t.get.every((i) => g.owner[i] === t.to && tradeable(g, i)) &&
  (t.cash >= 0 ? g.cash[t.from] >= t.cash : g.cash[t.to] >= -t.cash) &&
  (t.give.length > 0 || t.get.length > 0 || t.cash !== 0);

export function propose(g: Landlord, t: Trade): Landlord {
  if (busy(g) || g.offer >= 0 || t.from !== current(g) || !fits(g, t)) return g;
  return note({ ...g, trade: t }, `${t.from} offers ${t.to} a trade`);
}

export function answer(g: Landlord, yes: boolean): Landlord {
  const t = g.trade;
  if (!t || g.winner) return g;
  if (!yes || !fits(g, t)) return note({ ...g, trade: null }, `${t.to} turns the trade down`);
  const owner = { ...g.owner };
  for (const i of t.give) owner[i] = t.to;
  for (const i of t.get) owner[i] = t.from;
  return note(
    {
      ...g,
      trade: null,
      owner,
      cash: { ...g.cash, [t.from]: g.cash[t.from] - t.cash, [t.to]: g.cash[t.to] + t.cash },
    },
    `${t.from} and ${t.to} make a deal`
  );
}

export const withdraw = (g: Landlord): Landlord =>
  g.trade ? note({ ...g, trade: null }, `${g.trade.from} withdraws the offer`) : g;

export function jailCard(g: Landlord): Landlord {
  const id = current(g);
  const [deck, ...rest] = g.free[id] ?? [];
  if (busy(g) || !(id in g.jail) || !g.canRoll || !deck) return g;
  const jail = { ...g.jail };
  delete jail[id];
  return note(
    {
      ...g,
      jail,
      free: { ...g.free, [id]: rest },
      decks: { ...g.decks, [deck]: [...g.decks[deck], CARDS[deck].findIndex((c) => c.free)] },
    },
    `${id} uses a get-out-of-jail card`
  );
}

export function bail(g: Landlord): Landlord {
  const id = current(g);
  if (busy(g) || !(id in g.jail) || !g.canRoll || g.cash[id] < BAIL) return g;
  const jail = { ...g.jail };
  delete jail[id];
  return note(
    { ...g, jail, cash: { ...g.cash, [id]: g.cash[id] - BAIL } },
    `${id} pays $${BAIL} bail`
  );
}

export function end(g: Landlord): Landlord {
  if (busy(g) || (g.canRoll && !g.out.includes(current(g))) || g.offer >= 0) return g;
  let turn = g.turn;
  do turn = (turn + 1) % g.order.length;
  while (g.out.includes(g.order[turn]));
  return { ...g, turn, canRoll: true, doubles: 0, offer: -1 };
}

// Whoever the table is waiting on has left the room. A bidder drops out, a trade is refused,
// and a player whose turn it is hands everything back to the bank.
export function leave(g: Landlord): Landlord {
  if (g.winner) return g;
  if (g.auction) return fold(g);
  if (g.trade) return answer(g, false);
  return end(bankrupt({ ...g, offer: -1 }, current(g)));
}

// Called off early: the richest player on paper wins.
export function finish(g: Landlord): Landlord {
  if (g.winner) return g;
  g = { ...g, auction: null, trade: null };
  const winner = active(g).reduce((a, b) => (worth(g, b) > worth(g, a) ? b : a));
  return note({ ...g, winner }, `${winner} wins on net worth`);
}
