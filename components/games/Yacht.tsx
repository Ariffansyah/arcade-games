"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hash, rng } from "@/lib/rng.ts";
import {
  BONUS,
  BONUS_AT,
  CATEGORIES,
  DICE,
  ROLLS,
  hold,
  leave,
  mark,
  newYacht,
  roll,
  score,
  totals,
  type Category,
  type Yacht as Game,
} from "@/lib/yacht.ts";
import { useTable } from "@/lib/useTable";
import type { GameProps } from "@/lib/useRoom";
import { createStage, has3D, ease, type Stage } from "./stage";

// Box faces in three.js order (+x, -x, +y, -y, +z, -z) and the turn that brings each to the top.
const FACE_VALUES = [2, 5, 1, 6, 3, 4];
const UPRIGHT: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
  2: new THREE.Euler(0, 0, Math.PI / 2),
  5: new THREE.Euler(0, 0, -Math.PI / 2),
  3: new THREE.Euler(-Math.PI / 2, 0, 0),
  4: new THREE.Euler(Math.PI / 2, 0, 0),
};
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.5, 0.5],
    [0.25, 0.75],
    [0.75, 0.75],
  ],
  6: [
    [0.27, 0.22],
    [0.73, 0.22],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.78],
    [0.73, 0.78],
  ],
};
const GLYPHS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const restAt = (i: number, held: boolean) =>
  new THREE.Vector3((i - 2) * 1.7, 0.5, held ? 2.6 : -0.4);

