"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DIFFICULTY,
  LAMPS,
  LEVER,
  SWITCHES,
  accepts,
  actText,
  altitudeAt,
  condText,
  expected,
  holderFor,
  makePlan,
  worldAt,
  type Difficulty,
} from "@/lib/mayday.ts";
import { useBroadcast } from "@/lib/useBroadcast";
import type { GameProps } from "@/lib/useRoom";

type Table = {
  round: number;
  seed: string;
  difficulty: Difficulty;

  order: string[];
  startedAt: number;

  step: number;

  hits: number;
  result: "live" | "landed" | "crash";

  saved: number;
};

const normalize = (t: Table): Table => ({ ...t, step: t.step ?? 0, hits: t.hits ?? 0 });

export default function Mayday({ code, players, me }: GameProps) {
  const [table, setTable] = useState<Table | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  const host = players[0];
  const isHost = host?.id === me.id;
  const plan = table ? makePlan(table.seed, table.round, table.difficulty) : null;
  const pilot = table ? holderFor(table.order, table.round) : "";
  const flying = pilot === me.id;
  const live = table?.result === "live";
  const world = plan && table ? worldAt(plan, table.step) : null;
  const step = plan && table ? plan.steps[table.step] : null;
  const altitude = table
    ? altitudeAt(table.difficulty, (live ? now : table.startedAt) - table.startedAt, table.hits)
    : 0;

  const publish = useBroadcast<Table>(`mayday:${code}`, "table", (t) => setTable(normalize(t)));

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
      if (altitudeAt(table.difficulty, Date.now() - table.startedAt, table.hits) <= 0)
        send({ ...table, result: "crash" });
    }, 250);
    return () => clearInterval(id);
  }, [isHost, table, send]);

  const act = (input: number) => {
    if (!table || !plan || !world || !step || !live || !flying) return;
    if (!accepts(step, plan.readings, world, input)) {
      const hits = table.hits + 1;
      const crashed =
        altitudeAt(table.difficulty, Date.now() - table.startedAt, hits) <= 0;
      send({ ...table, hits, result: crashed ? "crash" : "live" });
      return;
    }
    const done = table.step + 1;
    const landed = done >= plan.steps.length;
    send({
      ...table,
      step: done,
      result: landed ? "landed" : "live",
      saved: table.saved + (landed ? 1 : 0),
    });
  };

  const start = () => {
    const round = (table?.round ?? 0) + 1;
    send({
      round,
      seed: `${code}-${Date.now()}`,
      difficulty,
      order: players.map((p) => p.id),
      startedAt: Date.now(),
      step: 0,
      hits: 0,
      result: "live",
      saved: table?.saved ?? 0,
    });
  };

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "someone";

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5">
      <p className="text-center text-sm text-zinc-400">
        One of you is in the seat and can see the instruments. Everyone else has the emergency
        checklist. <span className="text-emerald-400">Talk.</span>
      </p>
      <p className="text-center text-xs text-zinc-600">
        The checklist runs in order, and every step you finish changes the aeroplane the next one
        is read against. Height is the clock; a wrong switch costs a chunk of it.
      </p>

      {table && plan && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
          <span className="text-zinc-400">
            Landed <span className="neon-green">{table.saved}</span>
          </span>
          <span className="text-zinc-500">
            {flying ? "you have the controls" : `${name(pilot)} has the controls`}
          </span>
          <span className="text-zinc-500">
            {DIFFICULTY[table.difficulty].label} · run {table.round}
          </span>
        </div>
      )}

      {table && plan && world && (
        <div
          className={`bomb-case flex w-full flex-col gap-4 p-5 ${
            table.result === "crash" ? "shake" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="pixel text-[0.5rem] text-zinc-500">
              Step {Math.min(table.step + 1, plan.steps.length)} of {plan.steps.length}
            </span>
            <span
              className={`readout px-3 py-1 font-mono text-2xl leading-none ${
                altitude < 3_000 && live ? "blink" : ""
              }`}
              aria-label={`${altitude} feet`}
            >
              {altitude.toLocaleString()} ft
            </span>
          </div>

          {flying ? (
            <Cockpit plan={plan} world={world} live={live} onAct={act} />
          ) : (
            <Checklist plan={plan} step={table.step} live={live} />
          )}

          {!live && (
            <p
              className={`text-center text-sm ${
                table.result === "landed" ? "flash-win text-emerald-400" : "text-red-400"
              }`}
            >
              {table.result === "landed"
                ? `Down in one piece, ${table.hits} mistake${table.hits === 1 ? "" : "s"}.`
                : `Ground. Step ${table.step + 1} wanted you to ${actText(
                    expected(plan.steps[table.step], plan.readings, world)
                  )}.`}
            </p>
          )}
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
                  d === difficulty
                    ? "border-emerald-600 text-emerald-400"
                    : "border-zinc-800 text-zinc-500"
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
            {table ? "Next run" : "Start"}
          </button>
        </div>
      ) : (
        !table && <span className="blink text-sm text-zinc-500">Waiting for {host?.name}…</span>
      )}
    </div>
  );
}

function Cockpit({
  plan,
  world,
  live,
  onAct,
}: {
  plan: ReturnType<typeof makePlan>;
  world: ReturnType<typeof worldAt>;
  live: boolean;
  onAct: (input: number) => void;
}) {
  const { fuel, speed, heading, lamps } = plan.readings;
  return (
    <div className="flex flex-col gap-4">
      <div className="bomb-mod grid grid-cols-3 gap-3 p-4 text-center">
        {[
          ["FUEL", `${fuel}`],
          ["SPEED", `${speed}`],
          ["HDG", `${heading}°`],
        ].map(([label, value]) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className="pixel text-[0.45rem] text-zinc-600">{label}</span>
            <span className="font-mono text-xl text-emerald-400">{value}</span>
          </div>
        ))}
      </div>

      <div className="bomb-mod flex items-center justify-center gap-6 p-3">
        {LAMPS.map((lamp, i) => (
          <span key={lamp} className="flex items-center gap-2">
            <span className={`led ${lamps[i] ? "led-red" : ""}`} />
            <span className="pixel text-[0.45rem] text-zinc-500">{lamp}</span>
          </span>
        ))}
      </div>

      <div className="bomb-mod grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">
        {SWITCHES.map((label, i) => (
          <button
            key={label}
            onClick={() => onAct(i)}
            disabled={!live}
            aria-label={`${label} switch, currently ${world.switches[i] ? "on" : "off"}`}
            className="flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <span className="pixel text-[0.45rem] text-zinc-500">{label}</span>
            <span
              className={`flex h-9 w-6 rounded-sm border border-zinc-700 bg-zinc-950 p-0.5 ${
                world.switches[i] ? "items-start" : "items-end"
              }`}
            >
              <span
                className={`h-4 w-full rounded-sm ${
                  world.switches[i] ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              />
            </span>
          </button>
        ))}
      </div>

      <div className="bomb-mod flex items-center justify-center gap-3 p-4">
        <span className="pixel text-[0.45rem] text-zinc-500">FLAP</span>
        {LEVER.map((slot, p) => (
          <button
            key={slot}
            onClick={() => onAct(100 + p)}
            disabled={!live}
            aria-label={`Set the flap lever to ${slot}`}
            className={`rounded-sm border px-3 py-1 font-mono text-xs disabled:opacity-50 ${
              world.lever === p
                ? "border-emerald-600 text-emerald-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}

function Checklist({
  plan,
  step,
  live,
}: {
  plan: ReturnType<typeof makePlan>;
  step: number;
  live: boolean;
}) {
  return (
    <div className="manual flex flex-col gap-3 p-5">
      <span className="pixel text-[0.5rem] text-[color:var(--neon-amber)]">
        Emergency checklist
      </span>
      <ol className="flex flex-col gap-2 text-sm">
        {plan.steps.map((s, i) => (
          <li
            key={i}
            className={`flex gap-2 ${
              i === step && live
                ? "text-zinc-100"
                : i < step
                  ? "text-zinc-700 line-through"
                  : "text-zinc-500"
            }`}
          >
            <span className="text-zinc-600">{i + 1}.</span>
            <span>
              If {condText(s.when)}, {actText(s.then)}. Otherwise {actText(s.else)}.
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-zinc-600">
        You cannot see the panel. Ask before every step — the switches move as you go, so an
        answer from step two is worthless by step five.
      </p>
    </div>
  );
}
