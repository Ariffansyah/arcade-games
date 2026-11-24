"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  cleanName,
  local,
  saveName,
  session,
  storedName,
  withGuests,
  type Player,
  type Presence,
} from "./players";

export type { Player };

export type GameProps = {
  code: string;

  slot: 0 | 1 | 2;
  players: Player[];
  me: Player;
  name: (id?: string) => string;
  // Turn-based games report who the table waits on, so a shared screen can hand itself to them;
  // "" once nobody is up.
  follow: (id: string) => void;
};

export type RoomState = {
  players: Player[];

  connected: boolean;
  me: Player;

  game: string | null;

  setGame: (game: string | null) => void;

  rename: (name: string) => void;

  name: (id?: string) => string;

  guests: Player[];
  addGuest: (name: string) => void;
  dropGuest: (id: string) => void;
};

const randomName = () => `Player-${Math.random().toString(36).slice(2, 6)}`;

export function useRoom(code: string, name?: string): RoomState {
  const [me, setMe] = useState<Player>(() => {
    const saved = typeof window === "undefined" ? null : local.get<Player>(`arcade:me:${code}`);
    return {
      id: saved?.id ?? crypto.randomUUID(),
      name: cleanName(name ?? "") || storedName() || saved?.name || randomName(),
      joinedAt: saved?.joinedAt ?? Date.now(),
    };
  });

  const [guests, setGuests] = useState<Player[]>(() =>
    typeof window === "undefined" ? [] : (local.get<Player[]>(`arcade:guests:${code}`) ?? [])
  );
  const presence = useRef<Presence>({ ...me, guests });
  const channel = useRef<RealtimeChannel | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGameState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : session.get<string>(`arcade:game:${code}`)
  );
  const [connected, setConnected] = useState(false);
  // Everyone ever seen in this room, so a player whose phone drops off for a moment, or who has
  // left, keeps their name on the table instead of turning into "someone".
  const [known, setKnown] = useState<Record<string, string>>(() =>
    typeof window === "undefined" ? {} : (session.get(`arcade:names:${code}`) ?? {})
  );
  const gameRef = useRef(game);

  useEffect(() => {
    gameRef.current = game;
    session.set(`arcade:game:${code}`, game);
  }, [code, game]);

  useEffect(() => local.set(`arcade:me:${code}`, me), [code, me]);

  useEffect(() => {
    presence.current = { ...me, guests };
    local.set(`arcade:guests:${code}`, guests);
    const ch = channel.current;
    if (ch?.state === "joined") ch.track(presence.current);
  }, [code, me, guests]);

  useEffect(() => {
    const ch = supabase.channel(`room:${code}`, {
      config: { presence: { key: me.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const list = withGuests(
        Object.values(ch.presenceState<Presence>())
          .map((entries) => entries[0])
          .filter(Boolean)
      );
      setPlayers(list);
      setKnown((names) => {
        const next = { ...names, ...Object.fromEntries(list.map((p) => [p.id, p.name])) };
        session.set(`arcade:names:${code}`, next);
        return next;
      });
    })
      .on("broadcast", { event: "game" }, ({ payload }) => setGameState(payload.game))
      // Whoever just arrived or reloaded asks which cabinet the room is on. Only someone who knows
      // answers: another newcomer saying "none" would pull the whole room back to the menu.
      .on("broadcast", { event: "which" }, () => {
        if (gameRef.current)
          ch.send({ type: "broadcast", event: "game", payload: { game: gameRef.current } });
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          ch.track(presence.current);
          ch.send({ type: "broadcast", event: "which", payload: {} });
        }

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

  const addGuest = (next: string) =>
    setGuests((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        name: cleanName(next) || `Player ${players.length + 1}`,
        joinedAt: Date.now(),
      },
    ]);
  const dropGuest = (id: string) => setGuests((list) => list.filter((g) => g.id !== id));

  const nameOf = (id?: string) =>
    players.find((p) => p.id === id)?.name ?? known[id ?? ""] ?? "someone";

  return {
    players,
    connected,
    me,
    game,
    setGame,
    rename,
    name: nameOf,
    guests,
    addGuest,
    dropGuest,
  };
}
