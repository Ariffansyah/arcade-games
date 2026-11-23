"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createStage, has3D } from "@/components/games/stage";
import { createDice } from "@/components/games/dice";

const CARD_COLOURS = ["#ff2e63", "#ffc83d", "#39ff88", "#22d3ee"];

function cardTexture(colour: string, face: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#f7f3ff";
  g.beginPath();
  g.roundRect(0, 0, 256, 384, 26);
  g.fill();
  g.fillStyle = colour;
  g.beginPath();
  g.roundRect(14, 14, 228, 356, 16);
  g.fill();
  g.save();
  g.translate(128, 192);
  g.rotate(0.5);
  g.fillStyle = "#f7f3ff";
  g.beginPath();
  g.ellipse(0, 0, 84, 150, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.font = "italic 900 150px Arial Black, Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 12;
  g.strokeStyle = "#06030d";
  g.strokeText(face, 128, 200);
  g.fillStyle = colour;
  g.fillText(face, 128, 200);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type Float = { obj: THREE.Object3D; base: THREE.Vector3; spin: THREE.Vector3; phase: number };

// The title screen's backdrop: a neon pedestal with a block tower on it and pieces from the
// cabinets drifting round it while the camera circles.
export default function MenuScene({ className = "" }: { className?: string }) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mount.current;
    if (!host || !has3D()) return;
    const floats: Float[] = [];
    const { dice, dispose: disposeDice } = createDice(3, 0.9);

    const stage = createStage(host, {
      frame: (_, time) => {
        for (const f of floats) {
          f.obj.position.copy(f.base);
          f.obj.position.y += Math.sin(time * 0.9 + f.phase) * 0.35;
          f.obj.rotation.x += f.spin.x * 0.004;
          f.obj.rotation.y += f.spin.y * 0.004;
          f.obj.rotation.z += f.spin.z * 0.004;
        }
      },
    });
    const { scene, camera, controls } = stage;
    camera.position.set(0, 7, 19);
    controls.target.set(0, 3.2, 0);
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.6, 0.7, 48),
      new THREE.MeshStandardMaterial({ color: 0x1d1236, metalness: 0.5, roughness: 0.35 })
    );
    pedestal.position.y = 0.35;
    pedestal.receiveShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.42, 0.06, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0xff2d95 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.72;
    scene.add(pedestal, ring);

    const wood = new THREE.MeshStandardMaterial({ color: 0xd8a467, roughness: 0.6 });
    const block = new RoundedBoxGeometry(1.8, 0.36, 0.58, 2, 0.04);
    for (let level = 0; level < 11; level++)
      for (let slot = 0; slot < 3; slot++) {
        if ((level === 4 && slot === 1) || (level === 7 && slot === 0)) continue;
        const mesh = new THREE.Mesh(block, wood);
        const off = (slot - 1) * 0.6;
        mesh.position.set(level % 2 ? off : 0, 0.88 + level * 0.36, level % 2 ? 0 : off);
        mesh.rotation.y = level % 2 ? Math.PI / 2 : 0;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }

    const drift = (obj: THREE.Object3D, x: number, y: number, z: number, spin: number[]) => {
      scene.add(obj);
      floats.push({
        obj,
        base: new THREE.Vector3(x, y, z),
        spin: new THREE.Vector3(...spin),
        phase: floats.length * 1.7,
      });
    };

    ["7", "+2", "4", "9"].forEach((face, i) => {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.1),
        new THREE.MeshStandardMaterial({
          map: cardTexture(CARD_COLOURS[i], face),
          side: THREE.DoubleSide,
          roughness: 0.4,
        })
      );
      const a = (i / 4) * Math.PI * 2 + 0.4;
      card.rotation.set(-0.3, a, 0.2);
      drift(card, Math.cos(a) * 6, 4 + (i % 2) * 1.6, Math.sin(a) * 6, [0, 1.2, 0]);
    });

    dice.forEach((d, i) => {
      const a = (i / 3) * Math.PI * 2 + 1.2;
      drift(d.mesh, Math.cos(a) * 4.6, 2.2 + i * 0.8, Math.sin(a) * 4.6, [1.4, 0.8, 0.6]);
    });

    const disc = new THREE.CylinderGeometry(0.55, 0.55, 0.18, 32);
    [0xff2e63, 0xffc83d, 0xff2e63].forEach((c, i) => {
      const mesh = new THREE.Mesh(
        disc,
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: c, emissiveIntensity: 0.15 })
      );
      mesh.rotation.x = Math.PI / 2;
      const a = (i / 3) * Math.PI * 2 + 2.3;
      drift(mesh, Math.cos(a) * 7.5, 1.6 + i, Math.sin(a) * 7.5, [0.4, 1.5, 0]);
    });

    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x39ff88, roughness: 0.4 })
    );
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
    );
    roof.position.y = 0.45;
    roof.rotation.y = Math.PI / 4;
    house.add(walls, roof);
    drift(house, -5.5, 5.5, 2.5, [0, 1, 0]);

    const hotel = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.55, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xff2e63, roughness: 0.4 })
    );
    drift(hotel, 5, 6.2, -3, [0.3, 1, 0]);

    const pawn = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.45, 0],
          [0.45, 0.1],
          [0.28, 0.2],
          [0.16, 0.65],
          [0.3, 0.72],
          [0.08, 0.82],
          [0.22, 0.95],
          [0.22, 1.15],
          [0, 1.25],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        32
      ),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.25,
        metalness: 0.3,
        roughness: 0.3,
      })
    );
    drift(pawn, -3, 3, -6, [0, 0.8, 0.2]);

    return () => {
      disposeDice();
      stage.dispose();
    };
  }, []);

  return <div ref={mount} aria-hidden className={`pointer-events-none ${className}`} />;
}
