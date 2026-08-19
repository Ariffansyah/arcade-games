"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function useBroadcast<T>(topic: string, event: string, onMessage: (payload: T) => void) {
  const handler = useRef(onMessage);
  const channel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    handler.current = onMessage;
  });

  useEffect(() => {
    const ch = supabase
      .channel(topic)
      .on("broadcast", { event }, ({ payload }) => handler.current(payload as T))
      .subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [topic, event]);

  return useCallback(
    (payload: T) => {
      channel.current?.send({ type: "broadcast", event, payload });
    },
    [event]
  );
}
