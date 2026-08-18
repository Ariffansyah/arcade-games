export type Player = { id: string; name: string; joinedAt: number };

/**
 * Every client must agree on who is P1. Clocks can skew across machines, so id
 * is the tiebreak — same input, same order, everywhere.
 */
export const sortPlayers = (list: Player[]): Player[] =>
  [...list].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));

/** Where a nickname survives reloads and rooms. */
const NAME_KEY = "arcade:nickname";

/** One line, no runaway length — it sits in a scoreboard chip. */
export const cleanName = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 16);

export const storedName = () =>
  typeof window === "undefined" ? "" : localStorage.getItem(NAME_KEY) ?? "";

export const saveName = (name: string) => localStorage.setItem(NAME_KEY, name);
