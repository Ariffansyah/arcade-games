"use client";

import { useId } from "react";
import type { GameInfo } from "@/lib/games";

const C = {
  pink: "#ff2d95",
  cyan: "#22d3ee",
  amber: "#ffc83d",
  green: "#39ff88",
  violet: "#a78bfa",
  orange: "#fb923c",
  red: "#ff2e63",
  blue: "#5b7bff",
  ink: "#120b22",
};

type Art = { sky: string; line: string; draw: () => React.ReactNode };

// Shapes inherit fill="none" from the art group, so only solid parts set a fill.
const line = (colour: string, width = 2.5) => ({
  stroke: colour,
  strokeWidth: width,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const pips = (cx: number, cy: number, n: number, colour: string) => {
  const at: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-7, -7],
      [7, 7],
    ],
    3: [
      [-7, -7],
      [0, 0],
      [7, 7],
    ],
    4: [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ],
    5: [
      [-7, -7],
      [7, -7],
      [0, 0],
      [-7, 7],
      [7, 7],
    ],
    6: [
      [-7, -8],
      [7, -8],
      [-7, 0],
      [7, 0],
      [-7, 8],
      [7, 8],
    ],
  };
  return at[n].map(([x, y], i) => <circle key={i} cx={cx + x} cy={cy + y} r={2.6} fill={colour} />);
};

