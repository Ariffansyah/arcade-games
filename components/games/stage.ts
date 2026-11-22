import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type Stage = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  canvas: HTMLCanvasElement;
  pick: (
    e: { clientX: number; clientY: number },
    targets: THREE.Object3D[]
  ) => THREE.Intersection | undefined;
  dispose: () => void;
};

type Hooks = {
  frame: (dt: number, time: number) => void;
  tap?: (e: PointerEvent) => void;
  hover?: (e: PointerEvent) => void;
};

// One lit, shadowed, orbitable arcade floor that every 3D cabinet builds on.
export function createStage(host: HTMLElement, { frame, tap, hover }: Hooks): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x06030d, 40, 90);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.48;

  scene.add(new THREE.HemisphereLight(0xd6ccff, 0x120b22, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4e8, 2.4);
  sun.position.set(10, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 24,
    bottom: -8,
    near: 1,
    far: 70,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const magenta = new THREE.PointLight(0xff2d95, 120, 40);
  magenta.position.set(-12, 8, -8);
  const cyan = new THREE.PointLight(0x22d3ee, 120, 40);
  cyan.position.set(12, 6, -10);
  scene.add(magenta, cyan);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x0b0618, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const grid = new THREE.GridHelper(200, 100, 0xff2d95, 0x22d3ee);
  const gridMaterial = grid.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.22;
  grid.position.y = 0.01;
  scene.add(floor, grid);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let then = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - then) / 1000, 0.05);
    then = now;
    frame(dt, now / 1000);
    controls.update();
    renderer.render(scene, camera);
  });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick: Stage["pick"] = (e, targets) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(targets, false)[0];
  };

  // A tap is a press that did not turn into an orbit drag.
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) tap?.(e);
    down = null;
  };
  const onMove = (e: PointerEvent) => hover?.(e);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointermove", onMove);

  return {
    scene,
    camera,
    controls,
    canvas,
    pick,
    dispose: () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          for (const m of [o.material].flat()) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        }
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

export const has3D = () => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
};

export const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
