"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COLS, DRAW, ROWS, drop, newFour, type Four } from "@/lib/four.ts";
import { useTable } from "@/lib/useTable";
import type { GameProps } from "@/lib/useRoom";
import { createStage, has3D, type Stage } from "./stage";

type Table = Four & { seats: [string, string] };

const CELL = 1.2;
const BASE = 1.1;
const COLOURS = [0xff2d95, 0xffc83d];
const CSS = ["#ff2d95", "#ffc83d"];

const cx = (c: number) => (c - (COLS - 1) / 2) * CELL;
const cy = (r: number) => BASE + r * CELL;

type Disc = { mesh: THREE.Mesh; target: number; v: number };

function buildBoard() {
  const w = COLS * CELL + 0.5;
  const h = ROWS * CELL + 0.3;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const hole = new THREE.Path();
      hole.absarc(cx(c), cy(r) - BASE + 0.15 + CELL / 2, 0.46, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: false,
    curveSegments: 20,
  });
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a2ad0,
    emissive: 0x1a0f5c,
    metalness: 0.3,
    roughness: 0.3,
  });
  const trim = new THREE.LineBasicMaterial({ color: 0x22d3ee });
  const group = new THREE.Group();
  for (const z of [0.24, -0.46]) {
    const panel = new THREE.Mesh(geometry, material);
    panel.position.set(0, BASE - CELL / 2 - 0.15, z);
    panel.castShadow = true;
    panel.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), trim);
    panel.add(edges);
    group.add(panel);
  }
  const feet = new THREE.MeshStandardMaterial({
    color: 0x1d1236,
    metalness: 0.5,
    roughness: 0.4,
  });
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 2.4), feet);
    foot.position.set((side * w) / 2, 0.18, 0);
    foot.castShadow = true;
    group.add(foot);
  }
  return group;
}