// One neon sign per cabinet, drawn on a 240×140 card.
const ART: Record<string, Art> = {
  lastcard: {
    sky: C.pink,
    line: C.cyan,
    draw: () =>
      [
        [-22, C.red],
        [0, C.amber],
        [22, C.cyan],
      ].map(([r, colour]) => (
        <g key={r} transform={`rotate(${r} 120 118)`}>
          <rect
            x={102}
            y={34}
            width={36}
            height={54}
            rx={6}
            fill={C.ink}
            {...line(colour as string)}
          />
          <ellipse
            cx={120}
            cy={61}
            rx={10}
            ry={18}
            transform="rotate(28 120 61)"
            {...line(colour as string, 2)}
          />
        </g>
      )),
  },
  poker: {
    sky: C.green,
    line: C.pink,
    draw: () => (
      <>
        {(
          [
            [-12, 84, C.cyan, "\u2660"],
            [10, 116, C.pink, "\u2665"],
          ] as const
        ).map(([r, x, colour, s]) => (
          <g key={s} transform={`rotate(${r} ${x + 20} 100)`}>
            <rect x={x} y={34} width={40} height={58} rx={5} fill={C.ink} {...line(colour)} />
            <text x={x + 20} y={72} textAnchor="middle" fontSize={26} fill={colour}>
              {`${s}\uFE0E`}
            </text>
          </g>
        ))}
        <circle cx={166} cy={96} r={14} fill={C.ink} {...line(C.amber)} />
        <circle cx={166} cy={96} r={8} {...line(C.amber, 1.6)} strokeDasharray="3 3" />
      </>
    ),
  },
  blackjack: {
    sky: C.cyan,
    line: C.amber,
    draw: () => (
      <>
        {(
          [
            [-10, 92, C.amber, "A"],
            [10, 128, C.red, "K"],
          ] as const
        ).map(([r, x, colour, face]) => (
          <g key={face} transform={`rotate(${r} ${x + 20} 100)`}>
            <rect x={x} y={44} width={40} height={58} rx={5} fill={C.ink} {...line(colour)} />
            <text x={x + 20} y={82} textAnchor="middle" fontSize={24} fill={colour}>
              {face}
            </text>
          </g>
        ))}
        <text x={120} y={34} textAnchor="middle" fontSize={22} fill={C.green}>
          21
        </text>
      </>
    ),
  },
  topple: {
    sky: C.orange,
    line: C.amber,
    draw: () =>
      Array.from({ length: 8 }, (_, row) => {
        const y = 100 - row * 9;
        return row % 2 ? (
          [0, 1, 2].map((k) => (
            <rect
              key={`${row}-${k}`}
              x={99 + k * 15 + (row === 3 && k === 1 ? 26 : 0)}
              y={y}
              width={12}
              height={7}
              rx={1.5}
              {...line(row === 3 && k === 1 ? C.pink : C.amber, 2)}
            />
          ))
        ) : (
          <rect key={row} x={99} y={y} width={42} height={7} rx={1.5} {...line(C.amber, 2)} />
        );
      }),
  },
  landlord: {
    sky: C.green,
    line: C.green,
    draw: () => (
      <>
        <path d="M78 98 V72 L94 58 L110 72 V98 Z" {...line(C.green)} />
        <rect x={89} y={84} width={10} height={14} {...line(C.green, 2)} />
        <path d="M120 98 V66 L141 52 L162 66 V98 Z" {...line(C.red)} />
        {[0, 1].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}${c}`}
              x={127 + c * 10}
              y={72 + r * 12}
              width={6}
              height={7}
              {...line(C.red, 1.6)}
            />
          ))
        )}
        <circle cx={168} cy={44} r={11} {...line(C.amber)} />
        <path
          d="M168 37 v14 M171.5 40 q-3.5 -3 -7 0 q0 3 3.5 4 q3.5 1 3.5 4 q-3.5 3 -7 0"
          {...line(C.amber, 1.6)}
        />
      </>
    ),
  },
  four: {
    sky: C.blue,
    line: C.blue,
    draw: () => (
      <>
        <rect x={82} y={34} width={76} height={62} rx={4} {...line(C.blue)} />
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const filled = (r === 3 && c < 3) || (r === 2 && c === 1) || (r === 2 && c === 3);
            const colour = (r + c) % 2 ? C.red : C.amber;
            return (
              <circle
                key={`${r}${c}`}
                cx={92 + c * 14}
                cy={45 + r * 14}
                r={5}
                fill={filled ? colour : "none"}
                stroke={filled ? colour : C.blue}
                strokeWidth={1.6}
              />
            );
          })
        )}
        <circle cx={134} cy={24} r={5} fill={C.red} />
        <path d="M134 14 v-4" {...line(C.red, 1.6)} />
        <path d="M76 100 h88" {...line(C.blue)} />
      </>
    ),
  },
  yacht: {
    sky: C.violet,
    line: C.violet,
    draw: () => (
      <>
        <g transform="rotate(-14 98 66)">
          <rect x={80} y={48} width={36} height={36} rx={7} fill={C.ink} {...line(C.violet)} />
          {pips(98, 66, 5, C.violet)}
        </g>
        <g transform="rotate(16 142 60)">
          <rect x={124} y={42} width={36} height={36} rx={7} fill={C.ink} {...line(C.pink)} />
          {pips(142, 60, 6, C.pink)}
        </g>
        <path d="M70 100 q50 -10 100 0" {...line(C.violet, 1.6)} />
      </>
    ),
  },
  bomb: {
    sky: C.red,
    line: C.red,
    draw: () => (
      <>
        <rect x={76} y={40} width={88} height={56} rx={5} {...line(C.amber)} />
        <rect x={88} y={50} width={40} height={18} rx={2} {...line(C.red)} />
        <path d="M93 54 v10 M100 54 v10 M109 54 v10 M116 54 v10" {...line(C.red, 1.6)} />
        <path d="M88 82 q20 -14 40 0" {...line(C.cyan)} />
        <path d="M88 88 q20 6 40 0" {...line(C.green)} />
        {[0, 1, 2].map((r) =>
          [0, 1].map((c) => (
            <rect
              key={`${r}${c}`}
              x={138 + c * 10}
              y={50 + r * 12}
              width={7}
              height={8}
              rx={1}
              {...line(C.amber, 1.4)}
            />
          ))
        )}
      </>
    ),
  },
  mayday: {
    sky: C.cyan,
    line: C.cyan,
    draw: () => (
      <>
        <path
          d="M78 74 L150 60 Q162 58 164 64 Q164 70 152 72 L132 76 L116 98 L106 98 L114 78 L94 82 L86 92 L80 92 L84 78 Z"
          {...line(C.cyan)}
        />
        <path d="M118 40 L132 64 L104 64 Z" {...line(C.red)} />
        <path d="M118 48 v8 M118 60 v0.5" {...line(C.red, 2.6)} />
        <path d="M60 100 q40 -2 60 4 t60 6" strokeDasharray="3 5" {...line(C.amber, 1.6)} />
      </>
    ),
  },
  doodle: {
    sky: C.violet,
    line: C.green,
    draw: () => (
      <>
        <path d="M70 92 q10 -40 26 -20 t24 -6 q12 -22 22 4" {...line(C.green)} />
        <path d="M84 60 l6 -10 l6 10 M108 60 l6 -10 l6 10" {...line(C.green, 2)} />
        <g transform="rotate(38 150 62)">
          <rect x={144} y={26} width={12} height={52} rx={2} {...line(C.amber)} />
          <path d="M144 78 L150 92 L156 78" {...line(C.amber)} />
          <path d="M144 34 h12" {...line(C.pink, 2)} />
        </g>
      </>
    ),
  },
  maze: {
    sky: C.green,
    line: C.green,
    draw: () => (
      <>
        <path
          d="M84 30 H156 V100 H84 V44 M98 30 V58 H112 M126 44 H142 V86 M84 72 H112 V86 H126 M98 86 V100 M142 58 H126 V72"
          {...line(C.green)}
        />
        <circle cx={91} cy={93} r={4} fill={C.pink} />
        <path d="M91 93 h14 v-14 h-7 v-14 h7" strokeDasharray="2 4" {...line(C.pink, 1.6)} />
      </>
    ),
  },
  ships: {
    sky: C.blue,
    line: C.cyan,
    draw: () => (
      <>
        {[18, 30, 42].map((r) => (
          <circle key={r} cx={160} cy={52} r={r} {...line(C.green, 1.2)} opacity={0.6} />
        ))}
        <path d="M160 52 l28 -18" {...line(C.green, 1.6)} />
        <circle cx={172} cy={44} r={3} fill={C.red} />
        <path d="M64 86 H140 L132 98 H72 Z" {...line(C.cyan)} />
        <path
          d="M80 86 V76 H104 V86 M110 86 V70 H124 V86 M90 76 V66 H98 V76"
          {...line(C.cyan, 2)}
        />
        <path d="M116 70 V58" {...line(C.cyan, 2)} />
        <path d="M58 104 q12 -5 24 0 t24 0 t24 0 t24 0" {...line(C.blue, 1.6)} />
      </>
    ),
  },
  fuse: {
    sky: C.orange,
    line: C.orange,
    draw: () => (
      <>
        <circle cx={112} cy={74} r={26} fill={C.ink} {...line(C.violet)} />
        <rect
          x={120}
          y={42}
          width={14}
          height={10}
          rx={2}
          transform="rotate(38 127 47)"
          {...line(C.violet)}
        />
        <path d="M134 40 q10 -14 22 -8" {...line(C.amber, 2)} />
        <path
          d="M158 30 l4 -10 M158 30 l11 -4 M158 30 l9 6 M158 30 l-2 -11"
          {...line(C.orange, 2)}
        />
        <path d="M100 64 a14 14 0 0 1 10 -8" {...line(C.violet, 2)} opacity={0.7} />
      </>
    ),
  },
  draw: {
    sky: C.green,
    line: C.amber,
    draw: () => (
      <>
        <rect x={106} y={24} width={28} height={74} rx={8} {...line(C.amber)} />
        <circle cx={120} cy={41} r={8} {...line(C.red, 2)} />
        <circle cx={120} cy={61} r={8} {...line(C.amber, 2)} />
        <circle cx={120} cy={81} r={8} fill={C.green} stroke={C.green} strokeWidth={2} />
        <path d="M72 62 h20 M68 72 h22 M148 62 h20 M150 72 h22" {...line(C.cyan, 2)} />
      </>
    ),
  },
  dial: {
    sky: C.pink,
    line: C.pink,
    draw: () => (
      <>
        {[C.blue, C.cyan, C.green, C.amber, C.red].map((colour, i) => {
          const a0 = Math.PI + (i * Math.PI) / 5;
          const a1 = a0 + Math.PI / 5;
          const r = 46;
          return (
            <path
              key={colour}
              d={`M${120 + Math.cos(a0) * r} ${96 + Math.sin(a0) * r} A${r} ${r} 0 0 1 ${120 + Math.cos(a1) * r} ${96 + Math.sin(a1) * r}`}
              {...line(colour, 6)}
              strokeLinecap="butt"
            />
          );
        })}
        <path d="M120 96 L146 62" {...line(C.pink, 3)} />
        <circle cx={120} cy={96} r={5} fill={C.pink} />
      </>
    ),
  },
  chain: {
    sky: C.cyan,
    line: C.cyan,
    draw: () =>
      [
        [96, 42, C.red, false],
        [124, 42, C.green, true],
        [96, 70, C.blue, false],
        [124, 70, C.amber, false],
      ].map(([x, y, colour, lit]) => (
        <rect
          key={colour as string}
          x={x as number}
          y={y as number}
          width={22}
          height={22}
          rx={6}
          fill={lit ? (colour as string) : "none"}
          {...(lit ? {} : line(colour as string))}
        />
      )),
  },
  scatter: {
    sky: C.amber,
    line: C.amber,
    draw: () => (
      <>
        {[
          ["A", 84, 48, -12, C.pink],
          ["?", 116, 40, 8, C.cyan],
          ["Z", 146, 54, 16, C.green],
        ].map(([ch, x, y, r, colour]) => (
          <g
            key={ch as string}
            transform={`rotate(${r} ${(x as number) + 12} ${(y as number) + 12})`}
          >
            <rect
              x={x as number}
              y={y as number}
              width={24}
              height={24}
              rx={3}
              fill={C.ink}
              {...line(colour as string)}
            />
            <text
              x={(x as number) + 12}
              y={(y as number) + 18}
              textAnchor="middle"
              fontSize={16}
              fontFamily="var(--font-press-start), monospace"
              fill={colour as string}
            >
              {ch}
            </text>
          </g>
        ))}
        <circle cx={120} cy={92} r={11} {...line(C.amber)} />
        <path d="M120 92 v-6 M120 92 l5 3 M117 78 h6" {...line(C.amber, 2)} />
      </>
    ),
  },
  thirds: {
    sky: C.violet,
    line: C.pink,
    draw: () => (
      <>
        {[36, 26, 16, 6].map((r, i) => (
          <circle key={r} cx={112} cy={68} r={r} {...line(i % 2 ? C.cyan : C.pink, 2.2)} />
        ))}
        <path d="M112 68 L160 36" {...line(C.amber, 2)} />
        <path d="M160 36 l-2 -9 M160 36 l9 -2" {...line(C.amber, 2)} />
        <text
          x={164}
          y={84}
          fontSize={18}
          fontFamily="var(--font-press-start), monospace"
          fill={C.green}
        >
          ⅔
        </text>
      </>
    ),
  },
  tug: {
    sky: C.red,
    line: C.amber,
    draw: () => (
      <>
        <path d="M56 70 q16 -6 32 0 t32 0 t32 0 t32 0" {...line(C.amber, 3)} />
        <path d="M120 70 v14 l10 -5 l-10 -5" {...line(C.pink, 2)} />
        <path d="M70 52 l-14 18 l14 18 M170 52 l14 18 l-14 18" {...line(C.cyan)} />
        <path d="M120 40 v10 M114 100 h12" {...line(C.violet, 2)} />
      </>
    ),
  },
  typerace: {
    sky: C.cyan,
    line: C.cyan,
    draw: () => (
      <>
        <rect x={70} y={52} width={100} height={46} rx={5} {...line(C.cyan)} />
        {[0, 1, 2].map((r) =>
          Array.from({ length: 7 - r }, (_, c) => (
            <rect
              key={`${r}${c}`}
              x={78 + r * 6 + c * 12.5}
              y={59 + r * 11}
              width={9}
              height={8}
              rx={1.5}
              {...line(r === 1 && c === 3 ? C.pink : C.cyan, 1.4)}
            />
          ))
        )}
        <rect x={96} y={89} width={48} height={5} rx={1.5} {...line(C.cyan, 1.4)} />
        <path d="M150 40 l22 -10 M156 46 l26 -8 M142 36 l16 -12" {...line(C.amber, 2)} />
      </>
    ),
  },
  imposter: {
    sky: C.violet,
    line: C.violet,
    draw: () =>
      [
        [80, C.violet, false],
        [120, C.pink, true],
        [160, C.violet, false],
      ].map(([x, colour, odd]) => (
        <g key={x as number}>
          <circle cx={x as number} cy={odd ? 50 : 56} r={10} {...line(colour as string)} />
          <path
            d={`M${(x as number) - 16} ${odd ? 96 : 100} q0 -28 16 -28 q16 0 16 28`}
            {...line(colour as string)}
          />
          {odd && (
            <text
              x={x as number}
              y={32}
              textAnchor="middle"
              fontSize={14}
              fontFamily="var(--font-press-start), monospace"
              fill={C.amber}
            >
              ?
            </text>
          )}
        </g>
      )),
  },
  samepage: {
    sky: C.green,
    line: C.green,
    draw: () => (
      <>
        <path
          d="M74 40 h44 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-28 l-10 10 v-10 h-6 a6 6 0 0 1 -6 -6 v-24 a6 6 0 0 1 6 -6 Z"
          {...line(C.cyan)}
        />
        <path
          d="M166 52 h-44 a6 6 0 0 0 -6 6 v24 a6 6 0 0 0 6 6 h28 l10 10 v-10 h6 a6 6 0 0 0 6 -6 v-24 a6 6 0 0 0 -6 -6 Z"
          fill={C.ink}
          {...line(C.pink)}
        />
        <path d="M130 70 l8 8 l16 -16" {...line(C.green, 3)} />
      </>
    ),
  },
  tale: {
    sky: C.amber,
    line: C.amber,
    draw: () => (
      <>
        <path d="M120 98 q-22 -10 -48 -4 v-46 q26 -6 48 4 Z" {...line(C.amber)} />
        <path d="M120 98 q22 -10 48 -4 v-46 q-26 -6 -48 4 Z" {...line(C.amber)} />
        <path
          d="M82 62 q14 -3 28 2 M82 72 q14 -3 28 2 M130 64 q14 -5 28 -2 M130 74 q14 -5 28 -2"
          {...line(C.amber, 1.4)}
        />
        <path d="M110 34 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 Z" {...line(C.pink, 1.6)} />
        <path d="M138 24 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" {...line(C.cyan, 1.4)} />
      </>
    ),
  },
};

// Box art for a cabinet: its neon sign over a synthwave sun and floor, all drawn in code.
export default function Cover({ game, className = "" }: { game: GameInfo; className?: string }) {
  const id = useId();
  const art = ART[game.id];
  const sky = art?.sky ?? C.pink;
  const grid = art?.line ?? C.cyan;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 240 140"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#06030d" />
            <stop offset="0.72" stopColor={sky} stopOpacity="0.32" />
            <stop offset="1" stopColor="#06030d" />
          </linearGradient>
          <radialGradient id={`${id}sun`}>
            <stop offset="0" stopColor={sky} stopOpacity="0.45" />
            <stop offset="1" stopColor={sky} stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="240" height="140" fill={`url(#${id}bg)`} />
        <circle cx="120" cy="66" r="58" fill={`url(#${id}sun)`} />
        <g stroke={grid} strokeWidth="0.8" opacity="0.4">
          <path d="M0 108 H240" />
          {[-200, -100, -20, 50, 120, 190, 260, 340, 440].map((x) => (
            <path key={x} d={`M120 108 L${x} 140`} />
          ))}
          {[112, 118, 127].map((y) => (
            <path key={y} d={`M0 ${y} H240`} />
          ))}
        </g>
        <g
          filter={`url(#${id}glow)`}
          fill="none"
          transform="translate(120 70) scale(1.12) translate(-120 -66)"
        >
          {art ? (
            art.draw()
          ) : (
            <text x="120" y="80" textAnchor="middle" fontSize="40" fill={C.green}>
              {game.art}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
