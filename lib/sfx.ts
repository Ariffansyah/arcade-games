"use client";

import { settings, subscribe } from "./settings";

// Every sound is synthesised on the spot, so there is nothing to download.
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  { type = "square" as OscillatorType, vol = 0.2, slide = 0, delay = 0 } = {}
) {
  const level = settings().sfx * vol;
  const a = audio();
  if (!a || level <= 0) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, { vol = 0.15, delay = 0, from = 4000, to = 800 } = {}) {
  const level = settings().sfx * vol;
  const a = audio();
  if (!a || level <= 0) return;
  const t = a.currentTime + delay;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = a.createGain();
  gain.gain.setValueAtTime(level, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(a.destination);
  src.start(t);
}

let lastDice = 0;

export const sfx = {
  move: () => tone(740, 0.05, { vol: 0.08 }),
  select: () => {
    tone(880, 0.07, { vol: 0.12 });
    tone(1320, 0.1, { vol: 0.1, delay: 0.06 });
  },
  back: () => tone(520, 0.12, { type: "triangle", vol: 0.16, slide: -260 }),
  start: () =>
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { vol: 0.12, delay: i * 0.07 })),
  error: () => tone(150, 0.2, { type: "sawtooth", vol: 0.1 }),
  card: () => noise(0.12, { vol: 0.2, from: 6000, to: 1500 }),
  dice: () => {
    // Every die in a throw asks for the sound; one rattle covers them all.
    if (performance.now() - lastDice < 200) return;
    lastDice = performance.now();
    [0, 0.06, 0.13, 0.22, 0.34].forEach((d) =>
      noise(0.04, { vol: 0.25, delay: d, from: 2500, to: 1200 })
    );
  },
  clack: () => noise(0.06, { vol: 0.3, from: 1800, to: 900 }),
  crash: () => {
    noise(0.9, { vol: 0.35, from: 1200, to: 100 });
    [0.1, 0.25, 0.4, 0.6].forEach((d) => noise(0.08, { vol: 0.25, delay: d, from: 1600, to: 600 }));
  },
  win: () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      tone(f, 0.18, { type: "triangle", vol: 0.16, delay: i * 0.1 })
    ),
};

// A short chiptune loop for the menus: bass, chords picked out as arpeggios, and a hat.
const BPM = 112;
const STEP = 60 / BPM / 4;
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);

let timer: ReturnType<typeof setInterval> | null = null;
let musicGain: GainNode | null = null;
let next = 0;
let step = 0;

function voice(a: AudioContext, freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(musicGain!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function schedule() {
  const a = ctx;
  if (!a || !musicGain) return;
  // A background tab throttles the timer; skip ahead rather than play the backlog at once.
  if (next < a.currentTime - 0.2) next = a.currentTime;
  while (next < a.currentTime + 0.15) {
    const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
    const beat = step % 16;
    if (beat % 4 === 0) voice(a, hz(chord[0] - 12), next, STEP * 3, "triangle", 0.5);
    voice(a, hz(chord[beat % 3] + 12), next, STEP * 0.9, "square", 0.07);
    if (beat % 2 === 1) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = "square";
      osc.frequency.value = 9000 + Math.random() * 2000;
      gain.gain.setValueAtTime(0.02, next);
      gain.gain.exponentialRampToValueAtTime(0.0001, next + 0.03);
      osc.connect(gain).connect(musicGain);
      osc.start(next);
      osc.stop(next + 0.04);
    }
    next += STEP;
    step++;
  }
}

export const music = {
  start() {
    const a = audio();
    if (!a || timer) return;
    // Browsers keep audio locked until the first click or key press on the page.
    if (a.state === "suspended") {
      const wake = () => void a.resume();
      window.addEventListener("pointerdown", wake, { once: true });
      window.addEventListener("keydown", wake, { once: true });
    }
    musicGain = a.createGain();
    musicGain.gain.value = settings().music * 0.5;
    musicGain.connect(a.destination);
    next = a.currentTime + 0.05;
    timer = setInterval(schedule, 50);
  },
  stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    const gain = musicGain;
    if (gain && ctx) {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      setTimeout(() => gain.disconnect(), 800);
    }
    musicGain = null;
  },
};

if (typeof window !== "undefined")
  subscribe(() => {
    if (musicGain) musicGain.gain.value = settings().music * 0.5;
  });
