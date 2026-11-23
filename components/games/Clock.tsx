"use client";

import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

// The turn's time left as a draining bar, ticking through the last five seconds of your own turn.
export default function Clock({
  left,
  total,
  mine,
}: {
  left: number;
  total: number;
  mine: boolean;
}) {
  const secs = Math.ceil(left / 1000);
  const low = secs <= 5;
  useEffect(() => {
    if (mine && secs > 0 && secs <= 5) sfx.move();
  }, [mine, secs]);
  return (
    <span role="timer" aria-label={`${secs} seconds left`} className="flex items-center gap-1.5">
      <span className="h-1.5 w-16 overflow-hidden rounded-sm bg-zinc-800 sm:w-20">
        <span
          className={`block h-full transition-[width] duration-200 ease-linear ${
            low ? "bg-red-500" : "bg-emerald-400"
          }`}
          style={{ width: `${(left / total) * 100}%` }}
        />
      </span>
      <span
        className={`pixel w-7 text-[0.72rem] tabular-nums ${low ? "blink text-red-400" : "text-zinc-300"}`}
      >
        {secs}s
      </span>
    </span>
  );
}
