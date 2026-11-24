"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type * as RAPIER from "@dimforge/rapier3d-compat";
import {
  H,
  L,
  W,
  canPull,
  collapse,
  fallen,
  height,
  leave,
  newTower,
  nextSlot,
  onTop,
  place,
  type Pose,
  type Topple as Tower,
} from "@/lib/topple.ts";
import { useTable } from "@/lib/useTable";
import { useBroadcast } from "@/lib/useBroadcast";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { createStage, has3D, type Stage } from "./stage";

type Rapier = typeof RAPIER.default;

// Whoever is pulling runs the physics and streams the blocks; everyone else just watches.
type Live = { round: number; pulls: number; held: number; poses: Pose[] };

type Mode = "idle" | "pull" | "carry" | "lower" | "settle" | "falling" | "done";

const GRAVITY = 20;
const STEP = 1 / 120;
const PULL_SPEED = 6;
// Slide slower than this and nothing above notices. Faster, and friction drags the next level
// along with the block, harder the faster you go.
const SAFE_SPEED = 2.2;
const GRIP = 2.2;
// The block in hand is thinned a touch so the tower settles onto its neighbours, the way a
// finger loosens a real one. Whatever was resting on it alone is now resting on nothing.
const LOOSE = 0.012;
const LIFT_SPEED = 8;
const CARRY_SPEED = 9;
const LIVE_MS = 80;

const HINT: Record<Mode, string> = {
  idle: "Your pull — drag a block out along its length. Drag empty space to orbit.",
  pull: "Slow and steady… yank it and the blocks above come with it.",
  carry: "Lift it over the tower and let go on top.",
  lower: "Setting it down…",
  settle: "Letting the tower settle…",
  falling: "It's going!",
  done: "Nice pull.",
};

const keyOf = (t: Tower) => `${t.round}:${t.pulls}`;
const trim = (p: Pose) =>
  p.map((v, i) => Math.round(v * (i < 3 ? 1000 : 10000)) / (i < 3 ? 1000 : 10000)) as Pose;

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
  p: THREE.Vector3;
  q: THREE.Quaternion;
  wait: number;
};

type View = {
  sync: (t: Tower, mine: boolean) => void;
  live: (l: Live) => void;
  auto: (id: number) => void;
};

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowUp: 3,
  ArrowDown: -3,
};

