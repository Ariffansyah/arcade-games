import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ease } from "./stage";

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

export type Die = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  spin: THREE.Vector3;
  turns: number;
  end: THREE.Quaternion;
  t: number;
  dur: number;
};

export const upright = (value: number, yaw: number) =>
  new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    .multiply(new THREE.Quaternion().setFromEuler(UPRIGHT[value]));

export function createDice(count: number, size = 1) {
  const textures = FACE_VALUES.map(faceTexture);
  const geometry = new RoundedBoxGeometry(size, size, size, 5, size * 0.14);
  const dice: Die[] = Array.from({ length: count }, (_, i) => {
    const mesh = new THREE.Mesh(
      geometry,
      textures.map(
        (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0.05 })
      )
    );
    mesh.castShadow = true;
    mesh.userData.i = i;
    return {
      mesh,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      spin: new THREE.Vector3(0, 1, 0),
      turns: 0,
      end: upright(i + 1, 0),
      t: 1,
      dur: 1,
    };
  });
  return { dice, dispose: () => textures.forEach((t) => t.dispose()) };
}

// Throw from `from`, tumbling, and land at `to` showing `value`. `random` is seeded by the
// caller so every screen sees the same throw.
export function toss(
  d: Die,
  value: number,
  from: THREE.Vector3,
  to: THREE.Vector3,
  random: () => number
) {
  d.from = from;
  d.to = to;
  d.spin = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
  d.turns = Math.PI * (5 + random() * 5);
  d.end = upright(value, (random() - 0.5) * 1.2);
  d.t = 0;
  d.dur = 0.9 + random() * 0.35;
}

export function slide(d: Die, to: THREE.Vector3, end = d.end) {
  d.from = d.mesh.position.clone().setY(to.y);
  d.to = to;
  d.turns = 0;
  d.end = end;
  d.t = 0;
  d.dur = 0.35;
}

export function stepDie(d: Die, dt: number) {
  d.t = Math.min(d.dur, d.t + dt);
  const k = d.t / d.dur;
  const e = ease(k);
  d.mesh.position.lerpVectors(d.from, d.to, e);
  // A few shrinking hops while the die travels, landing flat.
  if (d.turns)
    d.mesh.position.y = d.to.y + (1 - k) ** 2 * 3.2 * Math.abs(Math.cos(k * Math.PI * 2.5));
  const wind = new THREE.Quaternion().setFromAxisAngle(d.spin, (1 - e) * d.turns);
  d.mesh.quaternion.copy(d.end).premultiply(wind);
}
