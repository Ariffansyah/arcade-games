export const COLS = 7;
export const ROWS = 6;

export const DRAW = 2;

export type Four = {
  round: number;

  cols: number[][];
  turn: 0 | 1;
  winner: -1 | 0 | 1 | typeof DRAW;
  line: [number, number][];
  score: [number, number];
  last: number;
};

export const newFour = (round = 1, score: [number, number] = [0, 0]): Four => ({
  round,
  cols: Array.from({ length: COLS }, () => []),
  turn: round % 2 === 1 ? 0 : 1,
  winner: -1,
  line: [],
  score,
  last: -1,
});

function lineThrough(cols: number[][], c: number, r: number): [number, number][] | null {
  const who = cols[c][r];
  for (const [dc, dr] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]) {
    const run: [number, number][] = [[c, r]];
    for (const sign of [1, -1]) {
      let x = c + dc * sign;
      let y = r + dr * sign;
      while (y >= 0 && cols[x]?.[y] === who) {
        run.push([x, y]);
        x += dc * sign;
        y += dr * sign;
      }
    }
    if (run.length >= 4) return run;
  }
  return null;
}

export function drop(f: Four, col: number): Four {
  if (f.winner !== -1 || !f.cols[col] || f.cols[col].length >= ROWS) return f;
  const cols = f.cols.map((c, i) => (i === col ? [...c, f.turn] : c));
  const line = lineThrough(cols, col, cols[col].length - 1);
  if (line) {
    const score: [number, number] = [...f.score];
    score[f.turn]++;
    return { ...f, cols, line, score, winner: f.turn, last: col };
  }
  const full = cols.every((c) => c.length === ROWS);
  return {
    ...f,
    cols,
    last: col,
    winner: full ? DRAW : -1,
    turn: f.turn === 0 ? 1 : 0,
  };
}
