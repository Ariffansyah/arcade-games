import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { settings, subscribe } from "@/lib/settings";

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

const RATIO = { low: 1, medium: 1.5, high: 2 };
const FOV = 38;
const WIDEST = 1.25;
const ratio = () => Math.min(window.devicePixelRatio, RATIO[settings().quality]);
const glowing = () => settings().bloom && settings().quality !== "low";

// A night sky behind the floor: deep purple fading to black, with a scatter of stars.
function sky() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d")!;
  const fade = g.createLinearGradient(0, 0, 0, 512);
  fade.addColorStop(0, "#05020c");
  fade.addColorStop(0.55, "#1a0b33");
  fade.addColorStop(1, "#2a0f45");
  g.fillStyle = fade;
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.6})`;
    const r = Math.random() < 0.08 ? 1.6 : 0.8;
    g.fillRect(Math.random() * 1024, Math.random() * 330, r, r);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// One lit, shadowed, orbitable arcade floor that every 3D cabinet builds on. Quality, glow and
// camera speed come from the player's settings.
export function createStage(host: HTMLElement, { frame, tap, hover }: Hooks): Stage {
  const quality = settings().quality;
  const renderer = new THREE.WebGLRenderer({ antialias: quality !== "low" });
  renderer.setPixelRatio(ratio());
  renderer.shadowMap.enabled = quality !== "low";
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = sky();
  scene.fog = new THREE.Fog(0x0b0618, 40, 90);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.rotateSpeed = settings().orbit;

  scene.add(new THREE.HemisphereLight(0xd6ccff, 0x120b22, 1.4));
  const sun = new THREE.DirectionalLight(0xfff4e8, 2.4);
  sun.position.set(10, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(quality === "high" ? 2048 : 1024);
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

  // The glow pass renders off-screen, which skips the canvas's own smoothing; multisample there.
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: quality === "high" ? 4 : 0,
    })
  );
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Scenes are framed for a wide screen. On a tall one, widen the view instead of cropping the
    // sides, so a phone held upright still sees the whole board.
    const wide = Math.tan(((FOV / 2) * Math.PI) / 180) * WIDEST;
    camera.fov =
      camera.aspect >= WIDEST
        ? FOV
        : Math.min(80, (2 * Math.atan(wide / camera.aspect) * 180) / Math.PI);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const unsubscribe = subscribe(() => {
    renderer.setPixelRatio(ratio());
    controls.rotateSpeed = settings().orbit;
    resize();
  });

  let then = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - then) / 1000, 0.05);
    then = now;
    frame(dt, now / 1000);
    controls.update();
    if (glowing()) composer.render(dt);
    else renderer.render(scene, camera);
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
      unsubscribe();
      composer.dispose();
      (scene.background as THREE.Texture).dispose();
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
