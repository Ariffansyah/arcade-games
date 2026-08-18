/** Things a line drawing can actually convey. */
export const WORDS = [
  "airplane", "anchor", "apple", "axe", "backpack", "banana", "bicycle", "boat",
  "bone", "book", "bottle", "bridge", "broom", "bucket", "butterfly", "cactus",
  "camera", "candle", "carrot", "castle", "cat", "chair", "cloud", "clock",
  "compass", "cow", "crab", "crown", "cup", "dog", "donut", "door", "dragon",
  "drum", "duck", "elephant", "envelope", "eye", "fish", "flag", "flower",
  "fork", "frog", "ghost", "giraffe", "glasses", "guitar", "hammer", "hand",
  "hat", "heart", "helicopter", "horse", "hourglass", "house", "igloo", "key",
  "kite", "ladder", "lamp", "leaf", "lighthouse", "lightning", "lock", "moon",
  "mountain", "mushroom", "octopus", "owl", "paintbrush", "palm tree", "pencil",
  "penguin", "piano", "pizza", "rabbit", "rainbow", "robot", "rocket", "sailboat",
  "scissors", "shark", "shoe", "snail", "snake", "snowman", "sock", "spider",
  "spoon", "star", "sun", "sunglasses", "sword", "telescope", "tent", "tooth",
  "tractor", "train", "tree", "trophy", "turtle", "umbrella", "volcano", "whale",
  "wheel", "windmill",
];

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz][\sMmLlHhVvCcSsQqTtAaZz0-9eE,.+-]*$/;

/**
 * Pulls path geometry out of the model's reply and throws away everything else.
 * The model's output ends up in the DOM, so nothing but `d` data is trusted:
 * no elements, no attributes, no markup survives this.
 */
export function extractPaths(text: string, max = 60): string[] {
  // Reasoning models draft and discard geometry inside <think>. Those drafts are
  // not the drawing, and a truncated block leaves half-finished paths behind.
  const visible = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "");

  const paths: string[] = [];
  for (const [, d] of visible.matchAll(/\bd\s*=\s*"([^"]*)"/g)) {
    const trimmed = d.trim();
    if (trimmed.length < 4 || trimmed.length > 3000) continue;
    if (!PATH_DATA.test(trimmed)) continue;
    paths.push(trimmed);
    if (paths.length >= max) break;
  }
  return paths;
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");

/** Plurals and stray punctuation shouldn't cost anyone the round. */
export const isCorrect = (guess: string, word: string) => normalise(guess) === normalise(word);