export default function FourInARow({ code, players, me }: GameProps) {
  const [table, send] = useTable<Table>(`four:${code}`, me.id);
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<{ sync: (t: Table | null) => void } | null>(null);
  const latest = useRef({ table, mySeat: -1, send });
  const [failed] = useState(() => !has3D());

  const mySeat = table ? table.seats.indexOf(me.id) : -1;
  const myTurn = !!table && table.winner === -1 && mySeat === table.turn;
  useEffect(() => {
    latest.current = { table, mySeat, send };
  });

  const play = (col: number) => {
    const { table: t, mySeat: seat, send: push } = latest.current;
    if (!t || t.winner !== -1 || seat !== t.turn) return;
    const next = drop(t, col);
    if (next !== t) push({ ...next, seats: t.seats });
  };

  useEffect(() => {
    const host = mount.current;
    if (!host || failed) return;
    const discs = new Map<string, Disc>();
    const geometry = new THREE.CylinderGeometry(0.48, 0.48, 0.34, 48);
    geometry.rotateX(Math.PI / 2);
    const materials = COLOURS.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.25,
          roughness: 0.3,
          metalness: 0.1,
        })
    );
    const lit = COLOURS.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.9,
        })
    );
    const ghostMaterial = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.45,
    });
    const ghost = new THREE.Mesh(geometry, ghostMaterial);
    ghost.visible = false;

    const columns: THREE.Mesh[] = [];

    const stage: Stage = createStage(host, {
      frame: (dt, time) => {
        for (const d of discs.values()) {
          if (d.v === 0 && d.mesh.position.y === d.target) continue;
          d.v -= 38 * dt;
          d.mesh.position.y += d.v * dt;
          if (d.mesh.position.y <= d.target) {
            d.mesh.position.y = d.target;
            d.v = Math.abs(d.v) > 2 ? -d.v * 0.28 : 0;
          }
        }
        const pulse = 0.6 + Math.sin(time * 6) * 0.4;
        for (const m of lit) m.emissiveIntensity = pulse;
        ghost.position.y = cy(ROWS) + 0.6 + Math.sin(time * 4) * 0.08;
      },
      tap: (e) => {
        const hit = stage.pick(e, columns);
        if (hit) play(hit.object.userData.col);
      },
      hover: (e) => {
        const { table: t, mySeat: seat } = latest.current;
        const hit = stage.pick(e, columns);
        if (!hit || !t || t.winner !== -1 || seat !== t.turn) return void (ghost.visible = false);
        ghost.visible = true;
        ghost.position.x = cx(hit.object.userData.col);
        ghostMaterial.color.setHex(COLOURS[seat]);
      },
    });
    const s = stage;
    s.camera.position.set(0, 6.5, 15);
    s.controls.target.set(0, 4.2, 0);
    s.controls.minDistance = 9;
    s.controls.maxDistance = 26;
    s.scene.add(buildBoard(), ghost);

    for (let c = 0; c < COLS; c++) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(CELL, ROWS * CELL + 2, 1.2));
      col.position.set(cx(c), cy(ROWS / 2 - 0.5) + 1, 0);
      col.visible = false;
      col.userData.col = c;
      columns.push(col);
      s.scene.add(col);
    }

    view.current = {
      sync: (t) => {
        const cols = t?.cols ?? [];
        for (const [key, d] of discs) {
          const [c, r] = key.split(":").map(Number);
          if (cols[c]?.[r] === undefined) {
            s.scene.remove(d.mesh);
            discs.delete(key);
          }
        }
        cols.forEach((stack, c) =>
          stack.forEach((seat, r) => {
            const key = `${c}:${r}`;
            if (discs.has(key)) return;
            const mesh = new THREE.Mesh(geometry, materials[seat]);
            mesh.castShadow = true;
            mesh.position.set(cx(c), cy(ROWS) + 1.4, 0);
            s.scene.add(mesh);
            discs.set(key, { mesh, target: cy(r), v: 0 });
          })
        );
        const winners = new Set((t?.line ?? []).map(([c, r]) => `${c}:${r}`));
        for (const [key, d] of discs) {
          const [c, r] = key.split(":").map(Number);
          d.mesh.material = (winners.has(key) ? lit : materials)[cols[c][r]];
        }
        if (t && t.winner !== -1) ghost.visible = false;
      },
    };
    view.current.sync(latest.current.table);

    return () => {
      view.current = null;
      for (const m of [...materials, ...lit, ghostMaterial]) m.dispose();
      geometry.dispose();
      s.dispose();
    };
  }, [failed]);

  useEffect(() => view.current?.sync(table), [table]);

  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const seats: [string, string] = [players[0]?.id ?? "", players[1]?.id ?? ""];
  const isHost = players[0]?.id === me.id;
  const gone = !!table && table.seats.some((id) => !players.some((p) => p.id === id));
  const canStart = players.length >= 2 && (!table || table.winner !== -1 || gone);
  const start = () => {
    const keep = table && !gone && table.seats.join() === seats.join();
    send({
      ...newFour(keep ? table.round + 1 : 1, keep ? table.score : [0, 0]),
      seats,
    });
  };

  const status = !table
    ? isHost
      ? "Two players, seven columns. Start when ready."
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.winner === DRAW
      ? "Board's full. A draw."
      : table.winner !== -1
        ? `${name(table.seats[table.winner])} connects four!`
        : myTurn
          ? "Your drop — tap a column."
          : `${name(table.seats[table.turn])} is dropping…`;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-400">
        Drop discs, line up four — across, up or on the slant. Drag to look around.
      </p>

      {table && (
        <ul className="flex flex-wrap justify-center gap-2">
          {table.seats.map((id, seat) => (
            <li
              key={seat}
              className={`cab flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                table.winner === -1 && table.turn === seat ? "cab-hot" : ""
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  background: CSS[seat],
                  boxShadow: `0 0 8px ${CSS[seat]}`,
                }}
              />
              <span className="text-zinc-200">
                {name(id)}
                {id === me.id && " (you)"}
              </span>
              <span className="neon-green">{table.score[seat]}</span>
            </li>
          ))}
        </ul>
      )}

      <p
        role="status"
        className={`text-center text-sm ${
          table && table.winner !== -1
            ? "flash-win neon-green pixel text-[0.65rem]"
            : myTurn
              ? "text-emerald-400"
              : "text-zinc-400"
        }`}
      >
        {status}
      </p>

      <div
        ref={mount}
        className="cab relative h-[52vh] max-h-[520px] min-h-[300px] w-full overflow-hidden rounded-md"
      >
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            This browser could not start 3D graphics. Try another browser or turn on hardware
            acceleration.
          </p>
        )}
      </div>

      {table && mySeat >= 0 && table.winner === -1 && (
        <div
          className="grid w-full max-w-md grid-cols-7 gap-1"
          role="group"
          aria-label="Drop in column"
        >
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              onClick={() => play(c)}
              disabled={!myTurn || table.cols[c].length >= ROWS}
              aria-label={`Column ${c + 1}`}
              className="btn-ghost rounded-sm py-2 text-[0.55rem] disabled:opacity-30"
            >
              {c + 1}
            </button>
          ))}
        </div>
      )}

      {table && mySeat < 0 && (
        <p className="text-xs text-zinc-500">Two seats only — you are watching.</p>
      )}

      {(isHost || (table && mySeat >= 0)) && canStart && (
        <button onClick={start} className="btn-arcade rounded-sm px-4 py-2">
          {table && !gone ? "Rematch" : "Start"}
        </button>
      )}
    </div>
  );
}
