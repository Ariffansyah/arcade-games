"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BUTTON_RULES,
  COLUMNS,
  DIFFICULTY,
  GLYPHS,
  KIND_NAMES,
  MEMORY_STEPS,
  STRIP_DIGIT,
  WORDS,
  WIRE_RULES,
  accepts,
  clock,
  fuseFor,
  holderFor,
  isDone,
  makeBomb,
  solveWires,
  stepText,
  target,
  wanted,
  type Bomb,
  type ButtonModule,
  type Difficulty,
  type KeypadModule,
  type MemoryModule,
  type Module,
  type PasswordModule,
  type WiresModule,
} from "@/lib/bomb.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Table = {
  round: number;
  seed: string;
  difficulty: Difficulty;

  order: string[];
  startedAt: number;

  done: number[][];
  strikes: number;
  result: "live" | "safe" | "boom";

  blame: number | null;

  saved: number;
};

const normalize = (t: Table): Table => ({
  ...t,
  done: Array.isArray(t.done) ? t.done.map((d) => (Array.isArray(d) ? d : [])) : [],
  strikes: t.strikes ?? 0,
});

const WIRE: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  white: "bg-zinc-200",
  green: "bg-emerald-500",
};

const STRIPE = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(0,0,0,.55) 0 4px, transparent 4px 9px)",
};
const BUTTON_FACE: Record<string, string> = {
  red: "bg-red-600 text-white",
  blue: "bg-blue-600 text-white",
  yellow: "bg-yellow-400 text-zinc-900",
  white: "bg-zinc-200 text-zinc-900",
};

