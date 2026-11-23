"use client";

import { useSyncExternalStore } from "react";

export type Quality = "low" | "medium" | "high";

export type Settings = {
  sfx: number;
  music: number;
  quality: Quality;
  bloom: boolean;
  crt: boolean;
  motion: boolean;
  fullscreen: boolean;
  orbit: number;
};

export const DEFAULTS: Settings = {
  sfx: 0.7,
  music: 0.35,
  quality: "high",
  bloom: true,
  crt: true,
  motion: true,
  fullscreen: true,
  orbit: 1,
};

const KEY = "arcade:settings";
const QUALITIES: Quality[] = ["low", "medium", "high"];
const unit = (v: unknown, fallback: number, min = 0, max = 1) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

// Whatever is in storage was written by an older build or by hand; keep only what makes sense.
function clean(raw: Partial<Record<keyof Settings, unknown>>, base: Settings): Settings {
  return {
    sfx: unit(raw.sfx, base.sfx),
    music: unit(raw.music, base.music),
    quality: QUALITIES.includes(raw.quality as Quality) ? (raw.quality as Quality) : base.quality,
    bloom: typeof raw.bloom === "boolean" ? raw.bloom : base.bloom,
    crt: typeof raw.crt === "boolean" ? raw.crt : base.crt,
    motion: typeof raw.motion === "boolean" ? raw.motion : base.motion,
    fullscreen: typeof raw.fullscreen === "boolean" ? raw.fullscreen : base.fullscreen,
    orbit: unit(raw.orbit, base.orbit, 0.3, 2),
  };
}

let current = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function apply(s: Settings) {
  const root = document.documentElement;
  root.dataset.crt = s.crt ? "on" : "off";
  root.dataset.motion = s.motion ? "on" : "off";
}

export function settings(): Settings {
  if (loaded || typeof window === "undefined") return current;
  loaded = true;
  // Phones and tablets start on medium; a big GPU can turn it up.
  const base = matchMedia("(pointer: coarse)").matches
    ? { ...DEFAULTS, quality: "medium" as const }
    : DEFAULTS;
  try {
    current = clean(JSON.parse(localStorage.getItem(KEY) ?? "{}"), base);
  } catch {
    current = base;
  }
  apply(current);
  return current;
}

export function update(patch: Partial<Settings>) {
  current = clean({ ...settings(), ...patch }, settings());
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  apply(current);
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useSettings = () => useSyncExternalStore(subscribe, settings, () => DEFAULTS);
