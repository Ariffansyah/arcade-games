"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { cleanName, saveName, sortPlayers, storedName, type Player } from "./players";

export type { Player };

/** Props every mini-game receives from the lobby. */
export type GameProps = {
  code: string;
  /** Two-player games only: 1, 2, or 0 for a spectator. Party games use `players`. */
  slot: 0 | 1 | 2;
  players: Player[];
  me: Player;
};

export type RoomState = {
  players: Player[]; // sorted by join time: [0] is P1, [1] is P2
  me: Player;
  /** 1 = Player 1, 2 = Player 2, 0 = room full / spectator */
  slot: 0 | 1 | 2;
  game: string | null;
  /** Picks a game (or returns to the menu) for both players. */
  setGame: (game: string | null) => void;
  /** Changes your nickname and remembers it for next time. */
  rename: (name: string) => void;
};

const randomName = () => `Player-${Math.random().toString(36).slice(2, 6)}`;

export function useRoom(code: string, name?: string): RoomState {
  // The id and join time are minted once; only the nickname can change. Nothing
  // rendered on the server depends on it, so reading storage here is safe.
  const [me, setMe] = useState<Player>(() => ({
    id: crypto.randomUUID(),
    name: cleanName(name ?? "") || storedName() || randomName(),
    joinedAt: Date.now(),
  }));

  const channel = useRef<RealtimeChannel | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGameState] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`room:${code}`, {
      config: { presence: { key: me.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const list = Object.values(ch.presenceState<Player>())
        .map((entries) => entries[0])
        .filter(Boolean);
      setPlayers(sortPlayers(list));
    })
      .on("broadcast", { event: "game" }, ({ payload }) => setGameState(payload.game))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track(me);
      });

    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [code, me]);

  // Re-subscribing on a rename is what re-tracks presence under the new name.
  const rename = (next: string) => {
    const clean = cleanName(next);
    if (!clean || clean === me.name) return;
    saveName(clean);
    setMe((current) => ({ ...current, name: clean }));
  };

  const setGame = (next: string | null) => {
    setGameState(next);
    channel.current?.send({ type: "broadcast", event: "game", payload: { game: next } });
  };

  const index = players.findIndex((p) => p.id === me.id);
  const slot = index === 0 ? 1 : index === 1 ? 2 : 0;

  return { players, me, slot, game, setGame, rename };
}