export default function BombSquad({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [picked, setPicked] = useState({ seed: "", tab: 0 });
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  const [heldAt, setHeldAt] = useState<number | null>(null);

  const host = players[0];
  const isHost = host?.id === me.id;
  const bomb: Bomb | null = table ? makeBomb(table.seed, table.round, table.difficulty) : null;
  const holder = table ? holderFor(table.order, table.round) : "";
  const amHolder = holder === me.id;
  const live = table?.result === "live";
  const fuse = table ? fuseFor(table.difficulty, table.round) : 0;
  const left = table && live ? Math.max(0, table.startedAt + fuse - now) : 0;
  const seconds = Math.ceil(left / 1000);
  const allowed = table ? DIFFICULTY[table.difficulty].strikes : 0;
  const tab = picked.seed === table?.seed ? picked.tab : 0;
  const setTab = (i: number) => setPicked({ seed: table?.seed ?? "", tab: i });
  const active = bomb?.modules[tab] ?? null;

  const publish = useBroadcast<Table>(`bomb:${code}`, "table", (t) => setTable(normalize(t)));

  const send = useCallback(
    (next: Table) => {
      setTable(next);
      publish(next);
    },
    [publish]
  );

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!isHost || !table || table.result !== "live") return;
    const id = setInterval(() => {
      if (Date.now() > table.startedAt + fuseFor(table.difficulty, table.round))
        send({ ...table, result: "boom" });
    }, 250);
    return () => clearInterval(id);
  }, [isHost, table, send]);

  const feed = (index: number, input: number) => {
    if (!table || !bomb || !live || !amHolder) return;
    const m = bomb.modules[index];
    const soFar = table.done[index] ?? [];
    if (isDone(m, soFar)) return;

    if (!accepts(bomb, m, soFar, input, table.strikes)) {
      const strikes = table.strikes + 1;

      const done = table.done.map((d, i) => (i === index && m.kind === "memory" ? [] : d));
      send({
        ...table,
        done,
        strikes,
        blame: index,
        result: strikes > allowed ? "boom" : "live",
      });
      return;
    }

    const done = table.done.map((d, i) => (i === index ? [...(d ?? []), input] : d));
    const safe = bomb.modules.every((mm, i) => isDone(mm, done[i] ?? []));
    send({ ...table, done, result: safe ? "safe" : "live", saved: table.saved + (safe ? 1 : 0) });
  };

  const start = () => {
    const next = (table?.round ?? 0) + 1;
    const seed = `${code}-${Date.now()}`;
    send({
      round: next,
      seed,
      difficulty,
      order: players.map((p) => p.id),
      startedAt: Date.now(),
      done: makeBomb(seed, next, difficulty).modules.map(() => []),
      strikes: 0,
      result: "live",
      blame: null,
      saved: table?.saved ?? 0,
    });
  };

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        One of you holds the bomb and can see the modules and the serial. Everyone else has the
        manual and can see the rules. <span className="text-emerald-400">Talk.</span>
      </p>
      <p className="text-center text-xs text-zinc-600">
        The bomb is the opponent, not each other. Every module has to come down before the fuse
        does, and a wrong move is a strike, not always an explosion. Roles swap every round.
      </p>

      {table && bomb && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
          <span className="text-zinc-400">
            Defused <span className="neon-green">{table.saved}</span>
          </span>
          <span className="text-zinc-500">
            {amHolder ? "you are holding it" : `${name(holder)} is holding it`}
          </span>
          <span className="text-zinc-500">
            {DIFFICULTY[table.difficulty].label} · round {table.round}
          </span>
        </div>
      )}

      {table && bomb && amHolder && (
        <div
          className={`bomb-case flex w-full flex-col gap-4 p-5 ${
            table.result === "boom" ? "shake" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="bomb-serial px-2 py-1 font-mono text-[0.7rem]">{bomb.serial}</span>
            <span className="readout px-3 py-1 font-mono text-2xl leading-none">
              {live ? clock(seconds) : "0:00"}
            </span>
            <span
              className="flex gap-1.5"
              aria-label={`${table.strikes} of ${allowed} strikes used`}
            >
              {Array.from({ length: allowed }, (_, i) => (
                <span key={i} className={`led ${i < table.strikes ? "led-red" : ""}`} />
              ))}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {bomb.modules.map((m, i) => {
              const done = table.done[i] ?? [];
              const finished = isDone(m, done);
              return (
                <section
                  key={`${table.seed}-${i}`}
                  aria-label={`${KIND_NAMES[m.kind]} module`}
                  className={`bomb-mod flex flex-col gap-3 p-4 ${finished ? "bomb-mod-done" : ""} ${
                    m.kind === "wires" || m.kind === "password" ? "sm:col-span-2" : ""
                  }`}
                >
                  <header className="flex items-center justify-between">
                    <span className="pixel text-[0.5rem] text-zinc-500">
                      {KIND_NAMES[m.kind]}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[0.7rem] text-zinc-600">
                        {done.length}/{target(m)}
                      </span>
                      <span className={`led ${finished ? "led-green" : ""}`} />
                    </span>
                  </header>
                  <Panel
                    bomb={bomb}
                    module={m}
                    done={done}
                    live={live && !finished}
                    seconds={seconds}
                    heldAt={heldAt}
                    setHeldAt={setHeldAt}
                    onInput={(input) => feed(i, input)}
                  />
                </section>
              );
            })}
          </div>

          {!live && <Verdict table={table} bomb={bomb} allowed={allowed} />}
        </div>
      )}

      {table && bomb && !amHolder && (
        <div className="flex w-full flex-col">
          <nav className="flex flex-wrap gap-1 px-2">
            {bomb.modules.map((m, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`manual-tab px-3 py-1 text-xs ${i === tab ? "manual-tab-on" : ""}`}
              >
                {KIND_NAMES[m.kind]}
                {isDone(m, table.done[i] ?? []) ? " \u2713" : ""}
              </button>
            ))}
          </nav>

          <div className="manual flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="pixel text-[0.5rem] text-[color:var(--neon-amber)]">
                Defusal manual — section {tab + 1}
              </span>
              <span className="flex gap-1.5" aria-label={`${table.strikes} strikes`}>
                {Array.from({ length: allowed }, (_, i) => (
                  <span key={i} className={`led ${i < table.strikes ? "led-red" : ""}`} />
                ))}
              </span>
            </div>

            {active && <Manual module={active} />}

            {!live && <Verdict table={table} bomb={bomb} allowed={allowed} />}
          </div>
        </div>
      )}

      {isHost ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                disabled={live}
                title={DIFFICULTY[d].blurb}
                className={`rounded-sm border px-2 py-1 text-xs disabled:opacity-40 ${
                  d === difficulty ? "border-emerald-600 text-emerald-400" : "border-zinc-800 text-zinc-500"
                }`}
              >
                {DIFFICULTY[d].label}
              </button>
            ))}
          </div>
          <span className="text-center text-xs text-zinc-600">{DIFFICULTY[difficulty].blurb}</span>
          <button
            onClick={start}
            disabled={live}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            {table ? "Next bomb" : "Start"}
          </button>
        </div>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}

function Verdict({ table, bomb, allowed }: { table: Table; bomb: Bomb; allowed: number }) {
  const blown = table.blame !== null && table.strikes > allowed;
  const text =
    table.result === "safe"
      ? `Defused with ${table.strikes} strike${table.strikes === 1 ? "" : "s"}. Serial was ${bomb.serial}.`
      : blown
        ? `Boom. The ${KIND_NAMES[bomb.modules[table.blame!].kind]} wanted ${wanted(
            bomb,
            bomb.modules[table.blame!],
            table.done[table.blame!] ?? [],
            table.strikes - 1
          )}.`
        : `Time. ${bomb.modules
            .map((m, i) => [m, i] as const)
            .filter(([m, i]) => !isDone(m, table.done[i] ?? []))
            .map(
              ([m, i]) =>
                `${KIND_NAMES[m.kind]} wanted ${wanted(bomb, m, table.done[i] ?? [], table.strikes)}`
            )
            .join("; ")}.`;

  return (
    <p
      className={`text-center text-sm ${
        table.result === "safe" ? "flash-win text-emerald-400" : "text-red-400"
      }`}
    >
      {text}
    </p>
  );
}

type PanelProps = {
  bomb: Bomb;
  module: Module;
  done: number[];
  live: boolean;
  seconds: number;
  heldAt: number | null;
  setHeldAt: (t: number | null) => void;
  onInput: (input: number) => void;
};

function Panel(p: PanelProps) {
  switch (p.module.kind) {
    case "wires":
      return <WirePanel {...p} module={p.module} />;
    case "keypad":
      return <KeypadPanel {...p} module={p.module} />;
    case "button":
      return <ButtonPanel {...p} module={p.module} />;
    case "memory":
      return <MemoryPanel {...p} module={p.module} />;
    case "password":
      return <PasswordPanel {...p} module={p.module} />;
  }
}

function WirePanel({ bomb, module: m, done, live, onInput }: PanelProps & { module: WiresModule }) {
  const solved = solveWires(bomb, m, done);
  return (
    <ul className="flex flex-col gap-2">
      {m.wires.map((w, i) => {
        const snipped = done.includes(i);
        return (
          <li key={i} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-right font-mono text-sm text-zinc-500">{i + 1}</span>
            <button
              onClick={() => onInput(i)}
              disabled={!live || snipped}
              aria-label={`Cut wire ${i + 1}, ${w.color}${w.striped ? " striped" : ""}, number ${
                w.num
              }${snipped ? ", already cut" : ""}`}
              className="group flex flex-1 items-center gap-1 disabled:opacity-60"
            >
              <span className="wire-post h-4 w-2 shrink-0 rounded-sm" />

              <span className="relative flex h-3 flex-1 items-center">
                <span
                  className={`${WIRE[w.color]} h-full rounded-l-full ${
                    snipped ? "w-[28%]" : "w-full rounded-r-full"
                  } ${live && !snipped ? "group-hover:brightness-125" : ""}`}
                  style={w.striped ? STRIPE : undefined}
                />
                {snipped && (
                  <>
                    <span className="flex-1" />
                    <span
                      className={`${WIRE[w.color]} h-full w-[28%] rounded-r-full opacity-80`}
                      style={w.striped ? STRIPE : undefined}
                    />
                  </>
                )}
              </span>
              <span className="wire-post h-4 w-2 shrink-0 rounded-sm" />
              <span className="w-6 text-right font-mono text-sm text-zinc-300">{w.num}</span>
            </button>
          </li>
        );
      })}
      <li className="pt-1 text-center text-xs text-zinc-600">
        {solved.index < 0 ? "Panel clear." : `${m.stages - done.length} cut(s) to go.`}
      </li>
    </ul>
  );
}

function KeypadPanel({ module: m, done, live, onInput }: PanelProps & { module: KeypadModule }) {
  return (
    <div className="flex justify-center gap-3">
      {m.keys.map((g, i) => (
        <button
          key={i}
          onClick={() => onInput(i)}
          disabled={!live || done.includes(i)}
          aria-label={`Press the ${GLYPHS[g]} key`}
          className={`h-14 w-14 rounded-sm border text-2xl ${
            done.includes(i)
              ? "border-emerald-700 text-emerald-600"
              : "border-zinc-700 text-zinc-100 hover:border-zinc-400"
          } disabled:opacity-50`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function ButtonPanel({
  module: m,
  done,
  live,
  seconds,
  heldAt,
  setHeldAt,
  onInput,
}: PanelProps & { module: ButtonModule }) {
  const holding = heldAt !== null;

  const TAP_MS = 400;
  const release = () => {
    if (heldAt === null) return;
    const held = Date.now() - heldAt;
    setHeldAt(null);
    onInput(held < TAP_MS ? -1 : seconds);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onPointerDown={() => live && setHeldAt(Date.now())}
        onPointerUp={release}
        onPointerLeave={release}
        disabled={!live}
        aria-label={`${m.color} button reading ${m.label}. Tap it, or hold and release on the right second.`}
        className={`bomb-button h-28 w-28 rounded-full text-sm font-semibold ${
          BUTTON_FACE[m.color]
        } ${holding ? "held" : ""} disabled:opacity-60`}
      >
        {done.length ? "done" : m.label}
      </button>
      <div className="h-6">
        {holding && (
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            strip
            <span className={`h-4 w-10 rounded-sm ${WIRE[m.strip] ?? "bg-zinc-500"}`} />
            <span className="sr-only">{m.strip}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function MemoryPanel({ module: m, done, live, onInput }: PanelProps & { module: MemoryModule }) {
  const stage = Math.min(done.length, m.stages.length - 1);
  const here = m.stages[stage];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="pixel text-[0.55rem] text-zinc-500">Stage {stage + 1} of 5</span>
        <span className="rounded-sm border border-zinc-700 px-4 py-2 font-mono text-2xl text-emerald-400">
          {here.display}
        </span>
      </div>
      <div className="flex gap-3">
        {here.labels.map((label, i) => (
          <button
            key={i}
            onClick={() => onInput(i)}
            disabled={!live}
            aria-label={`Position ${i + 1}, labelled ${label}`}
            className="h-14 w-14 rounded-sm border border-zinc-700 font-mono text-xl text-zinc-100 hover:border-zinc-400 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-xs text-zinc-600">
        Positions are left to right. A strike wipes the panel back to stage one.
      </span>
    </div>
  );
}

function PasswordPanel({ module: m, done, live, onInput }: PanelProps & { module: PasswordModule }) {
  const [at, setAt] = useState([0, 0, 0, 0, 0]);
  const spun = (i: number, step: number) =>
    setAt(at.map((v, k) => (k === i ? (v + step + m.columns[k].length) % m.columns[k].length : v)));
  const word = m.columns.map((c, i) => c[at[i]]).join("");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {m.columns.map((column, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button
              onClick={() => spun(i, -1)}
              disabled={!live}
              aria-label={`Spinner ${i + 1} up`}
              className="text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
            >
              ▲
            </button>
            <span className="w-9 rounded-sm border border-zinc-700 bg-zinc-950 py-1 text-center font-mono text-xl text-emerald-400">
              {column[at[i]]}
            </span>
            <button
              onClick={() => spun(i, 1)}
              disabled={!live}
              aria-label={`Spinner ${i + 1} down`}
              className="text-xs text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
            >
              ▼
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onInput(WORDS.indexOf(word))}
        disabled={!live}
        aria-label={`Submit the password ${word}`}
        className="btn-arcade rounded-sm px-3 py-1 text-xs disabled:opacity-40"
      >
        {done.length ? "accepted" : "submit"}
      </button>
    </div>
  );
}

function Manual({ module: m }: { module: Module }) {
  if (m.kind === "wires")
    return (
      <ol className="flex flex-col gap-2 font-sans text-sm text-zinc-300">
        {WIRE_RULES.map((rule, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-zinc-600">{i + 1}.</span>
            {rule}
          </li>
        ))}
        <li className="pt-1 text-xs text-zinc-600">
          Ask for the serial once, then for every wire: colour, striped or not, and its number. A
          cut wire stops counting, so re-read the list after every cut.
        </li>
      </ol>
    );

  if (m.kind === "keypad")
    return (
      <div>
        <p className="pb-3 text-sm text-zinc-300">
          Exactly one column below holds all four of the holder&apos;s symbols. Find it, then have
          them pressed top to bottom in that column&apos;s order.
        </p>
        <div className="flex justify-center gap-6">
          {COLUMNS.map((column, c) => (
            <ol key={c} className="flex flex-col gap-1 text-center">
              {column.map((g) => (
                <li key={g} className="text-lg text-zinc-300" title={GLYPHS[g]}>
                  {g}
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    );

  if (m.kind === "button")
    return (
      <div className="flex flex-col gap-3 text-sm text-zinc-300">
        <ol className="flex flex-col gap-2">
          {BUTTON_RULES.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600">{i + 1}.</span>
              {rule}
            </li>
          ))}
        </ol>
        <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-400">
          <p className="pb-1 text-zinc-500">
            Holding lights a coloured strip. Let go when the countdown shows that digit anywhere.
          </p>
          <ul className="flex flex-wrap gap-x-4">
            {Object.entries(STRIP_DIGIT).map(([strip, digit]) => (
              <li key={strip}>
                {strip} strip → release on a {digit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

  if (m.kind === "password")
    return (
      <div className="text-sm text-zinc-300">
        <p className="pb-3">
          Five spinners, six letters each, and exactly one word below can be spelled on them. Ask
          which letters a spinner can reach and cross words off until one is left.
        </p>
        <ul className="grid grid-cols-4 gap-x-3 gap-y-1 font-mono text-xs text-zinc-400 sm:grid-cols-6">
          {WORDS.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="text-sm text-zinc-300">
      <p className="pb-3">
        Five stages. Ask for the big number, then say which position to press — the labels move
        every stage, so keep a note of what you pressed.
      </p>
      <div className="flex flex-col gap-2">
        {MEMORY_STEPS.map((stage, s) => (
          <div key={s} className="grid grid-cols-[auto_1fr] gap-2 text-xs">
            <span className="pixel text-[0.5rem] text-zinc-500">S{s + 1}</span>
            <ul className="flex flex-col gap-0.5">
              {stage.map((step, d) => (
                <li key={d}>
                  <span className="text-zinc-600">display {d + 1}:</span> {stepText(step)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
