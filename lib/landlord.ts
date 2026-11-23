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

type Card = {
  text: string;
  cash?: number;
  to?: number;
  back?: number;
  jail?: true;
  each?: number;
  repairs?: [number, number];
};

export const GLITCH: Card[] = [
  { text: "Warp to GO and collect $200", to: 0 },
  { text: "Warp to Comet Circle", to: 24 },
  { text: "Warp to Neon Strip", to: 11 },
  { text: "Warp to Boss Level Blvd", to: 39 },
  { text: "Lag spike: go back 3 spaces", back: 3 },
  { text: "Busted for cheat codes: go to jail", jail: true },
  { text: "Speedrun prize: collect $150", cash: 150 },
  { text: "Overclocking fine: pay $15", cash: -15 },
  { text: "Server bill: pay every player $50", each: -50 },
  { text: "Firmware patch: pay $25 a house, $100 a hotel", repairs: [25, 100] },
];

export const BONUS: Card[] = [
  { text: "Bank glitch in your favour: collect $200", cash: 200 },
  { text: "Warp to GO and collect $200", to: 0 },
  { text: "Tournament win: collect $100", cash: 100 },
  { text: "Joystick repair: pay $50", cash: -50 },
  { text: "Sold an old cartridge: collect $50", cash: 50 },
  { text: "It's your birthday: collect $10 from every player", each: 10 },
  { text: "Token refund: collect $20", cash: 20 },
  { text: "Lost your quarters: pay $100", cash: -100 },
  { text: "Caught on camera: go to jail", jail: true },
  { text: "High score bonus: collect $25", cash: 25 },
];

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

  dice: [number, number];
  throws: number;
  doubles: number;
  canRoll: boolean;
  offer: number;
  log: string[];
  winner: string;
};

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

const note = (g: Landlord, line: string): Landlord => ({ ...g, log: [...g.log, line].slice(-8) });

const ownedBy = (g: Landlord, id: string) =>
  BOARD.map((_, i) => i).filter((i) => g.owner[i] === id);

export const ownsGroup = (g: Landlord, id: string, group: number) =>
  BOARD.every((s, i) => s.group !== group || g.owner[i] === id);

export function rentFor(g: Landlord, i: number, roll: number) {
  const space = BOARD[i];
  const owner = g.owner[i];
  if (!owner) return 0;
  if (space.kind === "rail")
    return 25 * 2 ** (ownedBy(g, owner).filter((j) => BOARD[j].kind === "rail").length - 1);
  if (space.kind === "util")
    return (ownedBy(g, owner).filter((j) => BOARD[j].kind === "util").length === 2 ? 10 : 4) * roll;
  const built = g.houses[i] ?? 0;
  if (built) return space.rent![built];
  return space.rent![0] * (ownsGroup(g, owner, space.group!) ? 2 : 1);
}

export function worth(g: Landlord, id: string) {
  return ownedBy(g, id).reduce(
    (sum, i) => sum + BOARD[i].price! + (g.houses[i] ?? 0) * (BOARD[i].house ?? 0),
    g.cash[id] ?? 0
  );
}

function settle(g: Landlord): Landlord {
  const left = active(g);
  return left.length === 1 && !g.winner ? note({ ...g, winner: left[0] }, `${left[0]} wins!`) : g;
}

// Short of cash, buildings go back to the bank at half what they cost, priciest first.
function liquidate(g: Landlord, id: string, need: number): Landlord {
  const houses = { ...g.houses };
  const cash = { ...g.cash };
  const built = ownedBy(g, id)
    .filter((i) => houses[i])
    .sort((a, b) => BOARD[b].house! - BOARD[a].house!);
  for (const i of built)
    while (cash[id] < need && houses[i]) {
      houses[i]--;
      cash[id] += BOARD[i].house! / 2;
    }
  return { ...g, houses, cash };
}

