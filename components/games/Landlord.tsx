"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { hash, rng } from "@/lib/rng.ts";
import {
  BAIL,
  BOARD,
  CARDS,
  GROUPS,
  HOTEL,
  actor,
  active,
  answer,
  bail,
  bid,
  build,
  buy,
  canBuild,
  canLift,
  canMortgage,
  canSell,
  current,
  decline,
  end,
  finish,
  fold,
  jailCard,
  leave,
  lift,
  liftCost,
  mortgage,
  mortgageValue,
  newLandlord,
  propose,
  rentFor,
  roll,
  sell,
  tradeable,
  withdraw,
  worth,
  type Deck,
  type Landlord as Game,
} from "@/lib/landlord.ts";
import { useTable } from "@/lib/useTable";
import { sfx } from "@/lib/sfx";
import type { GameProps } from "@/lib/useRoom";
import { createStage, ease, has3D, type Stage } from "./stage";
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

const DECKS: Record<Deck, { name: string; glyph: string; colour: string; at: [number, number] }> = {
  glitch: { name: "GLITCH", glyph: "?", colour: "#ff2d95", at: [-3.7, -3.7] },
  bonus: { name: "BONUS", glyph: "★", colour: "#22d3ee", at: [3.7, 3.7] },
};
const CARD_W = 1.7;
const CARD_D = 2.5;

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function deckFace(deck: Deck) {
  const { name, glyph, colour } = DECKS[deck];
  const canvas = document.createElement("canvas");
  canvas.width = 340;
  canvas.height = 500;
  const g = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;
  g.fillStyle = "#f7f3ff";
  roundRect(g, 0, 0, 340, 500, 28);
  g.fill();
  g.fillStyle = colour;
  roundRect(g, 14, 14, 312, 472, 20);
  g.fill();
  g.strokeStyle = "#06030d";
  g.lineWidth = 6;
  roundRect(g, 34, 34, 272, 432, 14);
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#06030d";
  g.font = `220px ${font}`;
  g.fillText(glyph, 170, 220);
  g.font = `52px ${font}`;
  g.fillText(name, 170, 400);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function textFace(deck: Deck, text: string) {
  const { name, glyph, colour } = DECKS[deck];
  const canvas = document.createElement("canvas");
  canvas.width = 340;
  canvas.height = 500;
  const g = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;
  g.fillStyle = "#f7f3ff";
  roundRect(g, 0, 0, 340, 500, 28);
  g.fill();
  g.fillStyle = colour;
  g.fillRect(14, 14, 312, 92);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#06030d";
  g.font = `40px ${font}`;
  g.fillText(`${glyph} ${name}`, 170, 62);
  g.font = `36px ${font}`;
  const lines = wrap(g, text, 280);
  const top = 300 - (lines.length * 42) / 2;
  lines.forEach((line, n) => g.fillText(line, 170, top + n * 42));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawBoard(
  canvas: HTMLCanvasElement,
  owner: Record<number, string>,
  mortgaged: Record<number, boolean>,
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
      g.globalAlpha = mortgaged[i] ? 0.35 : 1;
      g.fillRect(-w / 2 + 2, d / 2 - 22, w - 4, 20);
      g.globalAlpha = 1;
      if (mortgaged[i]) {
        g.save();
        g.rotate(-0.5);
        g.fillStyle = "#ff2e63";
        g.font = `28px ${getComputedStyle(document.body).fontFamily}`;
        g.textAlign = "center";
        g.fillText("MORTGAGED", 0, 10);
        g.restore();
      }
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
type Flight = {
  card: THREE.Group;
  from: THREE.Vector3;
  start: THREE.Quaternion;
  t: number;
  delay: number;
};
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
  const [saved, send] = useTable<Game>(`landlord:${code}`, me.id);
  // A table from before card decks existed cannot be played on; start a fresh one.
  const table = saved?.decks ? saved : null;
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<{ sync: (g: Game) => void; select: (i: number) => void } | null>(null);
  const [failed] = useState(() => !has3D());
  const [picked, setPicked] = useState(-1);
  const [deal, setDeal] = useState<{
    to: string;
    give: number[];
    get: number[];
    pay: number;
    ask: number;
  } | null>(null);
  const latest = useRef({ table, names: players });

  const isHost = players[0]?.id === me.id;
  const up = table && !table.winner ? current(table) : "";
  const myTurn = up === me.id && !table?.auction && !table?.trade;
  const waitingOn = table && !table.winner ? actor(table) : "";
  const upGone = !!waitingOn && !players.some((p) => p.id === waitingOn);
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
    let drewN = -1;
    let flight: Flight | null = null;

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = PX;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const colourOf = (id: string) => {
      const seat = latest.current.table?.order.indexOf(id) ?? -1;
      return TOKENS[seat] ?? "#8b76c9";
    };
    const paint = (owner: Record<number, string>, mortgaged: Record<number, boolean>) => {
      drawBoard(canvas, owner, mortgaged, colourOf);
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
        if (flight) fly(flight, dt);
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

    const decks = {} as Record<Deck, THREE.Mesh>;
    const edge = new THREE.MeshStandardMaterial({ color: 0xe9e3f7, roughness: 0.8 });
    for (const deck of Object.keys(DECKS) as Deck[]) {
      const top = new THREE.MeshStandardMaterial({ map: deckFace(deck), roughness: 0.45 });
      const pile = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, 0.34, CARD_D), [
        edge,
        edge,
        top,
        edge,
        edge,
        edge,
      ]);
      pile.position.set(DECKS[deck].at[0], 0.17, DECKS[deck].at[1]);
      pile.rotation.y = Math.PI / 4;
      pile.castShadow = true;
      group.add(pile);
      decks[deck] = pile;
    }

    // The drawn card lifts off its deck, turns over and holds up in front of the camera.
    const reveal = (deck: Deck, text: string, delay: number) => {
      setTimeout(() => sfx.card(), delay * 1000);
      if (flight) {
        group.remove(flight.card);
        flight.card.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.MeshBasicMaterial).map?.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
      }
      const card = new THREE.Group();
      const plane = new THREE.PlaneGeometry(CARD_W, CARD_D);
      const front = new THREE.Mesh(
        plane,
        new THREE.MeshBasicMaterial({ map: textFace(deck, text), transparent: true })
      );
      const back = new THREE.Mesh(
        plane.clone(),
        new THREE.MeshBasicMaterial({ map: deckFace(deck), transparent: true })
      );
      back.rotation.y = Math.PI;
      card.add(front, back);
      const pile = decks[deck];
      card.position.set(pile.position.x, 0.36, pile.position.z);
      card.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
      card.visible = false;
      group.add(card);
      flight = {
        card,
        from: card.position.clone(),
        start: card.quaternion.clone(),
        t: 0,
        delay,
      };
    };
    const aim = new THREE.Object3D();
    const fly = (f: Flight, dt: number) => {
      f.t += dt;
      const t = f.t - f.delay;
      if (t < 0) return;
      f.card.visible = true;
      const to = new THREE.Vector3(0, 6.5, 6);
      const k = ease(Math.min(1, t / 0.9));
      f.card.position.lerpVectors(f.from, to, k);
      f.card.position.y += Math.sin(Math.PI * k) * 2;
      aim.position.copy(f.card.position);
      group.updateMatrixWorld();
      aim.lookAt(group.worldToLocal(s.camera.position.clone()));
      f.card.quaternion.slerpQuaternions(f.start, aim.quaternion, k);
      const fade = Math.max(0, Math.min(1, (t - 4.2) / 0.5));
      f.card.children.forEach(
        (c) =>
          ((c as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity =
            1 - fade)
      );
      if (fade >= 1) f.card.visible = false;
    };

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
    const showHouses = (i: number, count: number) => {
      const n = Math.min(HOTEL, Math.max(0, Math.floor(count) || 0));
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
        const key = JSON.stringify(g.owner) + JSON.stringify(g.mortgaged) + g.order.join();
        if (key !== drawn) {
          drawn = key;
          paint(g.owner, g.mortgaged);
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
        if (g.drew && g.drew.n !== drewN && drewN >= 0 && !fresh)
          reveal(
            g.drew.deck,
            CARDS[g.drew.deck][g.drew.card].text,
            rolled ? 1.1 + (g.dice[0] + g.dice[1]) * 0.17 : 0.2
          );
        drewN = g.drew?.n ?? 0;
        throws = g.throws;
        round = g.round;
      },
    };
    paint({}, {});
    document.fonts?.ready.then(() =>
      paint(latest.current.table?.owner ?? {}, latest.current.table?.mortgaged ?? {})
    );
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
  const auction = table?.auction ?? null;
  const trade = table?.trade ?? null;
  const bidder = auction ? auction.bidders[auction.turn] : "";
  const jailCards = table?.free[me.id]?.length ?? 0;
  const drewCard = table?.drew ? CARDS[table.drew.deck][table.drew.card] : null;

  const others = table ? active(table).filter((id) => id !== me.id) : [];
  const dealTo = deal && others.includes(deal.to) ? deal.to : (others[0] ?? "");
  const pitch =
    table && deal
      ? { from: me.id, to: dealTo, give: deal.give, get: deal.get, cash: deal.pay - deal.ask }
      : null;
  const pitchOk = !!table && !!pitch && propose(table, pitch) !== table;
  const toggle = (list: number[], i: number) =>
    list.includes(i) ? list.filter((x) => x !== i) : [...list, i];

  const status = !table
    ? isHost
      ? `Up to ${SEATS} players, $1500 each. Start when everyone's in.`
      : `Waiting for ${name(players[0]?.id)} to start…`
    : table.winner
      ? `${name(table.winner)} owns the town!`
      : auction
        ? bidder === me.id
          ? `Your bid on ${BOARD[auction.space].name}. Raise it or drop out.`
          : `${name(bidder)} is bidding on ${BOARD[auction.space].name}…`
        : trade
          ? trade.to === me.id
            ? `${name(trade.from)} wants to trade with you.`
            : `Waiting for ${name(trade.to)} to answer the trade…`
          : myTurn
            ? offer
              ? `${offer.name} is for sale. Buy it, or it goes to auction.`
              : table.canRoll
                ? jailed
                  ? "You're in jail. Roll doubles, use a card, or pay to walk out."
                  : "Your roll."
                : "Build, trade or mortgage if you like, then end your turn."
            : `${name(up)} is playing…`;

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-4">
      <ul className="flex flex-wrap justify-center gap-2">
        {(table ? order : players.slice(0, SEATS).map((p) => p.id)).map((id, seat) => {
          const out = !!table?.out.includes(id);
          const cards = table?.free[id]?.length ?? 0;
          return (
            <li
              key={id}
              className={`cab flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                waitingOn === id ? "cab-hot" : ""
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
              {cards > 0 && (
                <span
                  className="text-xs text-[color:var(--neon-amber)]"
                  title="Get out of jail free"
                >
                  jail card ×{cards}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p
        role="status"
        className={`text-center text-sm ${
          table?.winner
            ? "flash-win neon-green pixel text-[0.65rem]"
            : myTurn || bidder === me.id || trade?.to === me.id
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
        {table?.drew && drewCard && (
          <div
            key={table.drew.n}
            role="status"
            className="card-caption pointer-events-none absolute bottom-3 left-1/2 flex w-[min(22rem,90%)] -translate-x-1/2 items-center gap-3 rounded-md border-2 bg-[#f7f3ff] px-3 py-2 text-[#120b22] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            style={
              {
                borderColor: DECKS[table.drew.deck].colour,
                "--delay": `${(1.1 + (table.dice[0] + table.dice[1]) * 0.17) * 1000}ms`,
              } as React.CSSProperties
            }
          >
            <span
              aria-hidden
              className="pixel flex h-10 w-8 shrink-0 items-center justify-center rounded-sm text-[0.7rem]"
              style={{ background: DECKS[table.drew.deck].colour }}
            >
              {DECKS[table.drew.deck].glyph}
            </span>
            <span className="text-sm leading-tight">
              <span className="pixel block text-[0.45rem]" style={{ color: "#4a3480" }}>
                {name(table.drew.by)} drew {DECKS[table.drew.deck].name}
              </span>
              {drewCard.text}
            </span>
          </div>
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
                Auction it
              </button>
            </>
          ) : table.canRoll ? (
            <>
              {jailed && jailCards > 0 && (
                <button
                  onClick={() => send(jailCard(table))}
                  className="btn-ghost rounded-sm px-4 py-2"
                >
                  Use jail card
                </button>
              )}
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
          {!offer && others.length > 0 && (
            <button
              onClick={() =>
                setDeal(deal ? null : { to: others[0], give: [], get: [], pay: 0, ask: 0 })
              }
              aria-expanded={!!deal}
              className="btn-ghost rounded-sm px-4 py-2"
            >
              Trade
            </button>
          )}
        </div>
      )}

      {table && auction && (
        <section
          className="cab flex w-full max-w-xl flex-col items-center gap-3 rounded-md p-4 sm:flex-row sm:items-start"
          aria-label="Auction"
        >
          <div className="w-44 shrink-0">
            <DeedCard i={auction.space} g={table} name={name} />
          </div>
          <div className="flex flex-1 flex-col gap-2 text-sm">
            <h3 className="pixel text-[0.55rem] text-[color:var(--neon-amber)]">Auction</h3>
            <p className="text-zinc-200">
              {auction.leader
                ? `Top bid $${auction.bid} — ${name(auction.leader)}`
                : "No bids yet. The bank is selling."}
            </p>
            <p className="text-xs text-zinc-400">
              Still in: {auction.bidders.map((id) => name(id)).join(", ")}
            </p>
            {bidder === me.id ? (
              <div className="flex flex-wrap gap-2">
                {[10, 50, 100].map((step) => (
                  <button
                    key={step}
                    onClick={() => send(bid(table, auction.bid + step))}
                    disabled={auction.bid + step > table.cash[me.id]}
                    className="btn-arcade rounded-sm px-3 py-2 text-[0.55rem] disabled:opacity-40"
                  >
                    Bid ${auction.bid + step}
                  </button>
                ))}
                <button
                  onClick={() => send(fold(table))}
                  className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
                >
                  Drop out
                </button>
              </div>
            ) : (
              <p className="blink text-xs text-zinc-500">{name(bidder)} to bid…</p>
            )}
          </div>
        </section>
      )}

      {table && deal && myTurn && !offer && (
        <section className="cab flex w-full flex-col gap-3 rounded-md p-4" aria-label="Trade">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="pixel text-[0.55rem] text-[color:var(--neon-cyan)]">Trade with</h3>
            <select
              value={dealTo}
              onChange={(e) => setDeal({ ...deal, to: e.target.value, get: [], ask: 0 })}
              className="cab rounded-sm px-2 py-1 text-sm"
              aria-label="Trade with"
            >
              {others.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["You give", me.id, "give", "pay"],
                [`${name(dealTo)} gives`, dealTo, "get", "ask"],
              ] as const
            ).map(([title, who, list, money]) => (
              <fieldset key={list} className="flex flex-col gap-2">
                <legend className="mb-1 text-xs text-zinc-400">{title}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {BOARD.map((_, i) => i)
                    .filter((i) => table.owner[i] === who && tradeable(table, i))
                    .map((i) => (
                      <label
                        key={i}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs ${
                          deal[list].includes(i)
                            ? "border-emerald-500 text-zinc-100"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={deal[list].includes(i)}
                          onChange={() => setDeal({ ...deal, [list]: toggle(deal[list], i) })}
                          className="accent-emerald-500"
                        />
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-[1px]"
                          style={{ background: bandOf(i) }}
                        />
                        {BOARD[i].name}
                        {table.mortgaged[i] && " (mortgaged)"}
                      </label>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  Cash $
                  <input
                    type="number"
                    min={0}
                    max={table.cash[who]}
                    step={10}
                    value={deal[money]}
                    onChange={(e) =>
                      setDeal({
                        ...deal,
                        [money]: Math.max(
                          0,
                          Math.min(table.cash[who], Math.floor(+e.target.value || 0))
                        ),
                      })
                    }
                    className="cab w-24 rounded-sm px-2 py-1 text-sm"
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Deeds in a set with buildings on it cannot change hands. Sell the buildings first.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!pitch) return;
                send(propose(table, pitch));
                setDeal(null);
              }}
              disabled={!pitchOk}
              className="btn-arcade rounded-sm px-4 py-2 text-[0.55rem] disabled:opacity-40"
            >
              Send offer
            </button>
            <button
              onClick={() => setDeal(null)}
              className="btn-ghost rounded-sm px-4 py-2 text-[0.55rem]"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {table && trade && trade.from === me.id && (
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          Offer sent to {name(trade.to)}.
          <button
            onClick={() => send(withdraw(table))}
            className="btn-ghost rounded-sm px-3 py-2 text-[0.55rem]"
          >
            Withdraw
          </button>
        </div>
      )}

      {table && trade && trade.to === me.id && (
        <div
          role="dialog"
          aria-label="Trade offer"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="cab flex w-full max-w-md flex-col gap-4 rounded-md p-5">
            <h3 className="pixel text-[0.6rem] text-[color:var(--neon-cyan)]">
              {name(trade.from)} offers a trade
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  ["You get", trade.give, Math.max(0, trade.cash)],
                  ["You give", trade.get, Math.max(0, -trade.cash)],
                ] as const
              ).map(([title, deeds, cash]) => (
                <div key={title} className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">{title}</span>
                  {deeds.map((i) => (
                    <span key={i} className="flex items-center gap-1.5 text-zinc-200">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-[1px]"
                        style={{ background: bandOf(i) }}
                      />
                      {BOARD[i].name}
                      {table.mortgaged[i] && " (mortgaged)"}
                    </span>
                  ))}
                  {cash > 0 && <span className="neon-green">${cash}</span>}
                  {!deeds.length && !cash && <span className="text-zinc-500">nothing</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                autoFocus
                onClick={() => send(answer(table, true))}
                className="btn-arcade rounded-sm px-4 py-2"
              >
                Accept
              </button>
              <button
                onClick={() => send(answer(table, false))}
                className="btn-ghost btn-danger rounded-sm px-4 py-2"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {table && (
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <section className="cab flex flex-col gap-3 rounded-md p-4" aria-label="Deed">
            {space ? (
              space.price ? (
                <>
                  <DeedCard i={selected} g={table} name={name} />
                  {myTurn && table.owner[selected] === me.id && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {canBuild(table, selected) && (
                        <button
                          onClick={() => send(build(table, selected))}
                          className="btn-arcade rounded-sm px-3 py-2 text-[0.5rem]"
                        >
                          Build {(table.houses[selected] ?? 0) === HOTEL - 1 ? "hotel" : "house"} ·
                          ${space.house}
                        </button>
                      )}
                      {canSell(table, selected) && (
                        <button
                          onClick={() => send(sell(table, selected))}
                          className="btn-ghost rounded-sm px-3 py-2 text-[0.5rem]"
                        >
                          Sell building · +${space.house! / 2}
                        </button>
                      )}
                      {canMortgage(table, selected) && (
                        <button
                          onClick={() => send(mortgage(table, selected))}
                          className="btn-ghost rounded-sm px-3 py-2 text-[0.5rem]"
                        >
                          Mortgage · +${mortgageValue(selected)}
                        </button>
                      )}
                      {table.mortgaged[selected] && (
                        <button
                          onClick={() => send(lift(table, selected))}
                          disabled={!canLift(table, selected)}
                          className="btn-ghost rounded-sm px-3 py-2 text-[0.5rem] disabled:opacity-40"
                        >
                          Pay off · ${liftCost(selected)}
                        </button>
                      )}
                    </div>
                  )}
                  {table.owner[selected] && (
                    <p className="text-center text-xs text-zinc-500">
                      Rent right now: ${rentFor(table, selected, table.dice[0] + table.dice[1])}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-zinc-100">{space.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {space.kind === "glitch" || space.kind === "bonus"
                      ? "Draw the top card. It might pay, it might cost, it might move you — or get you out of jail later."
                      : space.tax
                        ? `Pay $${space.tax} to the bank.`
                        : space.kind === "arrest"
                          ? "Straight to jail. No salary."
                          : space.kind === "go"
                            ? "Collect $200 every time you pass."
                            : "Nothing happens here."}
                  </p>
                </>
              )
            ) : (
              <p className="text-sm text-zinc-500">
                Tap a square on the board, or one of your deeds below, to see its title deed.
              </p>
            )}
            {mine.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-zinc-800 pt-3">
                {mine.map((i) => {
                  const built = Math.min(HOTEL, Math.max(0, table.houses[i] ?? 0));
                  return (
                    <button
                      key={i}
                      onClick={() => setPicked(i)}
                      aria-pressed={selected === i}
                      className={`flex w-[4.6rem] flex-col overflow-hidden rounded-sm bg-[#f7f3ff] text-left text-[0.42rem] leading-snug normal-case text-[#120b22] ${
                        table.mortgaged[i] ? "opacity-45" : ""
                      } ${selected === i ? "outline-2 outline-offset-2 outline-emerald-500" : ""}`}
                    >
                      <span className="h-2 w-full" style={{ background: bandOf(i) }} />
                      <span className="px-1 pt-1">{BOARD[i].name}</span>
                      <span className="px-1 pb-1 text-[#17803d]">
                        {table.mortgaged[i]
                          ? "mortgaged"
                          : built === HOTEL
                            ? "hotel"
                            : built
                              ? "⌂".repeat(built)
                              : " "}
                      </span>
                    </button>
                  );
                })}
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
          {auction
            ? "The bidder left the room — drop them out"
            : trade
              ? "They left the room — call the trade off"
              : "Whoever is up left the room — take them out"}
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

const bandOf = (i: number) => {
  const s = BOARD[i];
  return s.group !== undefined ? GROUPS[s.group] : s.kind === "rail" ? "#8b76c9" : "#22d3ee";
};

const RAIL_RENT = [25, 50, 100, 200];

// The printed title deed: colour band, the rent table, and what building and mortgaging cost.
function DeedCard({ i, g, name }: { i: number; g: Game; name: (id?: string) => string }) {
  const s = BOARD[i];
  const owner = g.owner[i];
  const built = g.houses[i] ?? 0;
  const set = owner && s.group !== undefined && !built;
  const rows: [string, string, boolean][] =
    s.kind === "prop"
      ? [
          ["Rent", `$${s.rent![0]}`, !!owner && !built && !set],
          ["With the full set", `$${s.rent![0] * 2}`, !!set],
          ...s
            .rent!.slice(1, HOTEL)
            .map((r, n): [string, string, boolean] => [
              `With ${n + 1} house${n ? "s" : ""}`,
              `$${r}`,
              built === n + 1,
            ]),
          ["With a hotel", `$${s.rent![HOTEL]}`, built === HOTEL],
        ]
      : s.kind === "rail"
        ? RAIL_RENT.map((r, n): [string, string, boolean] => [
            `${n + 1} train line${n ? "s" : ""} owned`,
            `$${r}`,
            false,
          ])
        : [
            ["One utility owned", "4× dice", false],
            ["Both utilities owned", "10× dice", false],
          ];
  return (
    <div className="relative mx-auto w-full max-w-[16rem] rounded-md bg-[#f7f3ff] p-2 text-[#120b22] shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
      <div className="rounded-sm border-2 border-[#120b22] px-3 pb-2 text-center">
        <div
          className="-mx-3 mb-2 border-b-2 border-[#120b22] px-2 py-1.5"
          style={{ background: bandOf(i) }}
        >
          <div className="pixel text-[0.38rem] tracking-widest">Title deed</div>
          <div className="pixel mt-1 text-[0.55rem] leading-relaxed">{s.name}</div>
        </div>
        <table className="w-full text-sm leading-tight">
          <tbody>
            {rows.map(([label, value, now]) => (
              <tr key={label} className={now ? "bg-[#ffc83d]/60" : ""}>
                <td className="py-0.5 text-left">{label}</td>
                <td className="py-0.5 text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 border-t border-[#120b22]/40 pt-1.5 text-xs leading-snug">
          {s.house && (
            <p>
              Houses ${s.house} each · hotel ${s.house} plus four houses
            </p>
          )}
          <p>Mortgage value ${mortgageValue(i)}</p>
          <p className="mt-1 text-[#4a3480]">Owner: {owner ? name(owner) : "the bank"}</p>
        </div>
      </div>
      {g.mortgaged[i] && (
        <span className="pixel absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-sm border-2 border-[#e11d48] bg-[#f7f3ff]/85 px-2 py-1 text-[0.55rem] text-[#e11d48]">
          Mortgaged
        </span>
      )}
    </div>
  );
}
