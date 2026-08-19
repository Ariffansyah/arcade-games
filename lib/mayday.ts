import { hash, rng } from "./rng.ts";
export { holderFor } from "./players.ts";

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTY: Record<
  Difficulty,
  { label: string; blurb: string; steps: number; altitude: number; sink: number; hit: number }
> = {
  easy: {
    label: "Easy",
    blurb: "Five steps from twelve thousand feet. Mistakes cost a little.",
    steps: 5,
    altitude: 12_000,
    sink: 220,
    hit: 900,
  },
  normal: {
    label: "Normal",
    blurb: "Seven steps, and the ground comes up faster.",
    steps: 7,
    altitude: 11_000,
    sink: 280,
    hit: 1_400,
  },
  hard: {
    label: "Hard",
    blurb: "Nine steps, thirty seconds of air, and every slip hurts.",
    steps: 9,
    altitude: 10_000,
    sink: 340,
    hit: 2_000,
  },
};

export const SWITCHES = ["GEAR", "PUMP", "DEICE", "SPOIL", "TRIM", "BEACON"];

export const LAMPS = ["ICE", "HYD", "FIRE"];

export const LEVER = ["UP", "HALF", "FULL"];

export type Readings = { fuel: number; speed: number; heading: number; lamps: boolean[] };

export type World = { switches: boolean[]; lever: number };

export type Cond =
  | { kind: "fuel"; n: number }
  | { kind: "speed"; n: number }
  | { kind: "lamp"; i: number }
  | { kind: "heading" }
  | { kind: "switch"; i: number };

export type Act = { kind: "flip"; i: number } | { kind: "lever"; p: number };

export type Step = { when: Cond; then: Act; else: Act };
export type Plan = { readings: Readings; start: World; steps: Step[] };

export function makePlan(seed: string, round: number, difficulty: Difficulty): Plan {
  const random = rng(hash(`${seed}:${round}:${difficulty}`));
  const readings: Readings = {
    fuel: 5 + Math.floor(random() * 90),
    speed: 140 + Math.floor(random() * 180),
    heading: Math.floor(random() * 360),
    lamps: LAMPS.map(() => random() < 0.45),
  };
  const start: World = {
    switches: SWITCHES.map(() => random() < 0.5),
    lever: Math.floor(random() * LEVER.length),
  };

  const act = (): Act =>
    random() < 0.6
      ? { kind: "flip", i: Math.floor(random() * SWITCHES.length) }
      : { kind: "lever", p: Math.floor(random() * LEVER.length) };

  const steps = Array.from({ length: DIFFICULTY[difficulty].steps }, () => {
    const then = act();

    let other = act();
    while (inputOf(other) === inputOf(then)) other = act();
    return { when: cond(random), then, else: other };
  });

  return { readings, start, steps };
}

function cond(random: () => number): Cond {
  switch (Math.floor(random() * 5)) {
    case 0:
      return { kind: "fuel", n: 20 + Math.floor(random() * 60) };
    case 1:
      return { kind: "speed", n: 160 + Math.floor(random() * 140) };
    case 2:
      return { kind: "lamp", i: Math.floor(random() * LAMPS.length) };
    case 3:
      return { kind: "heading" };
    default:
      return { kind: "switch", i: Math.floor(random() * SWITCHES.length) };
  }
}

export function holds(c: Cond, r: Readings, w: World): boolean {
  switch (c.kind) {
    case "fuel":
      return r.fuel < c.n;
    case "speed":
      return r.speed > c.n;
    case "lamp":
      return r.lamps[c.i];
    case "heading":
      return r.heading >= 180;
    case "switch":
      return w.switches[c.i];
  }
}

export const expected = (s: Step, r: Readings, w: World): Act =>
  holds(s.when, r, w) ? s.then : s.else;

export const inputOf = (a: Act) => (a.kind === "flip" ? a.i : 100 + a.p);

export const accepts = (s: Step, r: Readings, w: World, input: number) =>
  input === inputOf(expected(s, r, w));

export function apply(a: Act, w: World): World {
  return a.kind === "flip"
    ? { ...w, switches: w.switches.map((on, i) => (i === a.i ? !on : on)) }
    : { ...w, lever: a.p };
}

export function worldAt(plan: Plan, step: number): World {
  let w = plan.start;
  for (let i = 0; i < step; i++) w = apply(expected(plan.steps[i], plan.readings, w), w);
  return w;
}

export const condText = (c: Cond) => {
  switch (c.kind) {
    case "fuel":
      return `fuel is below ${c.n}`;
    case "speed":
      return `airspeed is above ${c.n}`;
    case "lamp":
      return `the ${LAMPS[c.i]} lamp is lit`;
    case "heading":
      return "the heading is 180 or more";
    case "switch":
      return `${SWITCHES[c.i]} is on`;
  }
};

export const actText = (a: Act) =>
  a.kind === "flip" ? `flip ${SWITCHES[a.i]}` : `set the flap lever to ${LEVER[a.p]}`;

export const altitudeAt = (d: Difficulty, ms: number, hits: number) =>
  Math.max(
    0,
    DIFFICULTY[d].altitude - Math.floor((ms / 1000) * DIFFICULTY[d].sink) - hits * DIFFICULTY[d].hit
  );
