import { WORDS } from "./doodle.ts";
import { hash, rng } from "./rng.ts";

export type Phase = "clue" | "vote" | "reveal";

export function assignRound(secret: string, code: string, round: number, ids: string[]) {
  const random = rng(hash(`${secret}:${code}:${round}`));
  const word = WORDS[Math.floor(random() * WORDS.length)];
  const imposterId = ids[Math.floor(random() * ids.length)];
  return { word, imposterId };
}

export function tally(votes: Record<string, string>) {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes)) counts[target] = (counts[target] ?? 0) + 1;

  let top = 0;
  let accused: string | null = null;
  for (const [id, n] of Object.entries(counts)) {
    if (n > top) {
      top = n;
      accused = id;
    } else if (n === top) {
      accused = null;
    }
  }
  return { counts, accused };
}

export function score(
  previous: Record<string, number>,
  ids: string[],
  imposterId: string,
  accused: string | null
) {
  const next = { ...previous };
  const add = (id: string, n: number) => (next[id] = (next[id] ?? 0) + n);
  if (accused === imposterId) ids.filter((id) => id !== imposterId).forEach((id) => add(id, 1));
  else add(imposterId, 2);
  return next;
}