export default function Topple({ code, players, me, name, follow, roster }: GameProps) {
  const [saved, send] = useTable<Tower>(`topple:${code}`, me.id);
  // A table from the meter version of this game has no poses to stand on; deal a fresh tower.
  const table = saved?.poses ? saved : null;
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [failed] = useState(() => !has3D());
  const [ready, setReady] = useState<boolean | "failed">(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [cursor, setCursor] = useState(-1);
  const stream = useBroadcast<Live>(`topple-live:${code}`, "live", (l) => view.current?.live(l));

  const isHost = players[0]?.id === me.id;
  const up = table && !table.loser ? table.order[table.turn] : "";
  const myTurn = up === me.id;
  useEffect(() => follow(up), [follow, up]);
  const latest = useRef({ table, myTurn, send, stream, cursor });

  useEffect(() => {
    latest.current = { table, myTurn, send, stream, cursor };
  });

  useEffect(() => {
    const host = mount.current;
    if (!host || failed) return;
    const texture = woodTexture();
    const geometry = new RoundedBoxGeometry(L, H - 0.02, W - 0.04, 2, 0.05);
    const tower = new THREE.Group();
    const pieces: Piece[] = [];
    let R: Rapier | null = null;
    let alive = true;

    let world: RAPIER.World | null = null;
    let bodies: RAPIER.RigidBody[] = [];
    let simFor = "";
    let start: Pose[] = [];
    let state: Mode = "idle";
    let held = -1;
    let taken = -1;
    let hovered = -1;
    let liveHeld = -1;
    let round = -1;
    let acc = 0;
    let calm = 0;
    let clock = 0;
    let lastLive = 0;
    let camY = 4;
    let carryY = 0;
    let robot = false;
    const origin = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const target = new THREE.Vector3();
    const carryQ = new THREE.Quaternion();
    let along = 0;
    let planeY = 0;
    let slot: Pose | null = null;

    const setState = (next: Mode) => {
      state = next;
      setMode(next);
    };

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
        pieces.push({ mesh, material, p: new THREE.Vector3(), q: new THREE.Quaternion(), wait: 0 });
      }
      return pieces[i];
    };

    const aimAt = (poses: Pose[]) =>
      poses.forEach((pose, i) => {
        const piece = pieceFor(i);
        piece.p.set(pose[0], pose[1], pose[2]);
        piece.q.set(pose[3], pose[4], pose[5], pose[6]);
      });

    const poseOf = (b: RAPIER.RigidBody): Pose => {
      const t = b.translation();
      const q = b.rotation();
      return [t.x, t.y, t.z, q.x, q.y, q.z, q.w];
    };
    const now = () => bodies.map(poseOf);

    const free = () => {
      world?.free();
      world = null;
      bodies = [];
      simFor = "";
    };

    const build = (t: Tower) => {
      if (!R) return;
      free();
      const w = new R.World({ x: 0, y: -GRAVITY, z: 0 });
      w.timestep = STEP;
      w.numSolverIterations = 10;
      w.createCollider(
        R.ColliderDesc.cuboid(40, 0.5, 40).setTranslation(0, -0.5, 0).setFriction(0.8)
      );
      bodies = t.poses.map((p) => {
        const b = w.createRigidBody(
          R!.RigidBodyDesc.dynamic()
            .setTranslation(p[0], p[1], p[2])
            .setRotation({ x: p[3], y: p[4], z: p[5], w: p[6] })
            .setLinearDamping(0.05)
            .setAngularDamping(0.4)
        );
        w.createCollider(
          R!.ColliderDesc.cuboid(L / 2, H / 2, W / 2 - 0.01)
            .setFriction(0.45)
            .setRestitution(0.02)
            .setDensity(1),
          b
        );
        return b;
      });
      world = w;
      simFor = keyOf(t);
      start = t.poses;
      held = -1;
      taken = -1;
      robot = false;
      setState("idle");
    };

    const grab = (id: number, point: THREE.Vector3) => {
      const b = bodies[id];
      if (!b || !R) return;
      const t = b.translation();
      origin.set(t.x, t.y, t.z);
      const r = b.rotation();
      axis.set(1, 0, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
      axis.y = 0;
      axis.normalize();
      offset.copy(point).sub(origin);
      planeY = point.y;
      along = 0;
      target.copy(origin);
      b.collider(0).setHalfExtents({ x: L / 2, y: H / 2 - LOOSE, z: W / 2 - 0.01 });
      b.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
      held = id;
      taken = id;
      // A block already clear of the tower (dropped on the floor) goes straight to the hand.
      if (Math.max(Math.abs(t.x), Math.abs(t.z)) > 2.2) lift();
      else setState("pull");
    };

    const lift = () => {
      const poses = now();
      const b = bodies[held];
      const t = b.translation();
      slot = nextSlot(poses, held, t.x, t.z);
      carryQ.set(slot[3], slot[4], slot[5], slot[6]);
      carryY = height(poses, held) * H + H * 1.8;
      offset.set(0, 0, 0);
      planeY = carryY;
      target.set(t.x, carryY, t.z);
      setState("carry");
    };

    const drop = (b: RAPIER.RigidBody) => {
      if (!R) return;
      b.collider(0).setHalfExtents({ x: L / 2, y: H / 2, z: W / 2 - 0.01 });
      b.setBodyType(R.RigidBodyType.Dynamic, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    };

    const release = () => {
      if (held < 0) return;
      const b = bodies[held];
      if (state === "carry") {
        const t = b.translation();
        if (Math.max(Math.abs(t.x), Math.abs(t.z)) < 2.8) {
          slot = nextSlot(now(), held, t.x, t.z);
          carryQ.set(slot[3], slot[4], slot[5], slot[6]);
          target.set(slot[0], slot[1] + 0.03, slot[2]);
          setState("lower");
          return;
        }
      }
      drop(b);
      held = -1;
      robot = false;
      setState("idle");
    };

    // The hand: the held block chases its target at a human pace, along its length while it is
    // still in the tower, then up and over once it is out.
    const hand = (dt: number) => {
      if (held < 0) return;
      const b = bodies[held];
      const t = b.translation();
      const pos = new THREE.Vector3(t.x, t.y, t.z);
      const r = b.rotation();
      const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);

      if (state === "pull") {
        const want = target.clone().sub(origin).dot(axis);
        const step = Math.max(-PULL_SPEED * dt, Math.min(PULL_SPEED * dt, want - along));
        along += step;
        pos.copy(origin).addScaledVector(axis, along);
        const speed = Math.abs(step) / dt;
        if (speed > SAFE_SPEED) {
          const level = Math.round((origin.y - H / 2) / H);
          const kick =
            GRIP * Math.min(1, (speed - SAFE_SPEED) / 3) * GRAVITY * dt * Math.sign(step);
          bodies.forEach((other, i) => {
            if (i === held || Math.round((other.translation().y - H / 2) / H) !== level + 1) return;
            const m = other.mass();
            other.applyImpulse({ x: axis.x * m * kick, y: 0, z: axis.z * m * kick }, true);
          });
        }
        if (Math.abs(along) > L + 0.15) lift();
      } else if (state === "carry" || state === "lower") {
        const dy = target.y - pos.y;
        pos.y += Math.sign(dy) * Math.min(Math.abs(dy), LIFT_SPEED * dt);
        // Rise clear before moving across, so the block never sweeps through the tower.
        if (state === "lower" || Math.abs(target.y - pos.y) < 0.05) {
          const flat = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
          const d = flat.length();
          if (d > 0) pos.addScaledVector(flat, Math.min(1, (CARRY_SPEED * dt) / d));
        }
        q.slerp(carryQ, Math.min(1, dt * 8));
        if (state === "lower" && pos.distanceTo(target) < 0.01 && q.angleTo(carryQ) < 0.01) {
          b.setNextKinematicTranslation(pos);
          b.setNextKinematicRotation(carryQ);
          drop(b);
          held = -1;
          robot = false;
          calm = 0;
          clock = 0;
          setState("settle");
          return;
        }
        if (robot && state === "carry" && slot) {
          target.set(slot[0], carryY, slot[2]);
          if (Math.hypot(pos.x - slot[0], pos.z - slot[2]) < 0.02) release();
        }
      }
      b.setNextKinematicTranslation(pos);
      b.setNextKinematicRotation(q);
    };

    const finish = (next: Tower) => {
      latest.current.send(next);
      setState("done");
    };

    const simulate = (dt: number, time: number) => {
      if (!world) return;
      const t = latest.current.table;
      if (!t || keyOf(t) !== simFor) return;
      const moving = held >= 0 || bodies.some((b) => !b.isSleeping());
      if (!moving && state === "idle") return;

      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 8) {
        hand(STEP);
        world.step();
        acc -= STEP;
        n++;
      }
      if (n === 8) acc = 0;
      const poses = now();
      aimAt(poses);
      for (const piece of pieces) {
        piece.mesh.position.copy(piece.p);
        piece.mesh.quaternion.copy(piece.q);
      }

      if (time * 1000 - lastLive > LIVE_MS) {
        lastLive = time * 1000;
        latest.current.stream({ round: t.round, pulls: t.pulls, held, poses: poses.map(trim) });
      }

      if (state !== "falling" && state !== "done" && fallen(start, poses, taken)) {
        if (held >= 0) drop(bodies[held]);
        held = -1;
        clock = 0;
        setState("falling");
      }
      clock += dt;
      if (state === "falling" && clock > 2.6) finish(collapse(t, poses.map(trim)));

      if (state === "settle") {
        const still = bodies.every((b) => {
          const v = b.linvel();
          const w = b.angvel();
          return Math.hypot(v.x, v.y, v.z) < 0.03 && Math.hypot(w.x, w.y, w.z) < 0.06;
        });
        calm = still ? calm + dt : 0;
        if (calm > 0.5 || clock > 6) {
          if (onTop(poses, taken)) finish(place(t, poses.map(trim), taken));
          else setState("idle");
        }
      }
    };

    const stage: Stage = createStage(host, {
      frame: (dt, time) => {
        const { table: t, myTurn: mine, cursor: cur } = latest.current;
        const driven = !!world && mine && (held >= 0 || state !== "idle");
        if (driven) simulate(dt, time);
        else {
          if (world && mine) simulate(dt, time);
          const k = 1 - Math.exp(-dt * 14);
          for (const piece of pieces) {
            if (piece.wait > 0) {
              piece.wait -= dt;
              continue;
            }
            piece.mesh.position.lerp(piece.p, k);
            piece.mesh.quaternion.slerp(piece.q, k);
          }
        }

        const grabbing = mine ? held : liveHeld;
        for (const [i, piece] of pieces.entries()) {
          const live = !!t && mine && state === "idle" && canPull({ ...t, poses: start }, i);
          const glow =
            i === grabbing ? 0xff2d95 : live && (i === hovered || i === cur) ? 0x22d3ee : 0x000000;
          piece.material.emissive.setHex(glow);
          piece.material.emissiveIntensity =
            i === grabbing ? 0.45 + Math.sin(time * 8) * 0.15 : 0.4;
        }

        const goal = t ? Math.max(3, (height(t.poses) * H) / 2) : 4.5;
        camY += (goal - camY) * Math.min(1, dt * 2);
        stage.controls.target.y = camY;
      },
      hover: (e) => {
        if (held >= 0) return;
        const hit = stage.pick(e, tower.children);
        hovered = hit ? hit.object.userData.id : -1;
        const { table: t, myTurn: mine } = latest.current;
        host.style.cursor =
          t && mine && state === "idle" && hovered >= 0 && canPull({ ...t, poses: start }, hovered)
            ? "grab"
            : "";
      },
    });
    const s = stage;
    s.scene.add(tower);
    s.camera.position.set(13, 11, 16);
    s.controls.minDistance = 8;
    s.controls.maxDistance = 32;

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onPlane = (e: PointerEvent, y: number) => {
      const r = s.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, s.camera);
      return ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -y),
        new THREE.Vector3()
      );
    };

    // Runs before the orbit controls see the press, so grabbing a block never spins the camera.
    const onDown = (e: PointerEvent) => {
      const { table: t, myTurn: mine } = latest.current;
      if (!t || !mine || !world || state !== "idle" || keyOf(t) !== simFor) return;
      const hit = s.pick(e, tower.children);
      if (!hit) return;
      const id = hit.object.userData.id as number;
      if (id !== taken && !canPull({ ...t, poses: now() }, id)) return;
      s.controls.enabled = false;
      s.canvas.setPointerCapture(e.pointerId);
      grab(id, hit.point);
      host.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (held < 0 || robot || state === "lower") return;
      const at = onPlane(e, planeY);
      if (!at) return;
      at.sub(offset);
      if (state === "pull") target.copy(at);
      else target.set(at.x, carryY, at.z);
    };
    const onUp = () => {
      s.controls.enabled = true;
      host.style.cursor = "";
      if (!robot) release();
    };
    host.addEventListener("pointerdown", onDown, { capture: true });
    s.canvas.addEventListener("pointermove", onMove);
    s.canvas.addEventListener("pointerup", onUp);
    s.canvas.addEventListener("pointercancel", onUp);

    const rebuild = (t: Tower) => {
      aimAt(t.poses);
      t.poses.forEach((pose, i) => {
        const piece = pieceFor(i);
        const level = Math.round((pose[1] - H / 2) / H);
        piece.mesh.position.set(pose[0], pose[1] + 9 + level * 0.4, pose[2]);
        piece.mesh.quaternion.copy(piece.q);
        piece.wait = level * 0.05 + (i % 3) * 0.02;
      });
      for (const piece of pieces.slice(t.poses.length)) piece.mesh.visible = false;
    };

    view.current = {
      sync: (t, mine) => {
        if (t.round !== round) {
          round = t.round;
          free();
          rebuild(t);
        } else if (keyOf(t) !== simFor || !mine) aimAt(t.poses);
        liveHeld = -1;
        if (mine && !t.loser) {
          if (keyOf(t) !== simFor) build(t);
        } else {
          free();
          if (state !== "idle") setState("idle");
        }
      },
      live: (l) => {
        const { table: t, myTurn: mine } = latest.current;
        if (!t || mine || l.round !== t.round || l.pulls !== t.pulls) return;
        aimAt(l.poses);
        liveHeld = l.held;
      },
      auto: (id) => {
        const { table: t, myTurn: mine } = latest.current;
        if (!t || !mine || !world || state !== "idle" || !canPull({ ...t, poses: now() }, id))
          return;
        const b = bodies[id].translation();
        grab(id, new THREE.Vector3(b.x, b.y, b.z));
        robot = true;
        // Push it out toward whichever end faces the camera.
        const toward = s.camera.position.clone().setY(0).dot(axis) >= 0 ? 1 : -1;
        target.copy(origin).addScaledVector(axis, toward * (L + 0.5));
      },
    };

    import("@dimforge/rapier3d-compat")
      .then(async (m) => {
        await m.default.init();
        if (!alive) return;
        R = m.default;
        setReady(true);
        const t = latest.current.table;
        if (t) view.current?.sync(t, latest.current.myTurn);
      })
      .catch(() => alive && setReady("failed"));
    const first = latest.current.table ?? newTower([]);
    round = first.round;
    rebuild(first);

    return () => {
      alive = false;
      view.current = null;
      free();
      host.removeEventListener("pointerdown", onDown, { capture: true });
      texture.dispose();
      s.dispose();
    };
  }, [failed]);

  useEffect(() => {
    if (table) view.current?.sync(table, myTurn);
  }, [table, myTurn]);

  useEffect(() => {
    if (table?.pulls) sfx.clack();
  }, [table?.pulls]);
  useEffect(() => {
    if (table?.loser) sfx.crash();
  }, [table?.loser]);

  const pullable =
    table && myTurn && mode === "idle"
      ? table.poses
          .map((p, i) => ({ i, at: Math.round((p[1] - H / 2) / H) * 3 + i }))
          .filter(({ i }) => canPull(table, i))
          .sort((a, b) => a.at - b.at)
          .map(({ i }) => i)
      : [];
  const onKey = (e: React.KeyboardEvent) => {
    if (!pullable.length) return;
    const at = Math.max(0, pullable.indexOf(cursor));
    const step = STEPS[e.key];
    if (step) {
      e.preventDefault();
      setCursor(pullable[(at + step + pullable.length * 3) % pullable.length]);
    }
    if ((e.key === "Enter" || e.key === " ") && cursor >= 0) {
      e.preventDefault();
      view.current?.auto(cursor);
    }
  };

  const upGone = !!up && !players.some((p) => p.id === up);
  const start = () =>
    send(
      newTower(
        players.map((p) => p.id),
        (table?.round ?? 0) + 1,
        table?.falls ?? {}
      )
    );

  const status = !table
    ? isHost
      ? "Stack's built. Start when everyone's in."
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.loser
      ? `${name(table.loser)} brought the tower down!`
      : myTurn
        ? ready === "failed"
          ? "The physics engine could not start in this browser. Reload to try again."
          : ready
            ? HINT[mode]
            : "Loading the physics…"
        : `${name(up)} is pulling…`;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={mount}
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="Tower. Arrow keys pick a block, Enter pulls it out and stacks it on top."
        className="absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset"
      >
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            This browser could not start 3D graphics. Try another browser or turn on hardware
            acceleration.
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3">
        <ul className="flex flex-wrap justify-center gap-1.5">
          {(table?.order ?? players.map((p) => p.id)).map((id) => (
            <li
              key={id}
              className={`cab rounded-md px-2.5 py-1 text-sm ${up === id ? "cab-hot" : ""} ${
                table?.loser === id ? "border-red-500" : ""
              }`}
            >
              <span className="text-zinc-200">
                {name(id)}
                {id === me.id && " (you)"}
              </span>{" "}
              <span className="text-red-400" title="Towers knocked down">
                {"▼".repeat(Math.min(99, table?.falls[id] ?? 0))}
              </span>
            </li>
          ))}
        </ul>
        <p
          role="status"
          className={`rounded-sm bg-[#06030d]/75 px-3 py-1.5 text-center text-sm sm:text-base ${
            table?.loser
              ? "flash-win pixel text-[1.04rem] text-red-400"
              : myTurn
                ? "text-emerald-400"
                : "text-zinc-300"
          }`}
        >
          {status}
        </p>
      </div>

      {table && !table.loser && (
        <span className="pixel pointer-events-none absolute bottom-3 left-3 rounded-sm bg-[#06030d]/70 px-2 py-1 text-[0.8rem] text-zinc-300">
          {height(table.poses)} levels · {table.pulls} pulls
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {upGone && isHost && table && !table.loser && (
          <button
            onClick={() => send(leave(table))}
            className="btn-ghost rounded-sm bg-[#06030d]/80 px-3 py-2 text-[0.88rem]"
          >
            Whoever is up left the room — skip them
          </button>
        )}
        {(!table || table.loser) && roster}
        {isHost && (!table || table.loser) && (
          <button
            onClick={start}
            disabled={players.length < 2}
            className="btn-arcade play-pulse rounded-sm px-6 py-3 disabled:opacity-40"
          >
            {table ? "Rebuild" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
