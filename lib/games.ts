/** Cabinet list. Metadata only — the landing page reads this without pulling
 *  every game's code into its bundle. */
export type GameInfo = {
  id: string;
  name: string;
  blurb: string;
  art: string;
  /** Fewest players the game needs. */
  seats: number;
  /** True when more than `seats` players can all join in. */
  party: boolean;
};

export const GAMES: GameInfo[] = [
  {
    id: "doodle",
    name: "Machine Doodle",
    blurb: "An AI draws, the whole room races to name it.",
    art: "✎",
    seats: 2,
    party: true,
  },
  {
    id: "maze",
    name: "Blind Maze Escape",
    blurb: "One runs blind, everyone else sees the maze.",
    art: "⌘",
    seats: 2,
    party: false,
  },
  {
    id: "ships",
    name: "Battleships",
    blurb: "Hidden fleets, blind shots.",
    art: "⚓",
    seats: 2,
    party: false,
  },
  {
    id: "fuse",
    name: "Fuse",
    blurb: "Name it before the bomb goes off. Two lives each.",
    art: "✹",
    seats: 2,
    party: true,
  },
  {
    id: "draw",
    name: "Quick Draw",
    blurb: "Wait for green. Fastest hand takes the round.",
    art: "⚡",
    seats: 2,
    party: true,
  },
  {
    id: "dial",
    name: "The Dial",
    blurb: "One clue for a hidden spot on the scale.",
    art: "◑",
    seats: 3,
    party: true,
  },
  {
    id: "chain",
    name: "Chain",
    blurb: "Watch the pads, play them back, one longer each time.",
    art: "❖",
    seats: 2,
    party: true,
  },
  {
    id: "scatter",
    name: "Scatter",
    blurb: "Five prompts, one letter. Matching answers cancel out.",
    art: "✽",
    seats: 2,
    party: true,
  },
  {
    id: "thirds",
    name: "Two Thirds",
    blurb: "Guess two thirds of everyone else's guess.",
    art: "◔",
    seats: 3,
    party: true,
  },
  {
    id: "tug",
    name: "Tug of War",
    blurb: "Two crews, one rope, one button.",
    art: "⇹",
    seats: 2,
    party: true,
  },
  {
    id: "typerace",
    name: "Type Race",
    blurb: "Same passage, everyone at once, fastest hands win.",
    art: "⌨",
    seats: 2,
    party: true,
  },
  {
    id: "imposter",
    name: "Imposter",
    blurb: "One of you never got the word. Find them.",
    art: "☠",
    seats: 3,
    party: true,
  },
];

/** How many players a cabinet seats, in words. */
export const seatLabel = (g: GameInfo) => (g.party ? `${g.seats}+ players` : `${g.seats} players`);
