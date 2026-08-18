import { hash, rng } from "./rng.ts";

/** Two ends of an argument. The dial sits somewhere between them. */
export const SPECTRUMS: [string, string][] = [
  ["Cold", "Hot"], ["Cheap", "Expensive"], ["Underrated", "Overrated"],
  ["Useless", "Essential"], ["Quiet", "Loud"], ["Boring", "Exciting"],
  ["Kids' film", "Grown-ups' film"], ["Snack", "Meal"], ["Weird", "Normal"],
  ["Guilty pleasure", "Genuinely good"], ["Cheap date", "Expensive date"],
  ["Bad habit", "Good habit"], ["Round", "Pointy"], ["Forgettable", "Iconic"],
  ["Scary", "Cute"], ["Hard work", "Easy money"], ["Fast", "Slow"],
  ["Ugly", "Beautiful"], ["Wet", "Dry"], ["Trash", "Treasure"],
];

/** Same round, same spectrum, on every client. */
export const pickSpectrum = (seed: string, round: number) =>
  SPECTRUMS[hash(`${seed}:${round}`) % SPECTRUMS.length];

/** The hidden mark, kept off the wire until the reveal. Never the very edges. */
export const pickTarget = (random = Math.random) => 5 + Math.round(random() * 90);

/**
 * Rings on the dial: dead on is 4, a wild miss is nothing. Distance is in the
 * same 0–100 units the slider uses.
 */
export function bandScore(guess: number, target: number) {
  const off = Math.abs(guess - target);
  if (off <= 4) return 4;
  if (off <= 9) return 3;
  if (off <= 17) return 2;
  if (off <= 28) return 1;
  return 0;
}

/** The clue-giver's chair moves one seat every round. */
export const giverFor = (order: string[], round: number) =>
  order.length ? order[(round - 1) % order.length] : "";

/** A giver is paid for the best read anyone got off their clue. */
export const giverScore = (guesses: Record<string, number>, target: number) =>
  Math.max(0, ...Object.values(guesses).map((g) => bandScore(g, target)));

/** Seeds the demo dial in `rng` terms so a round can be replayed from a string. */
export const seededTarget = (seed: string) => pickTarget(rng(hash(seed)));
