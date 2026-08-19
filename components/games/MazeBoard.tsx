"use client";

import { E, N, S, W, solve, type Maze, type Run } from "@/lib/maze.ts";

const C = 32;

const centre = (maze: Maze, cell: number) => ({
  x: (cell % maze.w) * C + C / 2,
  y: ((cell / maze.w) | 0) * C + C / 2,
});

export default function MazeBoard({
  maze,
  run,
  blind,
}: {
  maze: Maze;
  run: Run;

  blind: boolean;
}) {
  const dim = maze.w * C;
  const runner = centre(maze, run.pos);
  const won = run.finishedAt > 0;
  const path = won ? solve(maze) : [];

  return (
    <svg
      viewBox={`-4 -4 ${dim + 8} ${dim + 8}`}
      className="h-auto w-full max-w-[min(88vw,540px)] select-none"
    >
      <defs>
        <radialGradient id="lamp">
          <stop offset="0%" stopColor="#39ff88" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#39ff88" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#39ff88" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x={-4} y={-4} width={dim + 8} height={dim + 8} rx={6} fill="#05020c" />

      {!blind &&
        run.trail.map((cell, i) => {
          const { x, y } = centre(maze, cell);
          return (
            <circle key={`${cell}-${i}`} cx={x} cy={y} r={3} fill="#39ff88" opacity={(i + 1) / run.trail.length * 0.35} />
          );
        })}

      {!blind && (
        <>
          <rect
            className="exit-glow"
            x={(maze.exit % maze.w) * C + 3}
            y={((maze.exit / maze.w) | 0) * C + 3}
            width={C - 6}
            height={C - 6}
            rx={4}
            fill="#39ff88"
          />
          {maze.traps.map((cell) => {
            const { x, y } = centre(maze, cell);
            return (
              <g key={cell} className="menace">
                {[0, 45, 90, 135].map((a) => (
                  <line
                    key={a}
                    x1={x - 8} y1={y} x2={x + 8} y2={y}
                    stroke="#ff2e63" strokeWidth={2} strokeLinecap="round"
                    transform={`rotate(${a}, ${x}, ${y})`}
                  />
                ))}
                <circle cx={x} cy={y} r={5} fill="#ff2e63" />
              </g>
            );
          })}
        </>
      )}

      {!blind &&
        maze.walls.map((w, i) => {
          const col = i % maze.w;
          const row = (i / maze.w) | 0;
          const x = col * C;
          const y = row * C;
          return (
            <g key={i} stroke="#6d4bd6" strokeWidth={3} strokeLinecap="round">
              {!!(w & N) && <line x1={x} y1={y} x2={x + C} y2={y} />}
              {!!(w & W) && <line x1={x} y1={y} x2={x} y2={y + C} />}
              {!!(w & E) && col === maze.w - 1 && <line x1={x + C} y1={y} x2={x + C} y2={y + C} />}
              {!!(w & S) && row === maze.h - 1 && <line x1={x} y1={y + C} x2={x + C} y2={y + C} />}
            </g>
          );
        })}

      {won && (
        <polyline
          className="draw-path"
          style={{ "--len": `${path.length * C}` } as React.CSSProperties}
          points={path.map((cell) => { const p = centre(maze, cell); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="#39ff88"
          strokeWidth={3}
          strokeOpacity={0.65}
          strokeLinejoin="round"
        />
      )}

      {run.lastTrap >= 0 && (
        <circle
          key={run.traps}
          className="trap-blast"
          cx={centre(maze, run.lastTrap).x}
          cy={centre(maze, run.lastTrap).y}
          r={3}
          fill="none"
          stroke="#ff2e63"
        />
      )}

      <g style={{ transform: `translate(${runner.x}px, ${runner.y}px)`, transition: "transform 90ms linear" }}>
        <circle className="torch" r={C * 1.8} fill="url(#lamp)" />
        <circle r={6} fill="#39ff88" />
        <circle r={2.5} fill="#ecfdf5" />

        {run.bumps > 0 && (
          <circle key={run.bumps} className="bump-ring" r={5} fill="none" stroke="#fca5a5" />
        )}
      </g>
    </svg>
  );
}
