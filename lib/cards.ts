// A standard deck, or several in a shoe: card % 13 is the rank (0 = two … 12 = ace), the suit
// comes next.
export const rank = (card: number) => card % 13;
export const suit = (card: number) => Math.floor(card / 13) % 4;

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANK_NAMES = [
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "jack",
  "queen",
  "king",
  "ace",
];
export const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];

export const cardName = (card: number) => `${RANK_NAMES[rank(card)]} of ${SUIT_NAMES[suit(card)]}`;
