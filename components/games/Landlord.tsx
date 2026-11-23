"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { hash, rng } from "@/lib/rng.ts";
import {
  BAIL,
  BOARD,
  GROUPS,
  HOTEL,
  active,
  bail,
  build,
  buy,
  canBuild,
  current,
  decline,
  end,
  finish,
  leave,
  newLandlord,
  rentFor,
  roll,
  worth,
  type Landlord as Game,
} from "@/lib/landlord.ts";
import { useTable } from "@/lib/useTable";
import type { GameProps } from "@/lib/useRoom";
import { createStage, has3D, type Stage } from "./stage";
import { createDice, stepDie, toss } from "./dice";

const SEATS = 6;
const TOKENS = ["#ff2d95", "#22d3ee", "#ffc83d", "#39ff88", "#a78bfa", "#fb923c"];

const C = 2.6;
const T = 1.6;
const HALF = C + 4.5 * T;
const BAR = 0.55;
const PX = 2048;
const PPU = PX / (HALF * 2);

type Tile = { x: number; z: number; w: number; d: number; side: number };

const SIDE_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
const INWARD = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function tile(i: number): Tile {
  const side = Math.floor(i / 10);
  const k = i % 10;
  if (!k) {
    const [x, z] = [
      [HALF - C / 2, HALF - C / 2],
      [-HALF + C / 2, HALF - C / 2],
      [-HALF + C / 2, -HALF + C / 2],
      [HALF - C / 2, -HALF + C / 2],
    ][side];
    return { x, z, w: C, d: C, side };
  }
  const along = HALF - C - (k - 0.5) * T;
  const [x, z] = [
    [along, HALF - C / 2],
    [-HALF + C / 2, along],
    [-along, -HALF + C / 2],
    [HALF - C / 2, -along],
  ][side];
  return { x, z, w: T, d: C, side };
}

const TILES = BOARD.map((_, i) => tile(i));

function tileAt(x: number, z: number) {
  return TILES.findIndex((t) => {
    const [hx, hz] = t.side % 2 && t.w !== t.d ? [t.d / 2, t.w / 2] : [t.w / 2, t.d / 2];
    return Math.abs(x - t.x) <= hx && Math.abs(z - t.z) <= hz;
  });
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last && g.measureText(`${last} ${word}`).width <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function drawBoard(
  canvas: HTMLCanvasElement,
  owner: Record<number, string>,
  colourOf: (id: string) => string
) {
  const g = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;
  g.fillStyle = "#0b0618";
  g.fillRect(0, 0, PX, PX);

  g.save();
  g.translate(PX / 2, PX / 2);
  g.rotate(-Math.PI / 4);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `150px ${font}`;
  g.shadowColor = "#ff2d95";
  g.shadowBlur = 40;
  g.fillStyle = "#f7f3ff";
  g.fillText("LANDLORD", 0, -40);
  g.shadowBlur = 0;
  g.font = `56px ${font}`;
  g.fillStyle = "#22d3ee";
  g.fillText("buy it · build it · bill them", 0, 70);
  g.restore();

  BOARD.forEach((space, i) => {
    const t = TILES[i];
    const w = t.w * PPU;
    const d = t.d * PPU;
    g.save();
    g.translate((t.x + HALF) * PPU, (t.z + HALF) * PPU);
    g.rotate(SIDE_ANGLE[t.side]);
    g.fillStyle = "#150c28";
    g.fillRect(-w / 2, -d / 2, w, d);
    g.strokeStyle = "#4a3480";
    g.lineWidth = 4;
    g.strokeRect(-w / 2, -d / 2, w, d);
    if (space.group !== undefined) {
      g.fillStyle = GROUPS[space.group];
      g.fillRect(-w / 2 + 2, -d / 2 + 2, w - 4, BAR * PPU);
    }
    const holder = owner[i];
    if (holder) {
      g.fillStyle = colourOf(holder);
      g.fillRect(-w / 2 + 2, d / 2 - 22, w - 4, 20);
    }

    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ece5ff";
    const corner = t.w === t.d;
    g.font = `${corner ? 52 : 36}px ${font}`;
    const label =
      space.kind === "glitch"
        ? "? GLITCH"
        : space.kind === "bonus"
          ? "★ BONUS"
          : space.kind === "rail"
            ? `▣ ${space.name}`
            : space.kind === "util"
              ? `ϟ ${space.name}`
              : space.name.toUpperCase();
    const lines = wrap(g, label, w - 18);
    const top = corner ? -d / 2 + d * 0.38 : -d / 2 + BAR * PPU + 46;
    lines.forEach((line, n) => g.fillText(line, 0, top + n * (corner ? 54 : 38)));
    if (corner && space.kind === "go") {
      g.fillStyle = "#39ff88";
      g.font = `40px ${font}`;
      g.fillText("collect $200", 0, top + 70);
    }
    const bottom = space.price ?? space.tax;
    if (bottom) {
      g.fillStyle = "#b3a3e6";
      g.font = `34px ${font}`;
      g.fillText(`$${bottom}`, 0, d / 2 - 48);
    }
    g.restore();
  });
}

function pawn(colour: string) {
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.2,
  });
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.32, 0],
        [0.32, 0.08],
        [0.2, 0.15],
        [0.12, 0.46],
        [0.22, 0.52],
        [0.06, 0.6],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      24
    ),
    material
  );
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), material);
  head.position.y = 0.72;
  const group = new THREE.Group();
  group.add(body, head);
  for (const m of [body, head]) m.castShadow = true;
  return group;
}

