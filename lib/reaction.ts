/** A player who tapped before the light turned. Sorted last, never wins. */
export const FOUL = -1;

export type Shot = { id: string; name: string; ms: number };

/** Fastest first; fouls at the back in the order they jumped. */
export const rank = (shots: Shot[]): Shot[] =>
  [...shots].sort((a, b) => Number(a.ms === FOUL) - Number(b.ms === FOUL) || a.ms - b.ms);

/** Nobody wins a round everyone jumped. */
export function winner(shots: Shot[]): Shot | null {
  const best = rank(shots)[0];
  return best && best.ms !== FOUL ? best : null;
}

/** 1.5–6s of suspense. Long enough that counting it out never works. */
export const armDelay = (random = Math.random) => 1500 + Math.floor(random() * 4500);
