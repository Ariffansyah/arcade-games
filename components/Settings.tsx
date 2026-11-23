"use client";

import { useEffect, useState } from "react";
import { DEFAULTS, update, useSettings, type Quality } from "@/lib/settings";
import { cleanName, saveName, storedName } from "@/lib/players";
import { music, sfx } from "@/lib/sfx";

type Tab = "audio" | "graphics" | "display" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "audio", label: "Audio" },
  { id: "graphics", label: "Graphics" },
  { id: "display", label: "Display" },
  { id: "profile", label: "Profile" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-800/80 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col">
        <span className="pixel text-[0.55rem] text-zinc-200">{label}</span>
        {hint && <span className="text-sm text-zinc-500">{hint}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  return (
    <>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={(max - min) / 20}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="range-arcade w-44"
        style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <output className="neon-green w-12 text-right">{format(value)}</output>
    </>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        onChange(!on);
        sfx.move();
      }}
      className={`flex h-8 w-16 items-center rounded-sm border-2 px-1 transition-colors ${
        on ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-700 bg-zinc-950"
      }`}
    >
      <span
        className={`h-5 w-6 rounded-[2px] transition-transform ${
          on ? "translate-x-7 bg-emerald-400 shadow-[0_0_10px_var(--color-emerald-500)]" : "bg-zinc-600"
        }`}
      />
    </button>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => {
            onChange(o.id);
            sfx.move();
          }}
          className={`btn-ghost rounded-sm px-3 py-2 text-[0.5rem] ${
            value === o.id ? "border-emerald-500 text-emerald-400" : ""
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// The settings screen: tabs down the side, live changes, Esc or the back button to leave.
export default function SettingsPanel({
  onClose,
  onRename,
  start = "audio",
}: {
  onClose: () => void;
  onRename?: (name: string) => void;
  start?: Tab;
}) {
  const s = useSettings();
  const [tab, setTab] = useState<Tab>(start);
  const [name, setName] = useState(storedName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      sfx.back();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const saveNick = () => {
    const clean = cleanName(name);
    if (!clean) return;
    saveName(clean);
    onRename?.(clean);
    sfx.select();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#06030d]/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="menu-in cab flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-md sm:flex-row">
        <nav
          role="tablist"
          aria-orientation="vertical"
          className="flex shrink-0 gap-1 overflow-x-auto border-b-2 border-zinc-800 p-3 sm:w-48 sm:flex-col sm:border-r-2 sm:border-b-0"
        >
          <h2 className="pixel neon-magenta hidden px-2 pt-1 pb-4 text-[0.7rem] sm:block">Settings</h2>
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                sfx.move();
              }}
              className={`menu-item rounded-sm px-3 py-2.5 text-left text-[0.55rem] whitespace-nowrap ${
                tab === t.id ? "menu-item-on" : "text-zinc-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col">
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            {tab === "audio" && (
              <>
                <Row label="Sound effects" hint="Menu clicks, cards, dice">
                  <Slider
                    label="Sound effects volume"
                    value={s.sfx}
                    onChange={(sfxVolume) => {
                      update({ sfx: sfxVolume });
                      sfx.move();
                    }}
                  />
                </Row>
                <Row label="Music" hint="The menu soundtrack">
                  <Slider label="Music volume" value={s.music} onChange={(m) => update({ music: m })} />
                </Row>
                <Row label="Test" hint="Play a sound at the current volume">
                  <button
                    onClick={() => {
                      sfx.start();
                      music.start();
                    }}
                    className="btn-ghost rounded-sm px-3 py-2 text-[0.5rem]"
                  >
                    Play
                  </button>
                </Row>
              </>
            )}
            {tab === "graphics" && (
              <>
                <Row label="Quality" hint="Resolution, shadows and smoothing. Shadows and smoothing apply when a 3D game loads.">
                  <Choice<Quality>
                    label="Quality"
                    value={s.quality}
                    onChange={(quality) => update({ quality })}
                    options={[
                      { id: "low", label: "Low" },
                      { id: "medium", label: "Med" },
                      { id: "high", label: "High" },
                    ]}
                  />
                </Row>
                <Row label="Glow" hint="Bloom on lights and neon in 3D games. Off on low quality.">
                  <Toggle label="Glow" on={s.bloom} onChange={(bloom) => update({ bloom })} />
                </Row>
                <Row label="Camera speed" hint="How fast dragging turns the 3D camera">
                  <Slider
                    label="Camera speed"
                    value={s.orbit}
                    min={0.3}
                    max={2}
                    format={(v) => `${v.toFixed(1)}×`}
                    onChange={(orbit) => update({ orbit })}
                  />
                </Row>
              </>
            )}
            {tab === "display" && (
              <>
                <Row label="CRT screen" hint="Scanlines and flicker over everything">
                  <Toggle label="CRT screen" on={s.crt} onChange={(crt) => update({ crt })} />
                </Row>
                <Row label="Animations" hint="Card flights, menu slides, blinking text">
                  <Toggle label="Animations" on={s.motion} onChange={(motion) => update({ motion })} />
                </Row>
                <Row label="Fullscreen games" hint="Fill the whole screen when a game starts">
                  <Toggle
                    label="Fullscreen games"
                    on={s.fullscreen}
                    onChange={(fullscreen) => update({ fullscreen })}
                  />
                </Row>
              </>
            )}
            {tab === "profile" && (
              <Row label="Nickname" hint="What everyone in the room sees">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveNick();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={name}
                    onChange={(e) => setName(cleanName(e.target.value))}
                    maxLength={16}
                    aria-label="Nickname"
                    className="cab w-40 rounded-sm px-2 py-1.5 font-sans text-base outline-none focus:border-emerald-500"
                  />
                  <button type="submit" className="btn-arcade rounded-sm px-3 py-2 text-[0.5rem]">
                    Save
                  </button>
                </form>
              </Row>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t-2 border-zinc-800 px-5 py-3">
            <button
              onClick={() => {
                update(DEFAULTS);
                sfx.back();
              }}
              className="btn-ghost btn-danger rounded-sm px-3 py-2 text-[0.5rem]"
            >
              Reset
            </button>
            <span className="hidden text-sm text-zinc-500 sm:inline">Saved on this device</span>
            <button
              autoFocus
              onClick={() => {
                sfx.back();
                onClose();
              }}
              className="btn-arcade rounded-sm px-4 py-2 text-[0.55rem]"
            >
              Back <kbd className="opacity-60">Esc</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
