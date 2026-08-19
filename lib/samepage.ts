import { hash } from "./rng.ts";

export const PROMPTS = [
  "Name a pizza topping",
  "Name a pet that would ruin the house",
  "Name a superpower worth having",
  "Name something in a fridge that has gone off",
  "Name a place worth going on a Sunday",
  "Name a biscuit",
  "Name a bad excuse for being late",
  "Name something you always forget to pack",
  "Name a film worth watching twice",
  "Name a sandwich filling",
  "Name an animal that looks smug",
  "Name a smell that means home",
  "Name a chore nobody wants",
  "Name a drink for a bad day",
  "Name a board game that ends in an argument",
  "Name a song everybody knows the chorus of",
  "Name something worth queueing for",
  "Name an ice cream flavour",
  "Name a room in the house to hide in",
  "Name a colour for a front door",
  "Name a snack for the sofa",
  "Name an instrument you would never learn",
  "Name a holiday that sounds relaxing",
  "Name something a cat would steal",
];

export function promptIndex(seed: string, round: number, avoid = -1) {
  const at = hash(`${seed}:${round}`) % PROMPTS.length;
  return at === avoid ? (at + 1) % PROMPTS.length : at;
}

export const prompt = (seed: string, round: number, avoid = -1) =>
  PROMPTS[promptIndex(seed, round, avoid)];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function groups(answers: Record<string, string>): string[][] {
  const byWord = new Map<string, string[]>();
  for (const [id, answer] of Object.entries(answers)) {
    const word = normalise(answer);
    if (!word) continue;
    byWord.set(word, [...(byWord.get(word) ?? []), id]);
  }
  return [...byWord.values()].sort((a, b) => b.length - a.length);
}

export const together = (answers: Record<string, string>) => groups(answers)[0]?.length ?? 0;

export const perfect = (answers: Record<string, string>, players: number) =>
  players > 1 && together(answers) === players;
