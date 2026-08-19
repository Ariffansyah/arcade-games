"use client";

import { hullBox, isSunk, shipAt, type Fleet } from "@/lib/battleship.ts";

const CELL = 34;

export const FLIGHT = 600;
const PAD = 14;
const LETTERS = "ABCDEFGHIJ";

function Hull({ cells, size, sunk }: { cells: number[]; size: number; sunk: boolean }) {
  const { w, h, transform } = hullBox(cells, size, CELL, 4);
  const bow = Math.min(h * 0.9, w * 0.35);
  const r = h * 0.35;
  const d = `M0,${r} Q0,0 ${r},0 H${w - bow} Q${w},${h / 2} ${w - bow},${h} H${r} Q0,${h} 0,${h - r} Z`;

  return (
    <g transform={transform}>
      <path d={d} fill={sunk ? "#5c0f2a" : "#b3a3e6"} stroke={sunk ? "#2b0713" : "#2f1f57"} strokeWidth={1.5} />
      <rect x={w * 0.2} y={h * 0.28} width={w * 0.22} height={h * 0.44} rx={2} fill={sunk ? "#2b0713" : "#4a3480"} />
      {cells.length > 2 && <circle cx={w * 0.62} cy={h / 2} r={h * 0.16} fill={sunk ? "#2b0713" : "#4a3480"} />}
    </g>
  );
}

function Missile({
  x0,
  y0,
  x1,
  y1,
}: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}) {
  const rot = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;

  return (
    <g
      className="rocket"
      style={
        {
          "--x0": `${x0}px`,
          "--y0": `${y0}px`,
          "--x1": `${x1}px`,
          "--y1": `${y1}px`,
          "--rot": `${rot}deg`,
          "--flight": `${FLIGHT}ms`,
        } as React.CSSProperties
      }
    >
      <path className="rocket-flame" d="M-3.5,-4 L-16.5,0 L-3.5,4 Z" fill="#ffc83d" />
      <path
        d="M-3.5,-4 L9.5,-4 L16.5,0 L9.5,4 L-3.5,4 Z"
        fill="#e4e4e7"
        stroke="#52525b"
        strokeWidth={1}
      />
      <path d="M-3.5,-4 L-7.5,-8 L-0.5,-4 Z M-3.5,4 L-7.5,8 L-0.5,4 Z" fill="#ff2d95" />
    </g>
  );
}

export default function ShipBoard({
  fleet,
  size,
  showShips,
  onFire,
}: {
  fleet: Fleet;
  size: number;
  showShips: boolean;
  onFire?: (cell: number) => void;
}) {
  const dim = size * CELL;
  const newest = fleet.shots.at(-1);
  const delay = { "--delay": `${FLIGHT}ms` } as React.CSSProperties;

  const centre = (cell: number) => ({
    cx: (cell % size) * CELL + CELL / 2,
    cy: ((cell / size) | 0) * CELL + CELL / 2,
  });

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${dim + PAD} ${dim + PAD}`}
      className="h-auto w-full max-w-[340px] touch-manipulation"
      role="grid"
    >
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1f4d" />
          <stop offset="100%" stopColor="#04081f" />
        </linearGradient>
      </defs>

      <rect width={dim} height={dim} rx={4} fill="url(#sea)" />
      {Array.from({ length: size - 1 }, (_, i) => (
        <g key={i} stroke="#1e5fb0" strokeWidth={0.75}>
          <line x1={(i + 1) * CELL} y1={0} x2={(i + 1) * CELL} y2={dim} />
          <line x1={0} y1={(i + 1) * CELL} x2={dim} y2={(i + 1) * CELL} />
        </g>
      ))}

      {Array.from({ length: size }, (_, i) => (
        <g key={i} fill="#8b76c9" fontSize={9}>
          <text x={i * CELL + CELL / 2} y={-4} textAnchor="middle">{LETTERS[i]}</text>
          <text x={-5} y={i * CELL + CELL / 2 + 3} textAnchor="end">{i + 1}</text>
        </g>
      ))}

      {fleet.ships
        .filter((ship) => showShips || isSunk(fleet, ship))
        .map((ship) => (
          <Hull key={ship[0]} cells={ship} size={size} sunk={isSunk(fleet, ship)} />
        ))}

      {fleet.ships
        .filter((ship) => isSunk(fleet, ship))
        .flatMap((ship) =>
          ship.map((cell, i) => {
            const { cx, cy } = centre(cell);
            return (
              <circle
                key={`smoke-${cell}`}
                className="smoke"
                cx={cx}
                cy={cy - 4}
                r={5}
                fill="#e4e4e7"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            );
          })
        )}

      {fleet.shots.map((cell) => {
        const { cx, cy } = centre(cell);
        const fresh = cell === newest;
        return shipAt(fleet, cell) ? (

          <g key={cell} transform={`translate(${cx}, ${cy})`}>
            <g className={fresh ? "burst" : undefined} style={fresh ? delay : undefined}>
              <polygon
                points="0,-11 3,-4 10,-6 5,0 10,6 3,4 0,11 -3,4 -10,6 -5,0 -10,-6 -3,-4"
                fill="#ff2d95"
              />
              <circle r={4} fill="#ffc83d" />
            </g>
          </g>
        ) : (
          <g key={cell}>
            <circle
              className={fresh ? "on-impact" : undefined}
              style={fresh ? delay : undefined}
              cx={cx}
              cy={cy}
              r={3}
              fill="#22d3ee"
              opacity={0.8}
            />
            {fresh && (
              <circle
                className="splash-ring"
                style={delay}
                cx={cx}
                cy={cy}
                r={2}
                fill="none"
                stroke="#e0f2fe"
              />
            )}
          </g>
        );
      })}

      {newest !== undefined && (
        <Missile
          key={`in-${newest}`}
          x0={dim / 2}
          y0={dim + 40}
          {...{ x1: centre(newest).cx, y1: centre(newest).cy }}
        />
      )}

      {onFire &&
        Array.from({ length: size * size }, (_, i) =>
          fleet.shots.includes(i) ? null : (
            <rect
              key={i}
              className="shot-target"
              x={(i % size) * CELL}
              y={((i / size) | 0) * CELL}
              width={CELL}
              height={CELL}
              onClick={() => onFire(i)}
            />
          )
        )}
    </svg>
  );
}