// Whatever is left, and every deed, goes to whoever they owed — or back to the bank.
function bankrupt(g: Landlord, id: string, to = ""): Landlord {
  const owner = { ...g.owner };
  const houses = { ...g.houses };
  for (const i of ownedBy(g, id)) {
    delete houses[i];
    if (to) owner[i] = to;
    else delete owner[i];
  }
  const cash = { ...g.cash, [id]: 0 };
  if (to) cash[to] += g.cash[id];
  const jail = { ...g.jail };
  delete jail[id];
  return settle(
    note(
      { ...g, cash, owner, houses, jail, out: [...g.out, id] },
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

function goTo(g: Landlord, id: string, to: number, roll: number, passGo = true): Landlord {
  const from = g.pos[id];
  let next: Landlord = { ...g, pos: { ...g.pos, [id]: to } };
  if (passGo && to < from)
    next = note(
      { ...next, cash: { ...next.cash, [id]: next.cash[id] + SALARY } },
      `${id} passes GO`
    );
  return land(next, id, roll);
}

function draw(g: Landlord, id: string, deck: Card[], roll: number): Landlord {
  const card = deck[Math.floor(rng(hash(`${g.seed}:${g.throws}:${g.pos[id]}`))() * deck.length)];
  let next = note(g, `${id}: ${card.text}`);
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

function land(g: Landlord, id: string, roll: number): Landlord {
  const i = g.pos[id];
  const space = BOARD[i];
  if (space.price) {
    const owner = g.owner[i];
    if (!owner) return { ...g, offer: i };
    if (owner === id) return g;
    const rent = rentFor(g, i, roll);
    return charge(note(g, `${id} pays $${rent} rent to ${owner}`), id, rent, owner);
  }
  if (space.tax) return charge(note(g, `${id} pays $${space.tax} ${space.name}`), id, space.tax);
  if (space.kind === "glitch") return draw(g, id, GLITCH, roll);
  if (space.kind === "bonus") return draw(g, id, BONUS, roll);
  if (space.kind === "arrest") return arrest(g, id);
  return g;
}

// A roll with the dice already known, so tests can pick them.
export function step(g: Landlord, dice: [number, number]): Landlord {
  const id = current(g);
  if (g.winner || !g.canRoll || g.offer >= 0) return g;
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
  if (g.offer < 0 || g.cash[id] < price) return g;
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

export const decline = (g: Landlord): Landlord => (g.offer < 0 ? g : { ...g, offer: -1 });

export function canBuild(g: Landlord, i: number) {
  const id = current(g);
  const space = BOARD[i];
  if (g.winner || space.kind !== "prop" || g.owner[i] !== id || !ownsGroup(g, id, space.group!))
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

export function bail(g: Landlord): Landlord {
  const id = current(g);
  if (!(id in g.jail) || !g.canRoll || g.cash[id] < BAIL) return g;
  const jail = { ...g.jail };
  delete jail[id];
  return note(
    { ...g, jail, cash: { ...g.cash, [id]: g.cash[id] - BAIL } },
    `${id} pays $${BAIL} bail`
  );
}

export function end(g: Landlord): Landlord {
  if (g.winner || (g.canRoll && !g.out.includes(current(g))) || g.offer >= 0) return g;
  let turn = g.turn;
  do turn = (turn + 1) % g.order.length;
  while (g.out.includes(g.order[turn]));
  return { ...g, turn, canRoll: true, doubles: 0, offer: -1 };
}

// Whoever is up has left the room: everything they own goes back to the bank.
export function leave(g: Landlord): Landlord {
  return g.winner ? g : end(bankrupt({ ...g, offer: -1 }, current(g)));
}

// Called off early: the richest player on paper wins.
export function finish(g: Landlord): Landlord {
  if (g.winner) return g;
  const winner = active(g).reduce((a, b) => (worth(g, b) > worth(g, a) ? b : a));
  return note({ ...g, winner }, `${winner} wins on net worth`);
}
