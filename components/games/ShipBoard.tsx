"use client";

import { hullBox, isSunk, shipAt, type Fleet } from "@/lib/battleship.ts";

const CELL = 34;
const PAD = 14; // gutter for the A-H / 1-8 labels
const LETTERS = "ABCDEFGHIJ";

/** One ship drawn as a hull with a pointed bow, rotated for vertical ships. */
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

      {/* Enemy hulls only surface once the whole ship is down. */}
      {fleet.ships
        .filter((ship) => showShips || isSunk(fleet, ship))
        .map((ship) => (
          <Hull key={ship[0]} cells={ship} size={size} sunk={isSunk(fleet, ship)} />
        ))}

      {/* Smoke off the wrecks. */}
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
          <g key={cell} transform={`translate(${cx}, ${cy})`} className={fresh ? "burst" : undefined}>
            <polygon
              points="0,-11 3,-4 10,-6 5,0 10,6 3,4 0,11 -3,4 -10,6 -5,0 -10,-6 -3,-4"
              fill="#ff2d95"
            />
            <circle r={4} fill="#ffc83d" />
          </g>
        ) : (
          <g key={cell}>
            <circle cx={cx} cy={cy} r={3} fill="#22d3ee" opacity={0.8} />
            {fresh && (
              <circle className="splash-ring" cx={cx} cy={cy} r={2} fill="none" stroke="#e0f2fe" />
            )}
          </g>
        );
      })}

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
