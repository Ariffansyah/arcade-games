export const WORDS = [
  "acorn", "airplane", "ambulance", "anchor", "ant", "anvil", "apple", "arrow", "axe",
  "backpack", "balloon", "banana", "barn", "basket", "bear", "bed", "bee", "beetle", "bell",
  "bench", "bicycle", "bird", "boat", "bone", "book", "bottle", "bowl", "bread", "brick",
  "bridge", "briefcase", "broccoli", "broom", "bucket", "bus", "butterfly", "cactus", "cake",
  "camel", "camera", "campfire", "candle", "candy", "cannon", "canoe", "car", "carrot",
  "castle", "cat", "caterpillar", "chain", "chair", "cheese", "cherry", "chicken", "chimney",
  "church", "clock", "cloud", "compass", "cookie", "corn", "cow", "crab", "crayon",
  "crocodile", "crown", "cup", "cupcake", "dice", "dinosaur", "dog", "dolphin", "donut",
  "door", "dragon", "dragonfly", "drill", "drum", "duck", "dumbbell", "eagle", "easel", "egg",
  "elephant", "envelope", "eye", "feather", "fence", "ferris wheel", "fish", "flag",
  "flamingo", "flashlight", "flower", "flute", "football", "fork", "fountain", "fox",
  "fridge", "frog", "ghost", "giraffe", "glasses", "glove", "goat", "gorilla", "grapes",
  "guitar", "hamburger", "hammer", "hammock", "hand", "harp", "hat", "heart", "hedgehog",
  "helicopter", "helmet", "honeycomb", "hook", "horse", "horseshoe", "hot air balloon",
  "hourglass", "house", "ice cream", "igloo", "jar", "jellyfish", "kangaroo", "kettle", "key",
  "keyboard", "kite", "koala", "ladder", "lamp", "lantern", "laptop", "leaf", "lemon",
  "light bulb", "lighthouse", "lightning", "lion", "lips", "lobster", "lock", "magnet",
  "mailbox", "map", "mask", "medal", "megaphone", "microphone", "microscope", "mirror",
  "mitten", "monkey", "moon", "motorcycle", "mountain", "mug", "mushroom", "nail", "necklace",
  "nest", "oar", "octopus", "onion", "ostrich", "oven", "owl", "paintbrush", "palm tree",
  "panda", "parachute", "parrot", "peacock", "pear", "pencil", "penguin", "pepper", "piano",
  "pineapple", "pizza", "plug", "pot", "potato", "pretzel", "pumpkin", "purse", "pyramid",
  "rabbit", "rainbow", "rake", "ring", "robot", "rocket", "rose", "ruler", "sailboat",
  "sandwich", "saw", "scarf", "scissors", "scooter", "screw", "seahorse", "seashell",
  "seesaw", "shark", "sheep", "shield", "shoe", "shovel", "skateboard", "skull", "sled",
  "snail", "snake", "snowflake", "snowman", "sock", "sofa", "spaceship", "spider", "spoon",
  "squirrel", "stairs", "stamp", "star", "starfish", "stethoscope", "stool", "stopwatch",
  "strawberry", "streetlight", "submarine", "suitcase", "sun", "sunflower", "sunglasses",
  "surfboard", "swan", "swing", "sword", "table", "teapot", "teddy bear", "telephone",
  "telescope", "television", "tent", "tiger", "toaster", "tomato", "toolbox", "tooth",
  "tornado", "towel", "tractor", "traffic light", "train", "treasure chest", "tree",
  "tricycle", "trophy", "trumpet", "tulip", "turtle", "typewriter", "umbrella", "unicorn",
  "van", "vase", "violin", "volcano", "wagon", "wallet", "watch", "watering can",
  "watermelon", "well", "whale", "wheel", "whistle", "windmill", "window", "wolf", "worm",
  "wrench", "zebra", "zipper",
];

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz][\sMmLlHhVvCcSsQqTtAaZz0-9eE,.+-]*$/;

export function extractPaths(text: string, max = 60): string[] {
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

export const isCorrect = (guess: string, word: string) => normalise(guess) === normalise(word);

function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        row[j] + 1,
        next[j - 1] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    row = next;
  }
  return row[b.length];
}

export function isClose(guess: string, word: string) {
  const a = normalise(guess);
  const b = normalise(word);
  if (!a || a === b) return false;
  return distance(a, b) <= (b.length <= 5 ? 1 : 2);
}
