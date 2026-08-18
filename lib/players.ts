export type Player = { id: string; name: string; joinedAt: number };

/**
 * Every client must agree on who is P1. Clocks can skew across machines, so id
 * is the tiebreak — same input, same order, everywhere.
 */
export const sortPlayers = (list: Player[]): Player[] =>
  [...list].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
