export type GameInfo = {
  id: string;
  name: string;
  blurb: string;
  art: string;

  seats: number;

  party: boolean;

  mood: "co-op" | "versus";

  // The official rules' table limit, where the game has one.
  most?: number;
  // Turn-based, so several players can share one screen and pass it round.
  local?: true;
  // Each player holds cards the others mustn't see, so a shared screen covers itself between turns.
  secret?: true;
};

export const GAMES: GameInfo[] = [
  {
    id: "doodle",
    name: "Machine Doodle",
    blurb: "An AI draws, the whole room races to name it.",
    art: "✎",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "maze",
    name: "Blind Maze Escape",
    blurb: "One runs blind, everyone else sees the maze.",
    art: "⌘",
    seats: 2,
    party: false,
    mood: "co-op",
  },
  {
    id: "ships",
    name: "Battleships",
    blurb: "Hidden fleets, blind shots.",
    art: "⚓",
    seats: 2,
    party: false,
    mood: "versus",
  },
  {
    id: "fuse",
    name: "Fuse",
    blurb: "Name it before the bomb goes off. Two lives each.",
    art: "✹",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "draw",
    name: "Quick Draw",
    blurb: "Wait for green. Fastest hand takes the round.",
    art: "⚡",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "dial",
    name: "The Dial",
    blurb: "One clue for a hidden spot on the scale.",
    art: "◑",
    seats: 3,
    party: true,
    mood: "co-op",
  },
  {
    id: "chain",
    name: "Chain",
    blurb: "Watch the pads, play them back, one longer each time.",
    art: "❖",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "scatter",
    name: "Scatter",
    blurb: "Five prompts, one letter. Matching answers cancel out.",
    art: "✽",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "thirds",
    name: "Two Thirds",
    blurb: "Guess two thirds of everyone else's guess.",
    art: "◔",
    seats: 3,
    party: true,
    mood: "versus",
  },
  {
    id: "tug",
    name: "Tug of War",
    blurb: "Two crews, one rope, one button.",
    art: "⇹",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "typerace",
    name: "Type Race",
    blurb: "Same passage, everyone at once, fastest hands win.",
    art: "⌨",
    seats: 2,
    party: true,
    mood: "versus",
  },
  {
    id: "imposter",
    name: "Imposter",
    blurb: "One of you never got the word. Find them.",
    art: "☠",
    seats: 3,
    party: true,
    mood: "versus",
  },
  {
    id: "samepage",
    name: "Same Page",
    blurb: "Answer together, not against — match and keep the streak.",
    art: "◎",
    seats: 2,
    party: true,
    mood: "co-op",
  },
  {
    id: "tale",
    name: "Tall Tale",
    blurb: "One story, one line each, one awkward word to fit in.",
    art: "✍",
    seats: 2,
    party: true,
    mood: "co-op",
  },
  {
    id: "bomb",
    name: "Bomb Squad",
    blurb: "Five modules, one fuse. One holds the bomb, the other reads the manual.",
    art: "⚙",
    seats: 2,
    party: true,
    mood: "co-op",
  },
  {
    id: "mayday",
    name: "Mayday",
    blurb: "One flies it, the rest read the checklist. Height is the clock.",
    art: "✈",
    seats: 2,
    party: true,
    mood: "co-op",
  },
  {
    id: "lastcard",
    name: "Last Card",
    blurb: "Match the colour or the face. Skips, draw cards, wilds, a Flip deck with a dark side, and No Mercy house rules.",
    art: "♠",
    seats: 2,
    party: true,
    mood: "versus",
    local: true,
    secret: true,
  },
  {
    id: "poker",
    name: "Poker",
    blurb: "Texas Hold'em. Two cards each, five on the felt, and every chip on the line.",
    art: "♠",
    seats: 2,
    party: true,
    mood: "versus",
    local: true,
    secret: true,
  },
  {
    id: "blackjack",
    name: "21",
    blurb: "Blackjack against the house. Hit, stand or double down, and don't go over.",
    art: "♦",
    seats: 1,
    party: true,
    mood: "versus",
    local: true,
  },
  {
    id: "topple",
    name: "Topple",
    blurb: "A wooden tower with real physics. Slide a block out by hand, stack it on top, don't be the one who drops it.",
    art: "▤",
    seats: 2,
    party: true,
    mood: "versus",
    local: true,
  },
  {
    id: "four",
    name: "Four in a Row",
    blurb: "Drop discs into a 3D rack. Line up four before they do.",
    art: "◉",
    seats: 2,
    party: false,
    mood: "versus",
    local: true,
  },
  {
    id: "yacht",
    name: "Yacht",
    blurb: "Five 3D dice, three rolls a turn, thirteen boxes. Biggest card wins.",
    art: "⚄",
    seats: 2,
    party: true,
    mood: "versus",
    local: true,
  },
  {
    id: "landlord",
    name: "Landlord",
    blurb: "The property game on a 3D board. Buy, auction and trade streets, build hotels, bankrupt your friends.",
    art: "⌂",
    seats: 2,
    party: true,
    mood: "versus",
    most: 8,
    local: true,
  },
];

export const isTogether = (g: GameInfo) => g.mood === "co-op";

export const moodLabel = (g: GameInfo) => (g.mood === "co-op" ? "together" : "head to head");

export const seatLabel = (g: GameInfo) =>
  g.most ? `${g.seats}–${g.most} players` : g.party ? `${g.seats}+ players` : `${g.seats} players`;
