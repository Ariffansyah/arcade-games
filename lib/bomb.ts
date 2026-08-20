import { hash, rng } from "./rng.ts";
export { holderFor } from "./players.ts";

export type Difficulty = "easy" | "normal" | "hard";
export type Kind = "wires" | "keypad" | "button" | "memory" | "password";

export const KIND_NAMES: Record<Kind, string> = {
  wires: "Wires",
  keypad: "Keypad",
  button: "Button",
  memory: "Memory",
  password: "Password",
};

export const DIFFICULTY: Record<
  Difficulty,
  { label: string; blurb: string; modules: number; fuse: number; strikes: number; kinds: Kind[] }
> = {
  easy: {
    label: "Easy",
    blurb: "Wires and keypad. Two minutes, three strikes.",
    modules: 2,
    fuse: 120_000,
    strikes: 3,
    kinds: ["wires", "keypad"],
  },
  normal: {
    label: "Normal",
    blurb: "The button joins in. Two strikes.",
    modules: 3,
    fuse: 100_000,
    strikes: 2,
    kinds: ["wires", "keypad", "button"],
  },
  hard: {
    label: "Hard",
    blurb: "All five modules, including memory and the password. One strike.",
    modules: 5,
    fuse: 80_000,
    strikes: 1,
    kinds: ["wires", "keypad", "button", "memory", "password"],
  },
};

export const fuseFor = (d: Difficulty, round: number) =>
  Math.max(45_000, DIFFICULTY[d].fuse - (round - 1) * 5_000);

export type Bomb = {
  serial: string;
  difficulty: Difficulty;
  modules: Module[];
  wireRuleOrder: number[];
  buttonRuleOrder: number[];
  keypadColumns: Glyph[][];
  memoryStepOrder: number[][];
};
export type Module = WiresModule | KeypadModule | ButtonModule | MemoryModule | PasswordModule;

const SERIAL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const VOWELS = "AEIOU";

const pick = <T,>(random: () => number, xs: readonly T[]) => xs[Math.floor(random() * xs.length)];

