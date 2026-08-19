export const FOUL = -1;

export type Shot = { id: string; name: string; ms: number };

export const rank = (shots: Shot[]): Shot[] =>
  [...shots].sort((a, b) => Number(a.ms === FOUL) - Number(b.ms === FOUL) || a.ms - b.ms);

export function winner(shots: Shot[]): Shot | null {
  const best = rank(shots)[0];
  return best && best.ms !== FOUL ? best : null;
}

export const armDelay = (random = Math.random) => 1500 + Math.floor(random() * 4500);
