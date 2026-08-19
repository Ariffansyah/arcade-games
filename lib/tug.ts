export const ROPE_TO_WIN = 60;

export type Pull = { id: string; name: string; side: 0 | 1; pulls: number };

export const sideFor = (order: string[], id: string): 0 | 1 =>
  order.indexOf(id) % 2 === 0 ? 0 : 1;

export const rope = (pulls: Pull[]) =>
  pulls.reduce((total, p) => total + (p.side === 1 ? p.pulls : -p.pulls), 0);

export function taken(pulls: Pull[]): 0 | 1 | null {
  const at = rope(pulls);
  if (at >= ROPE_TO_WIN) return 1;
  if (at <= -ROPE_TO_WIN) return 0;
  return null;
}
