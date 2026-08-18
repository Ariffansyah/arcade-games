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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-4 text-zinc-100">
      <h1 className="text-4xl font-bold tracking-tight">Web Arcade</h1>
      <form onSubmit={join} className="flex flex-col items-center gap-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoFocus
          aria-label="4-digit room code"
          placeholder="0000"
          className="w-48 rounded-lg bg-zinc-900 py-3 pl-4 text-center text-3xl tracking-[0.4em] outline-none ring-1 ring-zinc-700 focus:ring-emerald-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={code.length !== 4}
            className="rounded-lg bg-emerald-600 px-5 py-2 font-medium disabled:opacity-40"
          >
            Join room
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(`/room/${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`)
            }
            className="rounded-lg px-5 py-2 font-medium ring-1 ring-zinc-700"
          >
            Random
          </button>
        </div>
      </form>
      <p className="text-sm text-zinc-500">Share the code with one friend. 2 players per room.</p>
    </main>
  );
}
