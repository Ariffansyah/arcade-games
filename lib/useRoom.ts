"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { cleanName, saveName, sortPlayers, storedName, type Player } from "./players";

export type { Player };

export type GameProps = {
  code: string;

  slot: 0 | 1 | 2;
  players: Player[];
  me: Player;
};

export type RoomState = {
  players: Player[];

  connected: boolean;
  me: Player;

  slot: 0 | 1 | 2;
  game: string | null;

  setGame: (game: string | null) => void;

  rename: (name: string) => void;
};

const randomName = () => `Player-${Math.random().toString(36).slice(2, 6)}`;

export function useRoom(code: string, name?: string): RoomState {
  const [me, setMe] = useState<Player>(() => ({
    id: crypto.randomUUID(),
    name: cleanName(name ?? "") || storedName() || randomName(),
    joinedAt: Date.now(),
  }));

  const channel = useRef<RealtimeChannel | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGameState] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

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
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") ch.track(me);

        if (status === "CLOSED" || status === "CHANNEL_ERROR") setPlayers([]);
      });

    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [code, me]);

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

  return { players, connected, me, slot, game, setGame, rename };
}
