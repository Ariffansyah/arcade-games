"use client";

import { useEffect, useRef, useState } from "react";

// Each screen times a turn from the moment it saw it start, so device clocks that disagree don't
// matter. `turn` is anything that changes when the turn does — the table itself works. `onExpire`
// runs once, `grace` ms after the clock shows zero, so the player's own screen can go first and
// everyone else only steps in for someone who has wandered off.
export function useTurnClock(turn: unknown, ms: number, onExpire: (() => void) | null, grace = 0) {
  const [clock, setClock] = useState({ turn, left: ms });
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const end = Date.now() + ms;
    const id = setInterval(() => {
      const left = end - Date.now();
      setClock({ turn, left: Math.max(0, left) });
      if (left > -grace) return;
      clearInterval(id);
      expire.current?.();
    }, 200);
    return () => clearInterval(id);
  }, [turn, ms, grace]);

  return clock.turn === turn ? clock.left : ms;
}
