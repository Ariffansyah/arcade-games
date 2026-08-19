import { hash, rng } from "./rng.ts";

export const SPECTRUMS: [string, string][] = [
  ["Cold", "Hot"], ["Cheap", "Expensive"], ["Underrated", "Overrated"],
  ["Useless", "Essential"], ["Quiet", "Loud"], ["Boring", "Exciting"],
  ["Kids' film", "Grown-ups' film"], ["Snack", "Meal"], ["Weird", "Normal"],
  ["Guilty pleasure", "Genuinely good"], ["Cheap date", "Expensive date"],
  ["Bad habit", "Good habit"], ["Round", "Pointy"], ["Forgettable", "Iconic"],
  ["Scary", "Cute"], ["Hard work", "Easy money"], ["Fast", "Slow"],
  ["Ugly", "Beautiful"], ["Wet", "Dry"], ["Trash", "Treasure"],
];

export const pickSpectrum = (seed: string, round: number) =>
  SPECTRUMS[hash(`${seed}:${round}`) % SPECTRUMS.length];

export const pickTarget = (random = Math.random) => 5 + Math.round(random() * 90);

export function bandScore(guess: number, target: number) {
  const off = Math.abs(guess - target);
  if (off <= 4) return 4;
  if (off <= 9) return 3;
  if (off <= 17) return 2;
  if (off <= 28) return 1;
  return 0;
}

export const giverFor = (order: string[], round: number) =>
  order.length ? order[(round - 1) % order.length] : "";

export const giverScore = (guesses: Record<string, number>, target: number) =>
  Math.max(0, ...Object.values(guesses).map((g) => bandScore(g, target)));

export const seededTarget = (seed: string) => pickTarget(rng(hash(seed)));
