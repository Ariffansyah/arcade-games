/** Pick a number. The winner is closest to two thirds of the room's average —
 *  which means everyone is guessing at everyone else's guess. */
export const RATIO = 2 / 3;
export const MAX = 100;

export const target = (picks: number[]) =>
  picks.length ? (picks.reduce((sum, n) => sum + n, 0) / picks.length) * RATIO : 0;

/** Closest to the target takes the round; an exact tie splits it. */
export function winners(picks: Record<string, number>) {
  const values = Object.values(picks);
  const mark = target(values);
  let closest = Infinity;
  let ids: string[] = [];
  for (const [id, pick] of Object.entries(picks)) {
    const off = Math.abs(pick - mark);
    if (off < closest - 1e-9) {
      closest = off;
      ids = [id];
    } else if (Math.abs(off - closest) < 1e-9) {
      ids.push(id);
    }
  }
  return { mark, ids };
}
