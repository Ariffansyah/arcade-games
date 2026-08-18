"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GAMES, seatLabel } from "@/lib/games";
import { cleanName, saveName, storedName } from "@/lib/players";

const roomCode = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  // Prefilled from the last visit; the markup the server sent has it empty.
  const [nick, setNick] = useState(storedName);

  const remember = () => saveName(cleanName(nick));

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    remember();
    if (/^\d{4}$/.test(code)) router.push(`/room/${code}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-10 overflow-hidden px-4 py-10 text-zinc-100">
      <div className="grid-floor pointer-events-none absolute inset-x-0 bottom-0 h-2/3" />
      {/* Cabinet spill light, so the sign looks lit rather than pasted on. */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(57,255,136,0.18),transparent)] blur-2xl" />

      <header className="relative flex flex-col items-center gap-3 pt-6 text-center">
        <span className="neon-cyan pixel text-[0.6rem] tracking-[0.35em]">
          {GAMES.length} cabinets · 2 to a roomful
        </span>
        <h1 className="marquee hum text-3xl sm:text-5xl">Web Arcade</h1>
        <p className="max-w-md text-zinc-400">
          Twelve mini-games behind one 4-digit code. No accounts, no installs — send the code and
          whoever shows up is playing.
        </p>
      </header>

      <form onSubmit={join} className="relative flex flex-col items-center gap-5">
        <div className="cab flex flex-col items-center gap-3 rounded-md px-8 py-6">
          <label htmlFor="nick" className="text-[0.6rem] text-zinc-400">
            Your nickname
          </label>
          <input
            id="nick"
            value={nick}
            suppressHydrationWarning
            onChange={(e) => setNick(cleanName(e.target.value))}
            placeholder="pick a name"
            maxLength={16}
            className="w-52 bg-transparent text-center font-sans text-lg text-zinc-100 outline-none placeholder:text-zinc-700"
          />
          <span className="h-px w-40 bg-zinc-800" />

          <label htmlFor="code" className="mt-2 text-[0.6rem] text-zinc-400">
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
            className="neon-green w-52 bg-transparent py-2 text-center text-3xl tracking-[0.35em] outline-none placeholder:text-zinc-700"
          />
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 w-10 rounded-sm transition-colors ${
                  code.length > i
                    ? "bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)]"
                    : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
          {/* Coin slot — pure cabinet furniture. */}
          <span className="mt-1 h-1.5 w-16 rounded-full bg-zinc-950 shadow-[inset_0_1px_2px_#000]" />
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
            onClick={() => {
              remember();
              router.push(`/room/${roomCode()}`);
            }}
            className="btn-ghost rounded-sm px-5 py-3"
          >
            New room
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600">
          Leave the nickname blank and you get a random one. Joining an empty code opens a fresh
          room. Anyone typing the same four digits lands beside you.
        </p>
      </form>

      <section className="relative grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {GAMES.map((g) => (
          <article key={g.id} className="cab flex items-start gap-4 rounded-md px-4 py-4">
            <span className="text-2xl text-emerald-500 drop-shadow-[0_0_10px_var(--color-emerald-500)]">
              {g.art}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <h2 className="pixel text-[0.65rem] text-zinc-100">{g.name}</h2>
              <p className="font-sans text-sm text-zinc-400">{g.blurb}</p>
              <span className="pixel text-[0.5rem] text-zinc-600">{seatLabel(g)}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Attract mode: one strip of text, doubled so the loop never shows a seam. */}
      <div className="ticker relative w-full max-w-3xl overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max gap-10 whitespace-nowrap pixel text-[0.55rem] text-zinc-600">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex gap-10">
              {GAMES.map((g) => (
                <span key={g.id}>
                  {g.art} {g.name} — {seatLabel(g)}
                </span>
              ))}
              <span className="neon-cyan">insert coin</span>
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
