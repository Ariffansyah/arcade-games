"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  SHIPS,
  TURN_MS,
  fire,
  isSunk,
  newGame,
  randomFleet,
  setReady,
  timeout,
  type Battleship,
  type Fleet,
} from "@/lib/battleship.ts";
import ShipBoard, { FLIGHT } from "./ShipBoard";
import type { GameProps } from "@/lib/useRoom";

function report(fleet: Fleet) {
  const hits = fleet.shots.filter((c) => fleet.ships.some((s) => s.includes(c))).length;
  const sunk = fleet.ships.filter((s) => isSunk(fleet, s)).length;
  return {
    shots: fleet.shots.length,
    hits,
    misses: fleet.shots.length - hits,
    accuracy: fleet.shots.length ? Math.round((hits / fleet.shots.length) * 100) : 0,
    sunk,
    afloat: fleet.ships.length - sunk,

    remaining: fleet.ships.filter((s) => !isSunk(fleet, s)).map((s) => s.length).sort((a, b) => b - a),
  };
}

function Panel({ label, data }: { label: string; data: ReturnType<typeof report> }) {
  return (
    <dl className="cab grid w-full max-w-[340px] grid-cols-2 gap-x-3 gap-y-1 rounded-md px-3 py-2 text-xs">
      <dt className="col-span-2 pixel text-[0.55rem] text-zinc-500">{label}</dt>
      <dt className="text-zinc-500">Shots</dt>
      <dd className="text-right text-zinc-200">{data.shots}</dd>
      <dt className="text-zinc-500">Hits / misses</dt>
      <dd className="text-right text-zinc-200">
        {data.hits} / {data.misses}
      </dd>
      <dt className="text-zinc-500">Accuracy</dt>
      <dd className="text-right text-zinc-200">{data.accuracy}%</dd>
      <dt className="text-zinc-500">Fleet afloat</dt>
      <dd className="text-right text-zinc-200">
        {data.afloat}/{data.afloat + data.sunk}
      </dd>
      <dt className="text-zinc-500">Still hunting</dt>
      <dd className="text-right text-zinc-200">{data.remaining.join(", ") || "—"}</dd>
    </dl>
  );
}

export default function Battleships({ code, slot, players }: GameProps) {
  const [game, setGame] = useState<Battleship | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const write = useCallback(
    async (next: Battleship) => {
      setGame(next);
      await supabase.from("game_state").upsert({
        room_code: code,
        game: "battleship",
        state: next,
        updated_at: new Date().toISOString(),
      });
    },
    [code]
  );

  useEffect(() => {
    const ch = supabase
      .channel(`ships:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: `room_code=eq.${code}` },
        (payload) => setGame((payload.new as { state: Battleship }).state)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [code]);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("game_state")
        .select("game, state")
        .eq("room_code", code)
        .maybeSingle();
      if (!live) return;

      if (data?.game === "battleship") setGame(data.state as Battleship);
      else if (slot === 1) write(newGame(`${code}-${Date.now()}`));
    })();
    return () => {
      live = false;
    };
  }, [code, slot, write]);

  useEffect(() => {
    if (!game || game.winner || !game.ready[0] || !game.ready[1] || slot === 0) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= game.deadline && game.turn !== slot) write(timeout(game, slot));
    }, 250);
    return () => clearInterval(id);
  }, [game, slot, write]);

  if (!game) return <p className="text-zinc-500">Waiting for Player 1 to open the sea…</p>;
  if (slot === 0) return <p className="text-zinc-500">Two admirals only — nothing to spectate.</p>;

  const mine = game.fleets[slot - 1];
  const enemy = game.fleets[slot === 1 ? 1 : 0];
  const iAmReady = game.ready[slot - 1];
  const bothReady = game.ready[0] && game.ready[1];
  const myTurn = bothReady && game.turn === slot && !game.winner;
  const left = Math.max(0, Math.min(TURN_MS, game.deadline - now));

  const attack = report(enemy);
  const defence = report(mine);
  const names = [players[0]?.name ?? "Player 1", players[1]?.name ?? "Player 2"];

  const setMyFleet = (fleet: Fleet) => {
    const fleets: [Fleet, Fleet] = slot === 1 ? [fleet, game.fleets[1]] : [game.fleets[0], fleet];
    write({ ...game, fleets });
  };

  if (!bothReady) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-sm text-zinc-400">
          Your fleet. Reroll until you like it, then lock it in.
        </p>
        <ShipBoard fleet={mine} size={game.size} showShips />
        <p className="text-xs text-zinc-500">
          {SHIPS.length} ships · lengths {SHIPS.join(", ")} · {game.size}×{game.size} sea ·{" "}
          {TURN_MS / 1000}s shot clock
        </p>
        <div className="flex items-center gap-3 text-sm">
          {iAmReady ? (
            <span className="text-emerald-400">Locked in. Waiting for the other admiral…</span>
          ) : (
            <>
              <button
                onClick={() => setMyFleet(randomFleet(`${code}-${Date.now()}`, game.size))}
                className="btn-ghost rounded-sm px-3 py-2"
              >
                Reroll
              </button>
              <button
                onClick={() => write(setReady(game, slot))}
                className="btn-arcade rounded-sm px-3 py-2"
              >
                Ready
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-sm">
        <span className="text-zinc-500">Turn {game.turnNo}</span>
        <span
          className={
            game.winner
              ? `flash-win font-medium ${game.winner === slot ? "text-emerald-400" : "text-red-400"}`
              : myTurn
                ? "text-emerald-400"
                : "text-zinc-500"
          }
        >
          {game.winner
            ? game.winner === slot
              ? "Enemy fleet sunk. You win."
              : "Your fleet is gone. You lose."
            : myTurn
              ? "Your shot — a hit buys another."
              : `Player ${game.turn} is aiming…`}
        </span>
        {!game.winner && (
          <span
            className={`font-mono ${left <= 5000 ? "text-red-400" : "text-zinc-400"}`}
            title="Shot clock"
          >
            {Math.ceil(left / 1000)}s
          </span>
        )}
      </div>

      {!game.winner && (
        <div className="h-1 w-full max-w-64 overflow-hidden rounded bg-zinc-800">
          <div
            className={`h-full ${left <= 5000 ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${(left / TURN_MS) * 100}%` }}
          />
        </div>
      )}

      <div className="flex w-full flex-wrap justify-center gap-4 sm:gap-8">
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">
            Your waters · {names[slot - 1]}
          </h3>

          <div
            key={mine.shots.length}
            className={mine.shots.length ? "shake" : undefined}
            style={{ "--delay": `${FLIGHT}ms` } as React.CSSProperties}
          >
            <ShipBoard fleet={mine} size={game.size} showShips />
          </div>
          <Panel label="Incoming" data={defence} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">
            Enemy waters · {names[slot === 1 ? 1 : 0]}
          </h3>
          <div className={`transition-opacity ${myTurn ? "" : "opacity-60"}`}>
            <ShipBoard
              fleet={enemy}
              size={game.size}
              showShips={false}
              onFire={myTurn ? (i) => write(fire(game, i, slot)) : undefined}
            />
          </div>
          <Panel label="Your fire" data={attack} />
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600">
        A hit buys another shot. Miss, or let the {TURN_MS / 1000}s clock run out, and the turn
        passes.
      </p>

      {slot === 1 && (
        <button
          onClick={() => write(newGame(`${code}-${Date.now()}`))}
          className="btn-ghost rounded-sm px-3 py-2 text-[0.6rem]"
        >
          New game
        </button>
      )}
    </div>
  );
}
