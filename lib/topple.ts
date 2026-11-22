export const LEVELS = 15;

export type Block = { level: number; slot: number };

export type Topple = {
  round: number;
  order: string[];
  turn: number;

  blocks: Block[];
  wobble: number;

  aim: number;

  moved: number;
  loser: string;
  falls: Record<string, number>;
  pulls: number;
};

export const newTower = (
  order: string[],
  round = 1,
  falls: Record<string, number> = {}
): Topple => ({
  round,
  order,
  turn: (round - 1) % order.length,
  blocks: Array.from({ length: LEVELS * 3 }, (_, i) => ({
    level: Math.floor(i / 3),
    slot: i % 3,
  })),
  wobble: 0,
  aim: -1,
  moved: -1,
  loser: "",
  falls,
  pulls: 0,
});

export const height = (t: Topple) => Math.max(...t.blocks.map((b) => b.level)) + 1;

export const row = (t: Topple, level: number) =>
  [0, 1, 2].map((slot) => t.blocks.some((b) => b.level === level && b.slot === slot));

// House rule from the real thing: nothing comes out of the top level, or the one under it
// while the top is still being built.
export function canPull(t: Topple, id: number) {
  const b = t.blocks[id];
  if (!b || t.loser) return false;
  const h = height(t);
  const ceiling = row(t, h - 1).every(Boolean) ? h - 1 : h - 2;
  return b.level < ceiling && row(t, b.level).filter(Boolean).length > 1;
}

export function risk(t: Topple, id: number) {
  const b = t.blocks[id];
  const left = row(t, b.level).map((on, slot) => on && slot !== b.slot);
  const count = left.filter(Boolean).length;
  const shape = count === 2 ? (left[1] ? 0.14 : 0.05) : left[1] ? 0.22 : 0.62;
  const load = (1 - b.level / height(t)) * 0.08;
  const tall = Math.max(0, height(t) - LEVELS) * 0.015;
  return Math.min(0.95, shape + load + tall + t.wobble * 0.35);
}

// How wide the steady window is on the pull meter, as a share of either side of centre.
export const steadiness = (r: number) => 0.04 + 0.3 * (1 - r);

export const aim = (t: Topple, id: number): Topple => ({ ...t, aim: id });

// `miss` is how far the meter stopped from dead centre, in windows: under 1 is a clean pull.
export function pull(t: Topple, id: number, miss: number): Topple {
  if (!canPull(t, id)) return t;
  const r = risk(t, id);
  const shake = miss <= 1 ? r * 0.2 * miss : 0.3 + (miss - 1) * 0.45 + r * 0.5;
  const wobble = Math.min(1, t.wobble * 0.65 + shake);
  const who = t.order[t.turn];
  if (wobble >= 1)
    return {
      ...t,
      wobble: 1,
      aim: -1,
      moved: id,
      loser: who,
      falls: { ...t.falls, [who]: (t.falls[who] ?? 0) + 1 },
    };

  const h = height(t);
  const top = row(t, h - 1);
  const full = top.every(Boolean);
  const to = full ? { level: h, slot: 0 } : { level: h - 1, slot: top.indexOf(false) };
  return {
    ...t,
    blocks: t.blocks.map((b, i) => (i === id ? to : b)),
    wobble,
    aim: -1,
    moved: id,
    turn: (t.turn + 1) % t.order.length,
    pulls: t.pulls + 1,
  };
}

// Whoever is up has left the room: take them out of the rotation.
export function leave(t: Topple): Topple {
  const order = t.order.filter((_, i) => i !== t.turn);
  return order.length ? { ...t, order, aim: -1, turn: t.turn % order.length } : t;
}