function shuffle<T>(random: () => number, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function makeBomb(seed: string, round: number, difficulty: Difficulty): Bomb {
  const random = rng(hash(`${seed}:${round}:${difficulty}`));
  const spec = DIFFICULTY[difficulty];

  const count = Math.min(6, spec.modules + Math.floor((round - 1) / 3));
  const modules = Array.from({ length: count }, (_, i) =>
    makeModule(i < spec.kinds.length ? spec.kinds[i] : pick(random, spec.kinds), random, round)
  );
  const serial =
    Array.from({ length: 3 }, () => SERIAL_LETTERS[Math.floor(random() * SERIAL_LETTERS.length)])
      .join("") +
    Math.floor(random() * 10);
  const wireRuleOrder = shuffle(random, [0, 1, 2, 3, 4, 5]);
  const buttonRuleOrder = shuffle(random, [0, 1, 2, 3, 4]);
  const keypadColumns = COLUMNS.map((c) => shuffle(random, c));
  const memoryStepOrder = Array.from({ length: 5 }, () => shuffle(random, [0, 1, 2, 3]));
  return {
    serial,
    difficulty,
    modules,
    wireRuleOrder,
    buttonRuleOrder,
    keypadColumns,
    memoryStepOrder,
  };
}

function makeModule(kind: Kind, random: () => number, round: number): Module {
  switch (kind) {
    case "wires": {
      const count = Math.min(8, 4 + Math.floor(random() * 3) + Math.floor((round - 1) / 3));
      const wires = Array.from({ length: count }, () => ({
        color: pick(random, COLORS),
        num: 1 + Math.floor(random() * 9),
        striped: random() < 0.28,
      }));
      const stages = Math.min(count - 1, 2 + Math.floor((round - 1) / 4));
      return { kind, wires, stages };
    }
    case "keypad": {
      const pool = [...pick(random, COLUMNS)];
      const keys = Array.from(
        { length: 4 },
        () => pool.splice(Math.floor(random() * pool.length), 1)[0]
      );
      return { kind, keys };
    }
    case "button":
      return {
        kind,
        color: pick(random, BUTTON_COLORS),
        label: pick(random, BUTTON_LABELS),
        strip: pick(random, STRIP_COLORS),
      };
    case "memory":
      return {
        kind,
        stages: Array.from({ length: 5 }, () => {
          const labels = [1, 2, 3, 4];
          for (let i = labels.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [labels[i], labels[j]] = [labels[j], labels[i]];
          }
          return { display: 1 + Math.floor(random() * 4), labels };
        }),
      };
    case "password":
      return makePassword(random);
  }
}

export const COLORS = ["red", "blue", "yellow", "white", "green"] as const;
export type Color = (typeof COLORS)[number];

export type Wire = { color: Color; num: number; striped: boolean };
export type WiresModule = { kind: "wires"; wires: Wire[]; stages: number };

type WireCtx = {
  b: Bomb;
  left: { w: Wire; i: number }[];
  at: (n: number) => number;
  last: { w: Wire; i: number };
};

const WIRE_RULE_DEFS: { text: string; test: (c: WireCtx) => number | null }[] = [
  {
    text: "Exactly one wire is red — cut the red one.",
    test: (c) => {
      const reds = c.left.filter(({ w }) => w.color === "red");
      return reds.length === 1 ? reds[0].i : null;
    },
  },
  {
    text: "More than one wire is striped — cut the last striped wire.",
    test: (c) => {
      const striped = c.left.filter(({ w }) => w.striped);
      return striped.length > 1 ? striped[striped.length - 1].i : null;
    },
  },
  {
    text: "The last wire is white and the serial ends in an odd digit — cut the first wire.",
    test: (c) => (c.last.w.color === "white" && oddSerial(c.b) ? c.at(0) : null),
  },
  {
    text: "There are no yellow wires and the serial contains a vowel — cut the second wire.",
    test: (c) => {
      const hasYellow = c.left.some(({ w }) => w.color === "yellow");
      return !hasYellow && vowelSerial(c.b) ? c.at(1) : null;
    },
  },
  {
    text: "The numbers add up to an even total — cut the highest number.",
    test: (c) => {
      const total = c.left.reduce((sum, { w }) => sum + w.num, 0);
      if (total % 2 !== 0) return null;
      const highest = c.left.reduce((best, e) => (e.w.num > best.w.num ? e : best), c.left[0]);
      return highest.i;
    },
  },
  {
    text: "Exactly one wire is blue — cut the wire after it, wrapping to the first.",
    test: (c) => {
      const blues = c.left.filter(({ w }) => w.color === "blue");
      if (blues.length !== 1) return null;
      const after = (c.left.findIndex(({ i }) => i === blues[0].i) + 1) % c.left.length;
      return c.left[after].i;
    },
  },
];
const WIRE_CATCHALL_TEXT = "None of the above match — cut the last wire.";

export const wireRuleText = (order: number[]): string[] => [
  ...order.map((id) => WIRE_RULE_DEFS[id].text),
  WIRE_CATCHALL_TEXT,
];

export function solveWires(b: Bomb, m: WiresModule, cut: number[]): { index: number; rule: number } {
  const left = m.wires.map((w, i) => ({ w, i })).filter(({ i }) => !cut.includes(i));
  if (!left.length) return { index: -1, rule: -1 };
  const at = (n: number) => left[Math.min(Math.max(n, 0), left.length - 1)].i;
  const last = left[left.length - 1];
  const ctx: WireCtx = { b, left, at, last };

  const order = b.wireRuleOrder;
  for (let pos = 0; pos < order.length; pos++) {
    const hit = WIRE_RULE_DEFS[order[pos]].test(ctx);
    if (hit !== null) return { index: hit, rule: pos };
  }
  return { index: last.i, rule: order.length };
}

const oddSerial = (b: Bomb) => Number(b.serial[b.serial.length - 1]) % 2 === 1;
const vowelSerial = (b: Bomb) => [...b.serial].some((c) => VOWELS.includes(c));

export const GLYPHS = {
  "★": "solid star",
  "◆": "solid diamond",
  "●": "solid circle",
  "▲": "solid triangle",
  "■": "solid square",
  "✚": "fat plus",
  "☆": "hollow star",
  "◇": "hollow diamond",
  "○": "hollow circle",
  "✖": "cross",
  "△": "hollow triangle",
  "□": "hollow square",
} as const;
export type Glyph = keyof typeof GLYPHS;
export type KeypadModule = { kind: "keypad"; keys: Glyph[] };

export const COLUMNS: Glyph[][] = [
  ["★", "◆", "●", "▲", "■", "✚"],
  ["☆", "◇", "○", "★", "◆", "✖"],
  ["✖", "✚", "△", "□", "●", "☆"],
];

export function keypadOrder(keys: Glyph[], columns: Glyph[][] = COLUMNS): Glyph[] {
  const column = columns.find((c) => keys.every((k) => c.includes(k))) ?? columns[0];
  return [...keys].sort((a, b) => column.indexOf(a) - column.indexOf(b));
}

export const BUTTON_COLORS = ["red", "blue", "yellow", "white"] as const;
export const BUTTON_LABELS = ["Press", "Hold", "Detonate", "Abort"] as const;
export const STRIP_COLORS = ["blue", "white", "yellow", "red"] as const;
export type ButtonModule = {
  kind: "button";
  color: (typeof BUTTON_COLORS)[number];
  label: (typeof BUTTON_LABELS)[number];

  strip: (typeof STRIP_COLORS)[number];
};

type ButtonCtx = { b: Bomb; m: ButtonModule; strikes: number };
type ButtonHit = { hold: boolean } | null;

const BUTTON_RULE_DEFS: { text: string; test: (c: ButtonCtx) => ButtonHit }[] = [
  {
    text: "The button is blue and reads Abort — hold it.",
    test: (c) => (c.m.color === "blue" && c.m.label === "Abort" ? { hold: true } : null),
  },
  {
    text: "It reads Detonate and the serial contains a vowel — tap it.",
    test: (c) => (c.m.label === "Detonate" && vowelSerial(c.b) ? { hold: false } : null),
  },
  {
    text: "The button is yellow — hold it.",
    test: (c) => (c.m.color === "yellow" ? { hold: true } : null),
  },
  {
    text: "It reads Press and the serial ends in an odd digit — tap it.",
    test: (c) => (c.m.label === "Press" && oddSerial(c.b) ? { hold: false } : null),
  },
  {
    text: "The button is red and you have no strikes yet — tap it.",
    test: (c) => (c.m.color === "red" && c.strikes === 0 ? { hold: false } : null),
  },
];
const BUTTON_CATCHALL_TEXT = "None of the above match — hold it.";

export const buttonRuleText = (order: number[]): string[] => [
  ...order.map((id) => BUTTON_RULE_DEFS[id].text),
  BUTTON_CATCHALL_TEXT,
];

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export const STRIP_DIGIT: Record<(typeof STRIP_COLORS)[number], number> = {
  blue: 4,
  white: 1,
  yellow: 5,
  red: 2,
};

export function buttonRule(b: Bomb, m: ButtonModule, strikes: number) {
  const ctx: ButtonCtx = { b, m, strikes };
  const hold = (rule: number) => ({ rule, hold: true, digit: STRIP_DIGIT[m.strip] });
  const tap = (rule: number) => ({ rule, hold: false, digit: 0 });

  const order = b.buttonRuleOrder;
  for (let pos = 0; pos < order.length; pos++) {
    const hit = BUTTON_RULE_DEFS[order[pos]].test(ctx);
    if (hit) return hit.hold ? hold(pos) : tap(pos);
  }
  return hold(order.length);
}

export type MemoryModule = {
  kind: "memory";
  stages: { display: number; labels: number[] }[];
};

type Step =
  | { pos: number }
  | { label: number }
  | { posFrom: number }
  | { labelFrom: number };

export const MEMORY_STEPS: Step[][] = [
  [{ pos: 1 }, { pos: 1 }, { pos: 2 }, { pos: 3 }],
  [{ label: 4 }, { posFrom: 0 }, { pos: 0 }, { posFrom: 0 }],
  [{ labelFrom: 1 }, { labelFrom: 0 }, { pos: 2 }, { label: 4 }],
  [{ posFrom: 0 }, { pos: 0 }, { posFrom: 1 }, { posFrom: 1 }],
  [{ labelFrom: 0 }, { labelFrom: 1 }, { labelFrom: 3 }, { labelFrom: 2 }],
];

export const stepText = (s: Step): string =>
  "pos" in s
    ? `press position ${s.pos + 1}`
    : "label" in s
      ? `press the button labelled ${s.label}`
      : "posFrom" in s
        ? `press the position you pressed in stage ${s.posFrom + 1}`
        : `press the label you pressed in stage ${s.labelFrom + 1}`;

export const memoryStepText = (order: number[][]): string[][] =>
  MEMORY_STEPS.map((row, s) => order[s].map((idx) => stepText(row[idx])));

export function memoryTarget(b: Bomb, m: MemoryModule, pressed: number[]): number {
  const stage = pressed.length;
  if (stage >= m.stages.length) return -1;
  const here = m.stages[stage];
  const step = MEMORY_STEPS[stage][b.memoryStepOrder[stage][here.display - 1]];
  if ("pos" in step) return step.pos;
  if ("label" in step) return here.labels.indexOf(step.label);
  if ("posFrom" in step) return pressed[step.posFrom];
  const was = m.stages[step.labelFrom].labels[pressed[step.labelFrom]];
  return here.labels.indexOf(was);
}

export const WORDS = [
  "ABOUT", "BRAVE", "CHAIR", "DOZEN", "EIGHT", "FLUTE",
  "GRAPE", "HOTEL", "INDEX", "JOKER", "KNIFE", "LEMON",
  "MOUSE", "NIGHT", "OCEAN", "PIANO", "QUIET", "RIVER",
  "STORM", "TIGER", "ULTRA", "VOICE", "WHALE", "YACHT",
];

export type PasswordModule = {
  kind: "password";
  answer: string;

  columns: string[][];
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const spellable = (word: string, columns: string[][]) =>
  [...word].every((l, i) => columns[i]?.includes(l));

function makePassword(random: () => number): PasswordModule {
  const answer = WORDS[Math.floor(random() * WORDS.length)];
  const columns = [...answer].map((letter) => {
    const letters = [letter];
    while (letters.length < 6) {
      const l = ALPHABET[Math.floor(random() * ALPHABET.length)];
      if (!letters.includes(l)) letters.push(l);
    }
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters;
  });

  for (const rival of WORDS) {
    if (rival === answer || !spellable(rival, columns)) continue;
    const i = [...rival].findIndex((l, k) => l !== answer[k]);
    const unused = ALPHABET.filter((l) => !WORDS.some((w) => w[i] === l));
    const dead = unused.filter((l) => !columns[i].includes(l));
    const pool = dead.length ? dead : unused;
    columns[i][columns[i].indexOf(rival[i])] = pool[Math.floor(random() * pool.length)];
  }

  return { kind: "password", answer, columns };
}

export const target = (m: Module) =>
  m.kind === "wires"
    ? m.stages
    : m.kind === "keypad"
      ? 4
      : m.kind === "memory"
        ? 5
        : 1;

export const isDone = (m: Module, done: number[]) => done.length >= target(m);

export function accepts(
  b: Bomb,
  m: Module,
  done: number[],
  input: number,
  strikes: number
): boolean {
  switch (m.kind) {
    case "wires":
      return input === solveWires(b, m, done).index;
    case "keypad":
      return input === m.keys.indexOf(keypadOrder(m.keys, b.keypadColumns)[done.length]);
    case "button": {
      const want = buttonRule(b, m, strikes);
      return want.hold
        ? input >= 0 && clock(input).includes(String(want.digit))
        : input === -1;
    }
    case "memory":
      return input === memoryTarget(b, m, done);
    case "password":
      return WORDS[input] === m.answer;
  }
}

export function wanted(b: Bomb, m: Module, done: number[], strikes: number): string {
  switch (m.kind) {
    case "wires": {
      const { index, rule } = solveWires(b, m, done);
      return `wire ${index + 1} — rule ${rule + 1}`;
    }
    case "keypad":
      return `the ${GLYPHS[keypadOrder(m.keys, b.keypadColumns)[done.length]]}`;
    case "button": {
      const want = buttonRule(b, m, strikes);
      return want.hold ? `a hold, released on a ${want.digit}` : "a tap";
    }
    case "memory":
      return `position ${memoryTarget(b, m, done) + 1}`;
    case "password":
      return `the word ${m.answer}`;
  }
}
