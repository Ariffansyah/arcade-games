"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { hash, rng } from "@/lib/rng.ts";
import {
  aim,
  canPull,
  height,
  leave,
  newTower,
  pull,
  risk,
  steadiness,
  type Topple as Tower,
} from "@/lib/topple.ts";
import { useTable } from "@/lib/useTable";
import type { GameProps } from "@/lib/useRoom";
import { createStage, has3D, ease, type Stage } from "./stage";

const L = 3;
const W = 1;
const H = 0.6;

type Pose = { p: THREE.Vector3; r: number };

const restOf = (level: number, slot: number): Pose =>
  level % 2
    ? {
        p: new THREE.Vector3((slot - 1) * W, H / 2 + level * H, 0),
        r: Math.PI / 2,
      }
    : { p: new THREE.Vector3(0, H / 2 + level * H, (slot - 1) * W), r: 0 };

const along = (r: number) => (r ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0));

// Where the meter's sweet spot sits for this attempt, somewhere between -0.45 and 0.45.
const spotFor = (t: Tower, id: number) => (hash(`${t.round}:${t.pulls}:${id}`) % 900) / 1000 - 0.45;
const sweepsPerSecond = (r: number) => 0.45 + r * 1.1;

function woodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#d8a467";
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 22; i++) {
    const y = Math.random() * 128;
    g.strokeStyle = `rgba(${80 + Math.random() * 50}, ${40 + Math.random() * 25}, 18, ${0.05 + Math.random() * 0.12})`;
    g.lineWidth = 0.6 + Math.random() * 2.6;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 24)
      g.lineTo(x, y + Math.sin(x / 70 + i) * 3 + (Math.random() - 0.5) * 1.5);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

type Piece = {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  rest: Pose;
  slide: number;
  path: { keys: Pose[]; t: number; dur: number; delay: number } | null;
  fall: { v: THREE.Vector3; w: THREE.Vector3 } | null;
};

type View = { sync: (t: Tower) => void };

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowUp: 3,
  ArrowDown: -3,
};