type Hop = { to: THREE.Vector3; dur: number; lift: number };
type Token = { mesh: THREE.Group; pos: number; from: THREE.Vector3; hops: Hop[]; t: number };

// Pawns share the outer half of a square, clear of the colour bar and the houses on it.
const spot = (i: number, seat: number) => {
  const t = TILES[i];
  const [ix, iz] = INWARD[t.side];
  const out = t.w === t.d ? 0 : 0.35;
  const a = (seat / SEATS) * Math.PI * 2;
  return new THREE.Vector3(
    t.x - ix * out + Math.cos(a) * 0.4,
    0.02,
    t.z - iz * out + Math.sin(a) * 0.4
  );
};

export default function Landlord({ code, players, me }: GameProps) {
  const [table, send] = useTable<Game>(`landlord:${code}`, me.id);
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<{ sync: (g: Game) => void; select: (i: number) => void } | null>(null);
  const [failed] = useState(() => !has3D());
  const [picked, setPicked] = useState(-1);
  const latest = useRef({ table, names: players });

  const isHost = players[0]?.id === me.id;
  const up = table && !table.winner ? current(table) : "";
  const myTurn = up === me.id;
  const upGone = !!up && !players.some((p) => p.id === up);
  const selected = picked >= 0 ? picked : (table?.offer ?? -1);

  useEffect(() => {
    latest.current = { table, names: players };
  });

  useEffect(() => {
    const host = mount.current;
    if (!host || failed) return;
    const tokens = new Map<string, Token>();
    const houses = new Map<number, THREE.Group>();
    const { dice, dispose } = createDice(2, 0.9);
    let throws = -1;
    let round = -1;
    let drawn = "";

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PX;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const colourOf = (id: string) => {
      const seat = latest.current.table?.order.indexOf(id) ?? -1;
      return TOKENS[seat] ?? "#8b76c9";
    };
    const paint = (owner: Record<number, string>) => {
      drawBoard(canvas, owner, colourOf);
      texture.needsUpdate = true;
    };

    const stage: Stage = createStage(host, {
      frame: (dt, time) => {
        for (const d of dice) stepDie(d, dt);
        for (const token of tokens.values()) {
          const hop = token.hops[0];
          if (!hop) continue;
          token.t += dt;
          const k = Math.min(1, token.t / hop.dur);
          token.mesh.position.lerpVectors(token.from, hop.to, k);
          token.mesh.position.y += Math.sin(Math.PI * k) * hop.lift;
          if (k >= 1) {
            token.from = hop.to;
            token.hops.shift();
            token.t = 0;
          }
        }
        marker.material.opacity = 0.35 + Math.sin(time * 5) * 0.15;
      },
      tap: (e) => {
        const hit = stage.pick(e, [board]);
        if (hit) setPicked(tileAt(hit.point.x, hit.point.z));
      },
    });
    const s = stage;
    s.camera.position.set(0, 20, 17);
    s.controls.target.set(0, 0, 0.5);
    s.controls.minDistance = 10;
    s.controls.maxDistance = 40;

    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2, HALF * 2),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 })
    );
    board.rotation.x = -Math.PI / 2;
    board.position.y = 0.01;
    board.receiveShadow = true;
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(HALF * 2 + 0.3, 0.4, HALF * 2 + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1d1236, metalness: 0.4, roughness: 0.5 })
    );
    base.position.y = -0.2;
    const rim = new THREE.LineSegments(
      new THREE.EdgesGeometry(base.geometry),
      new THREE.LineBasicMaterial({ color: 0xff2d95 })
    );
    rim.position.copy(base.position);
    const group = new THREE.Group();
    group.position.y = 0.4;
    group.add(board, base, rim);
    s.scene.add(group);

    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.06, 1),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4 })
    );
    marker.visible = false;
    group.add(marker);

    for (const d of dice) {
      group.add(d.mesh);
      d.from = new THREE.Vector3(-0.8, 0.45, 0.6);
      d.to = d.from.clone();
    }
    dice[1].to = dice[1].from = new THREE.Vector3(0.8, 0.45, 1);

    const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x39ff88, roughness: 0.4 });
    const hotelMaterial = new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.4 });
    const showHouses = (i: number, n: number) => {
      const old = houses.get(i);
      if ((old?.userData.n ?? 0) === n) return;
      if (old) group.remove(old);
      houses.delete(i);
      if (!n) return;
      const t = TILES[i];
      const [ix, iz] = INWARD[t.side];
      const [ax, az] = [Math.abs(iz), Math.abs(ix)];
      const cx = t.x + ix * (t.d / 2 - BAR / 2);
      const cz = t.z + iz * (t.d / 2 - BAR / 2);
      const built = new THREE.Group();
      built.userData.n = n;
      const pieces =
        n === HOTEL ? [0] : Array.from({ length: n }, (_, j) => (j - (n - 1) / 2) * 0.36);
      for (const off of pieces) {
        const mesh = new THREE.Mesh(
          n === HOTEL
            ? new THREE.BoxGeometry(0.9, 0.36, 0.36)
            : new THREE.BoxGeometry(0.26, 0.26, 0.26),
          n === HOTEL ? hotelMaterial : houseMaterial
        );
        if (n === HOTEL && t.side % 2) mesh.rotation.y = Math.PI / 2;
        mesh.position.set(cx + ax * off, n === HOTEL ? 0.18 : 0.13, cz + az * off);
        mesh.castShadow = true;
        built.add(mesh);
      }
      houses.set(i, built);
      group.add(built);
    };

    const select = (i: number) => {
      marker.visible = i >= 0;
      if (i < 0) return;
      const t = TILES[i];
      marker.position.set(t.x, 0.03, t.z);
      marker.scale.set(
        t.side % 2 && t.w !== t.d ? t.d : t.w,
        1,
        t.side % 2 && t.w !== t.d ? t.w : t.d
      );
    };

    view.current = {
      select,
      sync: (g) => {
        const fresh = g.round !== round;
        const key = JSON.stringify(g.owner) + g.order.join();
        if (key !== drawn) {
          drawn = key;
          paint(g.owner);
        }
        BOARD.forEach((_, i) => showHouses(i, g.houses[i] ?? 0));

        const rolled = !fresh && g.throws !== throws && throws >= 0;
        if (rolled) {
          const random = rng(hash(`${g.seed}:${g.throws}:look`));
          dice.forEach((d, i) =>
            toss(
              d,
              g.dice[i],
              new THREE.Vector3(-6 + random() * 2, 0.45, 6 + random() * 2),
              new THREE.Vector3(
                (i ? 0.8 : -0.8) + (random() - 0.5) * 0.6,
                0.45,
                0.8 + (random() - 0.5) * 0.8
              ),
              random
            )
          );
        }

        g.order.forEach((id, seat) => {
          let token = tokens.get(id);
          if (!token) {
            const mesh = pawn(TOKENS[seat]);
            group.add(mesh);
            const at = spot(g.pos[id], seat);
            mesh.position.copy(at);
            token = { mesh, pos: g.pos[id], from: at, hops: [], t: 0 };
            tokens.set(id, token);
          }
          token.mesh.visible = !g.out.includes(id);
          if (fresh) {
            token.hops = [{ to: spot(g.pos[id], seat), dur: 0.4, lift: 1 }];
            token.pos = g.pos[id];
            return;
          }
          if (token.pos === g.pos[id]) return;
          const sum = g.dice[0] + g.dice[1];
          const walked = rolled && (token.pos + sum) % 40 === g.pos[id];
          // Wait for the dice to land, then hop square by square, or leap if a card moved you.
          const hops: Hop[] = rolled ? [{ to: token.mesh.position.clone(), dur: 1, lift: 0 }] : [];
          if (walked)
            for (let n = 1; n <= sum; n++)
              hops.push({ to: spot((token.pos + n) % 40, seat), dur: 0.17, lift: 0.55 });
          else hops.push({ to: spot(g.pos[id], seat), dur: 0.7, lift: 2.5 });
          token.hops = [...token.hops, ...hops];
          token.pos = g.pos[id];
        });
        throws = g.throws;
        round = g.round;
      },
    };
    paint({});
    document.fonts?.ready.then(() => paint(latest.current.table?.owner ?? {}));
    if (latest.current.table) view.current.sync(latest.current.table);

    return () => {
      view.current = null;
      dispose();
      texture.dispose();
      s.dispose();
    };
  }, [failed]);

  useEffect(() => {
    if (table) view.current?.sync(table);
  }, [table]);

  useEffect(() => view.current?.select(selected), [selected]);

  const order = table?.order ?? [];
  const name = (id?: string) => players.find((p) => p.id === id)?.name ?? "someone";
  const say = (line: string) => order.reduce((text, id) => text.replaceAll(id, name(id)), line);
  const start = () =>
    send(
      newLandlord(
        `${code}-${Date.now()}`,
        players.slice(0, SEATS).map((p) => p.id),
        (table?.round ?? 0) + 1
      )
    );

  const offer = table && table.offer >= 0 ? BOARD[table.offer] : null;
  const jailed = !!table && up in table.jail;
  const space = selected >= 0 ? BOARD[selected] : null;
  const mine = table ? BOARD.map((_, i) => i).filter((i) => table.owner[i] === me.id) : [];

  const status = !table
    ? isHost
      ? `Up to ${SEATS} players, $1500 each. Start when everyone's in.`
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.winner
      ? `${name(table.winner)} owns the town!`
      : myTurn
        ? offer
          ? `${offer.name} is for sale.`
          : table.canRoll
            ? jailed
              ? "You're in jail. Roll doubles, or pay to walk out."
              : "Your roll."
            : "Build if you like, then end your turn."
        : `${name(up)} is playing…`;

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <ul className="flex flex-wrap justify-center gap-2">
        {(table ? order : players.slice(0, SEATS).map((p) => p.id)).map((id, seat) => {
          const out = !!table?.out.includes(id);
          return (
            <li
              key={id}
              className={`cab flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                up === id ? "cab-hot" : ""
              } ${out ? "opacity-40" : ""}`}
            >
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: TOKENS[seat], boxShadow: `0 0 8px ${TOKENS[seat]}` }}
              />
              <span className={out ? "text-zinc-500 line-through" : "text-zinc-200"}>
                {name(id)}
                {id === me.id && " (you)"}
              </span>
              {table && (
                <span className="neon-green" title={`Net worth $${worth(table, id)}`}>
                  ${table.cash[id]}
                </span>
              )}
              {table && id in table.jail && <span className="text-xs text-red-400">jailed</span>}
            </li>
          );
        })}
      </ul>

      <p
        role="status"
        className={`text-center text-sm ${
          table?.winner
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
        className="cab relative h-[62vh] max-h-[640px] min-h-[340px] w-full overflow-hidden rounded-md"
      >
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-400">
            This browser could not start 3D graphics. Try another browser or turn on hardware
            acceleration.
          </p>
        )}
        {table && !table.winner && (
          <span className="pixel pointer-events-none absolute top-3 left-3 text-[0.5rem] text-zinc-400">
            Tap a square for its deed · drag to turn the board
          </span>
        )}
      </div>

      {table && myTurn && !table.winner && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {offer ? (
            <>
              <button
                onClick={() => send(buy(table))}
                disabled={table.cash[me.id] < offer.price!}
                className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
              >
                Buy for ${offer.price}
              </button>
              <button
                onClick={() => send(decline(table))}
                className="btn-ghost rounded-sm px-4 py-2"
              >
                Pass
              </button>
            </>
          ) : table.canRoll ? (
            <>
              {jailed && (
                <button
                  onClick={() => send(bail(table))}
                  disabled={table.cash[me.id] < BAIL}
                  className="btn-ghost rounded-sm px-4 py-2 disabled:opacity-40"
                >
                  Pay ${BAIL} bail
                </button>
              )}
              <button
                onClick={() => {
                  setPicked(-1);
                  send(roll(table));
                }}
                className="btn-arcade rounded-sm px-5 py-2"
              >
                {jailed ? "Roll for doubles" : "Roll"}
              </button>
            </>
          ) : (
            <button onClick={() => send(end(table))} className="btn-arcade rounded-sm px-5 py-2">
              End turn
            </button>
          )}
        </div>
      )}

      {table && (
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <section className="cab flex flex-col gap-2 rounded-md p-4" aria-label="Deed">
            {space ? (
              <>
                <div
                  className="-mx-4 -mt-4 mb-1 h-3 rounded-t-md"
                  style={{
                    background: space.group !== undefined ? GROUPS[space.group] : "transparent",
                  }}
                />
                <h3 className="text-zinc-100">{space.name}</h3>
                {space.price ? (
                  <>
                    <p className="text-sm text-zinc-400">
                      Price ${space.price}
                      {space.house && ` · house $${space.house}`} · owner{" "}
                      <span className="text-zinc-200">
                        {table.owner[selected] ? name(table.owner[selected]) : "the bank"}
                      </span>
                    </p>
                    {space.rent ? (
                      <ul className="grid grid-cols-3 gap-x-3 text-xs text-zinc-400">
                        {space.rent.map((r, n) => (
                          <li
                            key={n}
                            className={(table.houses[selected] ?? 0) === n ? "text-zinc-100" : ""}
                          >
                            {n === 0
                              ? "Rent"
                              : n === HOTEL
                                ? "Hotel"
                                : `${n} house${n > 1 ? "s" : ""}`}{" "}
                            ${r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        {space.kind === "rail"
                          ? "Rent $25, doubling for every line the owner holds."
                          : "Rent is 4× the roll, or 10× with both utilities."}
                      </p>
                    )}
                    {table.owner[selected] && (
                      <p className="text-xs text-zinc-500">
                        Rent right now: ${rentFor(table, selected, table.dice[0] + table.dice[1])}
                      </p>
                    )}
                    {myTurn && canBuild(table, selected) && (
                      <button
                        onClick={() => send(build(table, selected))}
                        className="btn-arcade self-start rounded-sm px-3 py-2 text-[0.55rem]"
                      >
                        Build {(table.houses[selected] ?? 0) === HOTEL - 1 ? "hotel" : "house"} · $
                        {space.house}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">
                    {space.kind === "glitch" || space.kind === "bonus"
                      ? "Draw a card. It might pay, it might cost, it might move you."
                      : space.tax
                        ? `Pay $${space.tax} to the bank.`
                        : space.kind === "arrest"
                          ? "Straight to jail. No salary."
                          : space.kind === "go"
                            ? "Collect $200 every time you pass."
                            : "Nothing happens here."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Tap a square on the board, or one of your deeds below, to see its rents and build on
                it.
              </p>
            )}
            {mine.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {mine.map((i) => (
                  <button
                    key={i}
                    onClick={() => setPicked(i)}
                    className="flex items-center gap-1.5 rounded-sm bg-zinc-900 px-2 py-1 text-[0.5rem] normal-case text-zinc-300"
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-[1px]"
                      style={{
                        background:
                          BOARD[i].group !== undefined ? GROUPS[BOARD[i].group!] : "#8b76c9",
                      }}
                    />
                    {BOARD[i].name}
                    {table.houses[i]
                      ? ` ${table.houses[i] === HOTEL ? "H" : "⌂".repeat(table.houses[i])}`
                      : ""}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="cab flex flex-col gap-1 rounded-md p-4" aria-label="What happened">
            <h3 className="pixel text-[0.5rem] text-zinc-500">What happened</h3>
            <ol className="flex flex-col gap-1 text-sm text-zinc-300">
              {table.log.length ? (
                table.log.map((line, n) => (
                  <li
                    key={`${table.throws}-${n}`}
                    className={n === table.log.length - 1 ? "" : "text-zinc-500"}
                  >
                    {say(line)}
                  </li>
                ))
              ) : (
                <li className="text-zinc-500">Nothing yet.</li>
              )}
            </ol>
          </section>
        </div>
      )}

      {upGone && isHost && table && !table.winner && (
        <button
          onClick={() => send(leave(table))}
          className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
        >
          Whoever is up left the room — take them out
        </button>
      )}

      {isHost && table && !table.winner && active(table).length > 1 && (
        <button
          onClick={() => send(finish(table))}
          className="btn-ghost btn-danger rounded-sm px-3 py-2 text-[0.55rem]"
        >
          Call it — richest on paper wins
        </button>
      )}

      {isHost && (!table || table.winner) && (
        <button
          onClick={start}
          disabled={players.length < 2}
          className="btn-arcade rounded-sm px-4 py-2 disabled:opacity-40"
        >
          {table ? "New game" : "Start"}
        </button>
      )}
      {table && !order.includes(me.id) && (
        <p className="text-xs text-zinc-500">You are watching this game. Join the next one.</p>
      )}
    </div>
  );
}