function faceTexture(value: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#f7f3ff";
  g.fillRect(0, 0, 256, 256);
  for (const [x, y] of PIPS[value]) {
    g.beginPath();
    g.arc(x * 256, y * 256, value === 1 ? 34 : 24, 0, Math.PI * 2);
    g.fillStyle = value === 1 ? "#ff2d95" : "#120b22";
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Die = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  spin: THREE.Vector3;
  turns: number;
  end: THREE.Quaternion;
  t: number;
  dur: number;
};

const upright = (value: number, yaw: number) =>
  new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .multiply(new THREE.Quaternion().setFromEuler(UPRIGHT[value]));

export default function Yacht({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`yacht:${code}`, me.id);
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<{ sync: (y: Game) => void } | null>(null);
  const latest = useRef({ table, myTurn: false, send });
  const [failed] = useState(() => !has3D());

  const isHost = players[0]?.id === me.id;
  const up = table && !table.done ? table.order[table.turn] : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);

  useEffect(() => {
    latest.current = { table, myTurn, send };
  });

  const toggle = (i: number) => {
    const { table: y, myTurn: mine, send: push } = latest.current;
    if (y && mine) {
      const next = hold(y, i);
      if (next !== y) push(next);
    }
  };

  useEffect(() => {
    const host = mount.current;
    if (!host || failed) return;
    const textures = FACE_VALUES.map(faceTexture);
    const geometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.14);
    const dice: Die[] = [];
    let throws = -1;
    let round = -1;

    const stage: Stage = createStage(host, {
      frame: (dt, time) => {
        const y = latest.current.table;
        dice.forEach((d, i) => {
          const held = !!y?.held[i] && y.rolls > 0;
          d.t = Math.min(d.dur, d.t + dt);
          const k = d.t / d.dur;
          const e = ease(k);
          d.mesh.position.lerpVectors(d.from, d.to, e);
          // A few shrinking hops while the die travels, landing flat on the felt.
          if (d.turns)
            d.mesh.position.y = d.to.y + (1 - k) ** 2 * 3.2 * Math.abs(Math.cos(k * Math.PI * 2.5));
          const wind = new THREE.Quaternion().setFromAxisAngle(d.spin, (1 - e) * d.turns);
          d.mesh.quaternion.copy(d.end).premultiply(wind);
          if (held) d.mesh.position.y += 0.15 + Math.sin(time * 3 + i) * 0.06;
          for (const m of d.mesh.material as THREE.MeshStandardMaterial[]) {
            m.emissive.setHex(held ? 0x22d3ee : 0x000000);
            m.emissiveIntensity = held ? 0.35 : 0;
          }
        });
      },
      tap: (e) => {
        const hit = stage.pick(
          e,
          dice.map((d) => d.mesh)
        );
        if (hit) toggle(hit.object.userData.i);
      },
      hover: (e) => {
        const { table: y, myTurn: mine } = latest.current;
        const hit = stage.pick(
          e,
          dice.map((d) => d.mesh)
        );
        host.style.cursor = hit && mine && y && y.rolls > 0 && y.rolls < ROLLS ? "pointer" : "grab";
      },
    });
    const s = stage;
    s.camera.position.set(0, 10.5, 9.5);
    s.controls.target.set(0, 0, 0.6);
    s.controls.minDistance = 8;
    s.controls.maxDistance = 22;

    const felt = new THREE.Mesh(
      new RoundedBoxGeometry(11, 0.3, 7.2, 4, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1d1236, roughness: 0.95 })
    );
    felt.position.set(0, -0.14, 1.1);
    felt.receiveShadow = true;
    const rail = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(11.1, 0.32, 7.3)),
      new THREE.LineBasicMaterial({ color: 0xff2d95 })
    );
    rail.position.copy(felt.position);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 0.04),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.6,
      })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, 1.4);
    s.scene.add(felt, rail, line);

    for (let i = 0; i < DICE; i++) {
      const mesh = new THREE.Mesh(
        geometry,
        textures.map(
          (map) =>
            new THREE.MeshStandardMaterial({
              map,
              roughness: 0.35,
              metalness: 0.05,
            })
        )
      );
      mesh.castShadow = true;
      mesh.userData.i = i;
      s.scene.add(mesh);
      const at = restAt(i, false);
      dice.push({
        mesh,
        from: at.clone(),
        to: at.clone(),
        spin: new THREE.Vector3(0, 1, 0),
        turns: 0,
        end: upright(i + 1, 0),
        t: 1,
        dur: 1,
      });
    }

    view.current = {
      sync: (y) => {
        const fresh = y.round !== round;
        dice.forEach((d, i) => {
          // Seeded per die and per throw, so every screen lands the dice in the same spots.
          const random = rng(hash(`${y.seed}:${y.throws}:${i}`));
          const held = y.held[i] && y.rolls > 0;
          const to = restAt(i, held).add(
            new THREE.Vector3((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5)
          );
          const rolled = !fresh && y.throws !== throws && !y.held[i] && throws >= 0;
          d.from = d.mesh.position.clone().setY(0.5);
          d.to = to;
          if (rolled) {
            d.from = new THREE.Vector3(-7 + random(), 0.5, 3.5 + random() * 2);
            d.spin = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
            d.turns = Math.PI * (5 + random() * 5);
            d.end = upright(y.dice[i], (random() - 0.5) * 1.2);
            d.t = 0;
            d.dur = 0.9 + random() * 0.35;
          } else {
            d.turns = 0;
            d.end = d.t >= d.dur && !fresh ? d.end : upright(y.dice[i], (random() - 0.5) * 0.6);
            d.t = 0;
            d.dur = 0.35;
          }
        });
        throws = y.throws;
        round = y.round;
      },
    };
    if (latest.current.table) view.current.sync(latest.current.table);

    return () => {
      view.current = null;
      for (const t of textures) t.dispose();
      s.dispose();
    };
  }, [failed]);

  useEffect(() => {
    if (table) view.current?.sync(table);
  }, [table]);

  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const start = () =>
    send(
      newYacht(
        `${code}-${Date.now()}`,
        players.map((p) => p.id),
        (table?.round ?? 0) + 1
      )
    );
  const order = table?.order ?? [];
  const winner =
    table?.done && order.length
      ? order.reduce((a, b) =>
          totals(table.cards[b]).total > totals(table.cards[a]).total ? b : a
        )
      : "";
  const canMark = !!table && myTurn && table.rolls > 0;

  const status = !table
    ? isHost
      ? "Five dice, three rolls a turn, thirteen boxes to fill. Start when ready."
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.done
      ? `${name(winner)} wins with ${totals(table.cards[winner]).total}!`
      : myTurn
        ? table.rolls === 0
          ? "Your turn — roll."
          : table.rolls < ROLLS
            ? "Tap dice to keep them, roll again, or score a box."
            : "Out of rolls — pick a box to score."
        : `${name(up)} is ${table.rolls ? "rolling" : "up"}…`;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p
        role="status"
        className={`text-center text-sm ${table?.done ? "flash-win neon-green pixel text-[0.65rem]" : myTurn ? "text-emerald-400" : "text-zinc-400"}`}
      >
        {status}
      </p>

      <div
        ref={mount}
        className="cab relative h-[42vh] max-h-[420px] min-h-[260px] w-full overflow-hidden rounded-md"
      >
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            This browser could not start 3D graphics. Try another browser or turn on hardware
            acceleration.
          </p>
        )}
        {table && !table.done && (
          <span className="pixel pointer-events-none absolute top-3 left-3 text-[0.5rem] text-zinc-400">
            Roll {table.rolls}/{ROLLS}
          </span>
        )}
      </div>

      {table && myTurn && !table.done && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {table.dice.map((d, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={table.rolls === 0 || table.rolls >= ROLLS}
              aria-pressed={table.held[i]}
              aria-label={`Die ${i + 1} shows ${d}${table.held[i] ? ", kept" : ""}`}
              className={`btn-ghost rounded-sm px-2 py-1 text-2xl normal-case disabled:opacity-50 ${
                table.held[i] && table.rolls > 0 ? "border-cyan-400 text-cyan-300" : ""
              }`}
            >
              {table.rolls ? GLYPHS[d] : "·"}
            </button>
          ))}
          <button
            onClick={() => send(roll(table))}
            disabled={table.rolls >= ROLLS}
            className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
          >
            {table.rolls === 0 ? "Roll" : `Roll again (${ROLLS - table.rolls})`}
          </button>
        </div>
      )}

      {table && (
        <div className="w-full overflow-x-auto">
          <table className="cab mx-auto w-full max-w-2xl min-w-[320px] rounded-md text-sm">
            <thead>
              <tr className="text-zinc-400">
                <th className="px-2 py-2 text-left text-[0.5rem]">Box</th>
                {order.map((id) => (
                  <th
                    key={id}
                    className={`px-2 py-2 text-[0.5rem] ${id === up ? "neon-green" : ""} ${id === me.id ? "underline" : ""}`}
                  >
                    {name(id)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c, row) => (
                <tr
                  key={c.id}
                  className={`border-t border-zinc-800 ${row === 6 ? "border-t-2 border-t-zinc-600" : ""}`}
                >
                  <td className="px-2 py-1 text-zinc-300" title={c.hint}>
                    {c.label}
                  </td>
                  {order.map((id) => {
                    const got = table.cards[id][c.id as Category];
                    const offer = canMark && id === me.id && got === undefined;
                    return (
                      <td key={id} className="px-1 py-0.5 text-center">
                        {got !== undefined ? (
                          <span className="text-zinc-100">{got}</span>
                        ) : offer ? (
                          <button
                            onClick={() => send(mark(table, c.id as Category))}
                            className="w-full rounded-sm border border-dashed border-emerald-700 px-1 py-0.5 text-emerald-400 normal-case hover:bg-emerald-500/10"
                            aria-label={`Score ${score(c.id as Category, table.dice)} in ${c.label}`}
                          >
                            {score(c.id as Category, table.dice)}
                          </button>
                        ) : (
                          <span className="text-zinc-700">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-600 text-zinc-400">
                <td className="px-2 py-1 text-xs">
                  Bonus ({BONUS_AT}+ up top = {BONUS})
                </td>
                {order.map((id) => {
                  const t = totals(table.cards[id]);
                  return (
                    <td key={id} className="px-2 py-1 text-center text-xs">
                      {t.bonus ? BONUS : `${t.upper}/${BONUS_AT}`}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="pixel px-2 py-2 text-[0.5rem] text-zinc-300">Total</td>
                {order.map((id) => (
                  <td key={id} className="neon-green px-2 py-2 text-center">
                    {totals(table.cards[id]).total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {upGone && isHost && table && !table.done && (
        <button
          onClick={() => send(leave(table))}
          className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
        >
          Whoever is up left the room — skip them
        </button>
      )}

      {isHost && (!table || table.done) && (
        <button
          onClick={start}
          disabled={players.length < 2}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "New game" : "Start"}
        </button>
      )}
    </div>
  );
}
