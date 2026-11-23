"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { session } from "./players";

type Stamped<T> = { v: number; by: string; table: T };

const isNewer = (next: { v: number; by: string }, held: { v: number; by: string } | null) =>
  !held || next.v > held.v || (next.v === held.v && next.by > held.by);

// For turn-based tables: whoever moves applies it on their own screen and broadcasts the
// result, so nobody waits on a host relay or a database write. Two writes racing on the
// same version settle on the higher player id everywhere, so screens never drift apart.
export function useTable<T>(topic: string, me: string) {
  // A reload picks the table back up from this tab, then asks the room for anything newer.
  const [saved] = useState(() => session.get<Stamped<T>>(`arcade:table:${topic}`));
  const [table, setTable] = useState<T | null>(saved?.table ?? null);
  const held = useRef<Stamped<T> | null>(saved);
  const channel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel(topic)
      .on("broadcast", { event: "table" }, ({ payload }) => {
        if (!isNewer(payload, held.current)) return;
        held.current = payload;
        session.set(`arcade:table:${topic}`, payload);
        setTable(payload.table);
      })
      // Someone who arrives mid-game asks the room for the table instead of sitting blank.
      .on("broadcast", { event: "hello" }, () => {
        if (held.current) ch.send({ type: "broadcast", event: "table", payload: held.current });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ch.send({ type: "broadcast", event: "hello", payload: {} });
      });
    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [topic]);

  const send = useCallback(
    (next: T) => {
      const stamped = { v: (held.current?.v ?? 0) + 1, by: me, table: next };
      held.current = stamped;
      session.set(`arcade:table:${topic}`, stamped);
      setTable(next);
      channel.current?.send({
        type: "broadcast",
        event: "table",
        payload: stamped,
      });
    },
    [me, topic]
  );

  return [table, send] as const;
}
