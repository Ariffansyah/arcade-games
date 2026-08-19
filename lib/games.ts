export type GameInfo = {
  id: string;
  name: string;
  blurb: string;
  art: string;

  seats: number;

  party: boolean;

  mood: "co-op" | "versus";
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
];

export const isTogether = (g: GameInfo) => g.mood === "co-op";

export const moodLabel = (g: GameInfo) => (g.mood === "co-op" ? "together" : "head to head");

export const seatLabel = (g: GameInfo) => (g.party ? `${g.seats}+ players` : `${g.seats} players`);
