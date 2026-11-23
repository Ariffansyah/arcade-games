export const LEVELS = 15;

// Block size: three long, one wide, a little over half a unit tall, like the wooden ones.
export const L = 3;
export const W = 1;
export const H = 0.6;

// Position and rotation (quaternion) of one block.
export type Pose = [number, number, number, number, number, number, number];

export type Topple = {
  round: number;
  order: string[];
  turn: number;

  // Where every block came to rest at the end of the last turn.
  poses: Pose[];

  moved: number;
  loser: string;
  falls: Record<string, number>;
  pulls: number;
};

const TURNED = Math.SQRT1_2;

// Levels alternate direction: even ones run along x with the slots across z, odd ones the other way.
export const restPose = (level: number, slot: number): Pose =>
  level % 2
    ? [(slot - 1) * W, H / 2 + level * H, 0, 0, TURNED, 0, TURNED]
    : [0, H / 2 + level * H, (slot - 1) * W, 0, 0, 0, 1];

export const newTower = (
  order: string[],
  round = 1,
  falls: Record<string, number> = {}
): Topple => ({
  round,
  order,
  turn: (round - 1) % order.length,
  poses: Array.from({ length: LEVELS * 3 }, (_, i) => restPose(Math.floor(i / 3), i % 3)),
  moved: -1,
  loser: "",
  falls,
  pulls: 0,
});

export const levelOf = (p: Pose) => Math.round((p[1] - H / 2) / H);

const slotOf = (p: Pose) => Math.round((levelOf(p) % 2 ? p[0] : p[2]) / W) + 1;

// Part of the tower, as opposed to lying on the floor beside it or still in someone's hand.
const standing = (p: Pose) => Math.max(Math.abs(p[0]), Math.abs(p[2])) < 2 && levelOf(p) >= 0;

function layout(poses: Pose[], skip = -1) {
  const rows: boolean[][] = [];
  poses.forEach((p, i) => {
    if (i === skip || !standing(p)) return;
    const row = (rows[levelOf(p)] ??= [false, false, false]);
    const slot = slotOf(p);
    if (slot >= 0 && slot <= 2) row[slot] = true;
  });
  return rows;
}

export const height = (poses: Pose[], skip = -1) => layout(poses, skip).length;

// House rule from the real thing: nothing comes out of the top level, or the one under it
// while the top is still being built.
export function canPull(t: Topple, id: number) {
  const p = t.poses[id];
  if (!p || t.loser || !standing(p)) return false;
  const rows = layout(t.poses);
  const top = rows.length - 1;
  const ceiling = rows[top]?.every(Boolean) ? top : top - 1;
  return levelOf(p) < ceiling;
}

// Where a block lands when it is let go over the tower: the free spot on top nearest the hand.
export function nextSlot(poses: Pose[], id: number, x: number, z: number): Pose {
  const rows = layout(poses, id);
  const top = rows.length - 1;
  const full = rows[top]?.every(Boolean) ?? true;
  const level = full ? top + 1 : top;
  const free = [0, 1, 2].filter((slot) => full || !rows[top][slot]);
  const spots = free.map((slot) => restPose(level, slot));
  return spots.reduce((a, b) =>
    Math.hypot(b[0] - x, b[2] - z) < Math.hypot(a[0] - x, a[2] - z) ? b : a
  );
}

export const onTop = (poses: Pose[], id: number) =>
  standing(poses[id]) && levelOf(poses[id]) >= height(poses, id) - 1;

// The tower is down once anything but the block in hand has dropped half a block or more.
export const fallen = (start: Pose[], now: Pose[], held: number) =>
  now.some((p, i) => i !== held && p[1] < start[i][1] - H / 2);

// The block is on top and everything has stopped moving: next player.
export const place = (t: Topple, poses: Pose[], id: number): Topple =>
  t.loser
    ? t
    : {
        ...t,
        poses,
        moved: id,
        turn: (t.turn + 1) % t.order.length,
        pulls: t.pulls + 1,
      };

export function collapse(t: Topple, poses: Pose[]): Topple {
  if (t.loser) return t;
  const who = t.order[t.turn];
  return { ...t, poses, loser: who, falls: { ...t.falls, [who]: (t.falls[who] ?? 0) + 1 } };
}

// Whoever is up has left the room: take them out of the rotation.
export function leave(t: Topple): Topple {
  const order = t.order.filter((_, i) => i !== t.turn);
  return order.length ? { ...t, order, turn: t.turn % order.length } : t;
}
