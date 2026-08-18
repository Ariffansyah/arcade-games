/** How far the rope has to travel before a side has won. */
export const ROPE_TO_WIN = 60;

export type Pull = { id: string; name: string; side: 0 | 1; pulls: number };

/** Join order splits the room: first player left, second right, and so on. */
export const sideFor = (order: string[], id: string): 0 | 1 =>
  order.indexOf(id) % 2 === 0 ? 0 : 1;

/** Positive means the right side is winning. */
export const rope = (pulls: Pull[]) =>
  pulls.reduce((total, p) => total + (p.side === 1 ? p.pulls : -p.pulls), 0);

/** 0 or 1 once a side has dragged the rope home, otherwise null. */
export function taken(pulls: Pull[]): 0 | 1 | null {
  const at = rope(pulls);
  if (at >= ROPE_TO_WIN) return 1;
  if (at <= -ROPE_TO_WIN) return 0;
  return null;
}
