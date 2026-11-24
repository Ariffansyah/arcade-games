"use client";

import { useState } from "react";
import type { Player } from "@/lib/players";
import { sfx } from "@/lib/sfx";

// Everyone playing on this device, named before the game starts. The first is you; the rest take
// their turns on this screen.
export default function Roster({
  players,
  onRename,
  onAdd,
  onDrop,
}: {
  players: Player[];
  onRename: (id: string, name: string) => void;
  onAdd: (name: string) => void;
  onDrop: (id: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex w-full max-w-sm flex-col gap-2 text-left">
      <span className="pixel text-[0.72rem] text-zinc-400">Players on this device</span>
      <ol className="flex flex-col gap-1.5">
        {players.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="pixel w-7 shrink-0 text-[0.72rem] text-zinc-500">P{i + 1}</span>
            <input
              key={p.name}
              defaultValue={p.name}
              maxLength={16}
              aria-label={`Player ${i + 1} name`}
              onBlur={(e) => onRename(p.id, e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="cab min-w-0 flex-1 rounded-sm px-2 py-1.5 font-sans text-base"
            />
            {i ? (
              <button
                onClick={() => {
                  sfx.back();
                  onDrop(p.id);
                }}
                aria-label={`Remove ${p.name}`}
                className="btn-ghost w-9 shrink-0 rounded-sm py-1.5 text-base leading-none"
              >
                ×
              </button>
            ) : (
              <span className="w-9 shrink-0 text-center text-xs text-zinc-500">you</span>
            )}
          </li>
        ))}
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sfx.select();
          onAdd(name.trim() || `Player ${players.length + 1}`);
          setName("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder={`Player ${players.length + 1}`}
          aria-label="New player's name"
          className="cab min-w-0 flex-1 rounded-sm px-2 py-1.5 font-sans text-base"
        />
        <button className="btn-ghost shrink-0 rounded-sm px-3 py-1.5 text-[0.88rem]">
          + Add player
        </button>
      </form>
    </div>
  );
}
