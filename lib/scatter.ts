import { hash, rng } from "./rng.ts";

/** Five of these a round. Broad enough that everyone has something, narrow
 *  enough that two people rarely land on the same answer. */
export const PROMPTS = [
  "An animal", "A country", "Something in a fridge", "A film", "A boy's name",
  "A girl's name", "Something you sit on", "A job", "Something in a school bag",
  "A sport", "A colour", "Something you take on holiday", "A band or singer",
  "Something in the sky", "A fruit or vegetable", "A city", "Something noisy",
  "A drink", "Something in a hospital", "A video game", "Something round",
  "Something you can't buy", "A cartoon character", "Something in a garden",
];

const LETTERS = "abcdefghilmnoprstw";
export const PROMPT_COUNT = 5;
export const ROUND_MS = 90_000;

export type Sheet = { letter: string; prompts: string[] };

/** Same seed, same sheet, on every client. */
export function sheet(seed: string, round: number): Sheet {
  const random = rng(hash(`${seed}:${round}`));
  const pool = [...PROMPTS];
  const prompts: string[] = [];
  for (let i = 0; i < PROMPT_COUNT; i++)
    prompts.push(...pool.splice(Math.floor(random() * pool.length), 1));
  return { letter: LETTERS[Math.floor(random() * LETTERS.length)], prompts };
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** An answer counts if it's the right letter and more than one letter long. */
export const usable = (answer: string, letter: string) => {
  const word = normalise(answer);
  return word.length > 1 && word.startsWith(letter);
};

/**
 * A point per usable answer nobody else wrote. Matching answers cancel each
 * other out — that is the whole game.
 */
export function tally(answers: Record<string, string[]>, letter: string) {
  const seen = new Map<string, number>();
  for (const sheetAnswers of Object.values(answers))
    for (const [slot, answer] of sheetAnswers.entries()) {
      if (!usable(answer, letter)) continue;
      const key = `${slot}:${normalise(answer)}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }

  const scores: Record<string, number> = {};
  for (const [id, sheetAnswers] of Object.entries(answers)) {
    scores[id] = sheetAnswers.reduce((sum, answer, slot) => {
      if (!usable(answer, letter)) return sum;
      return sum + (seen.get(`${slot}:${normalise(answer)}`) === 1 ? 1 : 0);
    }, 0);
  }
  return scores;
}
