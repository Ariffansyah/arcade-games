"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{4}$/.test(code)) router.push(`/room/${code}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4 py-10 text-zinc-100">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />

      <div className="relative flex flex-col items-center gap-3 text-center">
        <span className="neon-cyan pixel text-[0.6rem] tracking-[0.35em]">2 player co-op</span>
        <h1 className="marquee text-2xl sm:text-4xl">Web Arcade</h1>
        <p className="text-zinc-400">Three cabinets. One room code. Bring a friend.</p>
      </div>

      <form onSubmit={join} className="relative flex flex-col items-center gap-5">
        <div className="cab flex flex-col items-center gap-3 rounded-md px-6 py-5">
          <label htmlFor="code" className="text-[0.6rem] text-zinc-400">
            Insert room code
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoFocus
            aria-label="4-digit room code"
            placeholder="0000"
            className="neon-green w-52 bg-transparent py-2 text-center text-2xl tracking-[0.35em] outline-none placeholder:text-zinc-700"
          />
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 w-10 rounded-sm ${
                  code.length > i ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="submit"
            disabled={code.length !== 4}
            className="btn-arcade rounded-sm px-5 py-3 disabled:opacity-40"
          >
            Join room
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/room/${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`)
            }
            className="btn-ghost rounded-sm px-5 py-3"
          >
            Random
          </button>
        </div>
      </form>

      <p className="blink relative text-[0.65rem] text-zinc-400 pixel">
        Share the code — 2 players per room
      </p>
    </main>
  );
}
