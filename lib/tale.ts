import { hash } from "./rng.ts";

export const WORDS = [
  "pineapple", "goose", "submarine", "grandmother", "spatula", "wizard", "traffic",
  "hamster", "banjo", "escalator", "cabbage", "detective", "trampoline", "seagull",
  "dentist", "volcano", "sandwich", "wheelbarrow", "yodelling", "spreadsheet",
  "pyjamas", "walrus", "lighthouse", "meatball", "librarian", "helicopter",
  "custard", "burglar", "kazoo", "tortoise",
];

export const LINES_EACH = 3;

export const wordFor = (seed: string, line: number) =>
  WORDS[hash(`${seed}:${line}`) % WORDS.length];

export const lineCount = (players: number) => Math.max(2, players) * LINES_EACH;

export const writerFor = (order: string[], line: number) =>
  order.length ? order[line % order.length] : "";

export const usable = (text: string, word: string) =>
  text.trim().length > 8 && text.toLowerCase().includes(word.toLowerCase());

export const story = (lines: string[]) => lines.join(" ");