export default function Topple({ code, players, me }: GameProps) {
  const [table, send] = useTable<Tower>(`topple:${code}`, me.id);
  const mount = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [failed] = useState(() => !has3D());
  const [cursor, setCursor] = useState(-1);
  const latest = useRef({ table, myTurn: false, send, cursor });
  const meter = useRef(0);

  const isHost = players[0]?.id === me.id;
  const up = table && !table.loser ? table.order[table.turn] : "";
  const myTurn = up === me.id;
  const aiming = myTurn && table!.aim >= 0 ? table!.aim : -1;
  const r = aiming >= 0 ? risk(table!, aiming) : 0;

  useEffect(() => {
    latest.current = { table, myTurn, send, cursor };
  });

  const choose = (id: number) => {
    const { table: t, myTurn: mine, send: push } = latest.current;
    if (!t || !mine || !canPull(t, id)) return;
    push(aim(t, id === t.aim ? -1 : id));
  };

  const commit = () => {
    if (!table || aiming < 0) return;
    const zone = steadiness(risk(table, aiming));
    send(pull(table, aiming, Math.abs(meter.current - spotFor(table, aiming)) / zone));
  };

  useEffect(() => {
    const host = mount.current;
    if (!host || failed) return;
    const texture = woodTexture();
    const geometry = new RoundedBoxGeometry(L, H - 0.03, W - 0.04, 2, 0.05);
    const tower = new THREE.Group();
    const pieces: Piece[] = [];
    let hovered = -1;
    let wobble = 0;
    let round = -1;
    let fallen = false;
    let stump = 0;
    let camY = 4;

    const pieceFor = (i: number) => {
      while (pieces.length <= i) {
        const shade = 0.85 + Math.random() * 0.25;
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          color: new THREE.Color(shade, shade * (0.95 + Math.random() * 0.06), shade * 0.92),
          roughness: 0.62,
          emissive: 0x000000,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.id = pieces.length;
        tower.add(mesh);
        pieces.push({
          mesh,
          material,
          rest: restOf(0, 0),
          slide: 0,
          path: null,
          fall: null,
        });
      }
      return pieces[i];
    };

    const stage: Stage = createStage(host, {
      frame: (dt, time) => {
        const { table: t, myTurn: mine, cursor: cur } = latest.current;
        const aimed = t && !t.loser ? t.aim : -1;
        tower.rotation.z = Math.sin(time * 1.6) * wobble * 0.03;
        tower.rotation.x = Math.cos(time * 1.3) * wobble * 0.02;

        if (aimed >= 0 && t && mine) {
          meter.current = Math.sin(time * Math.PI * 2 * sweepsPerSecond(risk(t, aimed)));
          if (needle.current) needle.current.style.left = `${(meter.current + 1) * 50}%`;
        }
        const outside =
          aimed >= 0 && t && mine
            ? Math.abs(meter.current - spotFor(t, aimed)) / steadiness(risk(t, aimed)) > 1
            : false;

        for (const [i, piece] of pieces.entries()) {
          const { mesh } = piece;
          if (piece.fall) {
            const { v, w } = piece.fall;
            v.y -= 20 * dt;
            mesh.position.addScaledVector(v, dt);
            mesh.rotation.x += w.x * dt;
            mesh.rotation.y += w.y * dt;
            mesh.rotation.z += w.z * dt;
            // Whatever lands on the part still standing rests on it and slides off the edge.
            const onStump = Math.abs(mesh.position.x) < 1.5 && Math.abs(mesh.position.z) < 1.5;
            const ground = (onStump ? stump : 0) + H / 2;
            if (mesh.position.y < ground && mesh.position.y > ground - H) {
              mesh.position.y = ground;
              v.set(v.x * 0.6, Math.abs(v.y) > 1.5 ? -v.y * 0.25 : 0, v.z * 0.6);
              w.multiplyScalar(0.6);
            }
            continue;
          }
          if (piece.path) {
            piece.material.emissive.setHex(0x000000);
            const path = piece.path;
            path.t += dt;
            const u =
              Math.max(0, Math.min(1, (path.t - path.delay) / path.dur)) * (path.keys.length - 1);
            const seg = Math.min(Math.floor(u), path.keys.length - 2);
            const k = ease(u - seg);
            const a = path.keys[seg];
            const b = path.keys[seg + 1];
            mesh.position.lerpVectors(a.p, b.p, k);
            mesh.rotation.set(0, a.r + (b.r - a.r) * k, 0);
            if (path.t >= path.delay + path.dur) piece.path = null;
            continue;
          }
          const want = i === aimed ? 0.6 : 0;
          piece.slide += (want - piece.slide) * Math.min(1, dt * 7);
          mesh.position.copy(piece.rest.p).addScaledVector(along(piece.rest.r), piece.slide);
          if (i === aimed && outside) mesh.position.y += Math.sin(time * 70) * 0.025;
          mesh.rotation.set(0, piece.rest.r, 0);

          const live = !!t && mine && !t.loser && canPull(t, i);
          const glow =
            i === aimed ? 0xff2d95 : live && (i === hovered || i === cur) ? 0x22d3ee : 0x000000;
          piece.material.emissive.setHex(glow);
          piece.material.emissiveIntensity = i === aimed ? 0.5 + Math.sin(time * 8) * 0.2 : 0.45;
        }

        if (stage) {
          const target = t ? Math.max(3, (height(t) * H) / 2) : 4.5;
          camY += (target - camY) * Math.min(1, dt * 2);
          stage.controls.target.y = camY;
        }
      },
      tap: (e) => {
        const hit = stage.pick(e, tower.children);
        if (hit) choose(hit.object.userData.id);
      },
      hover: (e) => {
        const hit = stage.pick(e, tower.children);
        hovered = hit ? hit.object.userData.id : -1;
        const { table: t, myTurn: mine } = latest.current;
        host.style.cursor = t && mine && hovered >= 0 && canPull(t, hovered) ? "pointer" : "grab";
      },
    });
    const s = stage;
    s.scene.add(tower);
    s.camera.position.set(13, 11, 16);
    s.controls.minDistance = 8;
    s.controls.maxDistance = 32;

    const build = (t: Tower) => {
      fallen = false;
      t.blocks.forEach((b, i) => {
        const piece = pieceFor(i);
        piece.rest = restOf(b.level, b.slot);
        piece.fall = null;
        piece.slide = 0;
        const from = {
          p: piece.rest.p.clone().add(new THREE.Vector3(0, 9 + b.level * 0.4, 0)),
          r: piece.rest.r + 1.2,
        };
        piece.path = {
          keys: [from, piece.rest],
          t: 0,
          dur: 0.55,
          delay: b.level * 0.05 + b.slot * 0.02,
        };
      });
    };

    const topple = (t: Tower) => {
      fallen = true;
      const random = rng(hash(`${t.round}:${t.pulls}:fall`));
      const angle = random() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const pivot = t.moved >= 0 ? t.blocks[t.moved].level : 0;
      stump = pivot * H;
      t.blocks.forEach((b, i) => {
        const piece = pieceFor(i);
        piece.path = null;
        piece.material.emissive.setHex(0x000000);
        if (b.level < pivot) return;
        const above = b.level - pivot + 1;
        piece.fall = {
          v: dir
            .clone()
            .multiplyScalar(1.2 + above * 0.45 + random() * 1.5)
            .add(new THREE.Vector3((random() - 0.5) * 2, random() * 2.5, (random() - 0.5) * 2)),
          w: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(7),
        };
      });
    };

    view.current = {
      sync: (t) => {
        wobble = t.loser ? 0 : t.wobble;
        if (t.round !== round) {
          round = t.round;
          build(t);
          return;
        }
        if (t.loser) {
          if (!fallen) topple(t);
          return;
        }
        t.blocks.forEach((b, i) => {
          const piece = pieceFor(i);
          const rest = restOf(b.level, b.slot);
          if (rest.p.equals(piece.rest.p)) return;
          const from = { p: piece.mesh.position.clone(), r: piece.rest.r };
          const out = {
            p: from.p.clone().addScaledVector(along(from.r), L * 0.75),
            r: from.r,
          };
          const lift = height(t) * H + 1.6;
          piece.path = {
            keys: [
              from,
              out,
              { p: out.p.clone().setY(lift), r: from.r },
              { p: rest.p.clone().setY(lift), r: rest.r },
              rest,
            ],
            t: 0,
            dur: 1.5,
            delay: 0,
          };
          piece.rest = rest;
          piece.slide = 0;
        });
      },
    };
    view.current.sync(latest.current.table ?? newTower([]));

    return () => {
      view.current = null;
      texture.dispose();
      s.dispose();
    };
  }, [failed]);

  useEffect(() => {
    if (table) view.current?.sync(table);
  }, [table]);

  const pullable =
    table && myTurn && aiming < 0
      ? table.blocks
          .map((b, i) => ({ i, at: b.level * 3 + b.slot }))
          .filter(({ i }) => canPull(table, i))
          .sort((a, b) => a.at - b.at)
          .map(({ i }) => i)
      : [];
  const onKey = (e: React.KeyboardEvent) => {
    if (aiming >= 0 && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      return commit();
    }
    if (!pullable.length) return;
    const at = Math.max(0, pullable.indexOf(cursor));
    const step = STEPS[e.key];
    if (step) {
      e.preventDefault();
      setCursor(pullable[(at + step + pullable.length * 3) % pullable.length]);
    }
    if ((e.key === "Enter" || e.key === " ") && cursor >= 0) {
      e.preventDefault();
      choose(cursor);
    }
  };

  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const upGone = !!up && !players.some((p) => p.id === up);
  const start = () =>
    send(
      newTower(
        players.map((p) => p.id),
        (table?.round ?? 0) + 1,
        table?.falls ?? {}
      )
    );
  const zone = aiming >= 0 ? steadiness(r) : 0;
  const spot = aiming >= 0 ? spotFor(table!, aiming) : 0;
  const riskWord = r > 0.5 ? "very risky" : r > 0.25 ? "risky" : r > 0.12 ? "fair" : "safe";

  const status = !table
    ? isHost
      ? "Stack's built. Start when everyone's in."
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.loser
      ? `${name(table.loser)} brought the tower down!`
      : myTurn
        ? aiming >= 0
          ? "Stop the needle inside the glowing window."
          : "Your pull — tap a block below the top. Drag to orbit."
        : `${name(up)} is ${table.aim >= 0 ? "easing a block out…" : "picking a block…"}`;

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <p className="text-center text-sm text-zinc-400">
        Take turns pulling a block and stacking it on top. Whoever brings the tower down loses the
        round.
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {(table?.order ?? players.map((p) => p.id)).map((id) => (
          <li
            key={id}
            className={`cab rounded-md px-3 py-1.5 text-sm ${up === id ? "cab-hot" : ""} ${
              table?.loser === id ? "border-red-500" : ""
            }`}
          >
            <span className="text-zinc-200">
              {name(id)}
              {id === me.id && " (you)"}
            </span>{" "}
            <span className="text-red-400" title="Towers knocked down">
              {"▼".repeat(table?.falls[id] ?? 0)}
            </span>
          </li>
        ))}
      </ul>

      <p
        role="status"
        className={`text-center text-sm ${
          table?.loser
            ? "flash-win pixel text-[0.65rem] text-red-400"
            : myTurn
              ? "text-emerald-400"
              : "text-zinc-400"
        }`}
      >
        {status}
      </p>

      <div
        ref={mount}
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="Tower. Arrow keys pick a block, Enter takes it, Space pulls."
        className="cab relative h-[58vh] max-h-[600px] min-h-[340px] w-full overflow-hidden rounded-md outline-none focus-visible:border-cyan-400"
      >
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            This browser could not start 3D graphics. Try another browser or turn on hardware
            acceleration.
          </p>
        )}
        {table && !table.loser && (
          <span className="pixel pointer-events-none absolute top-3 left-3 text-[0.5rem] text-zinc-400">
            {height(table)} levels · sway {Math.round(table.wobble * 100)}%
          </span>
        )}
      </div>

      {aiming >= 0 && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              This block is{" "}
              <span className={r > 0.25 ? "text-red-400" : "text-emerald-400"}>{riskWord}</span>
            </span>
            <button
              onClick={() => choose(aiming)}
              className="btn-ghost rounded-sm px-2 py-1 text-[0.5rem]"
            >
              Pick another
            </button>
          </div>
          <div className="relative h-6 overflow-hidden rounded-sm border-2 border-zinc-700 bg-zinc-950/80">
            <div
              className="absolute inset-y-0 bg-emerald-500/40 shadow-[0_0_16px_var(--color-emerald-500)]"
              style={{
                left: `${(spot - zone + 1) * 50}%`,
                width: `${zone * 100}%`,
              }}
            />
            <div
              ref={needle}
              className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow-[0_0_10px_white]"
            />
          </div>
          <button onClick={commit} className="btn-arcade rounded-sm py-3">
            Pull
          </button>
        </div>
      )}

      {upGone && isHost && table && !table.loser && (
        <button
          onClick={() => send(leave(table))}
          className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
        >
          Whoever is up left the room — skip them
        </button>
      )}

      {isHost && (!table || table.loser) && (
        <button
          onClick={start}
          disabled={players.length < 2}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "Rebuild" : "Start"}
        </button>
      )}
    </div>
  );
}
