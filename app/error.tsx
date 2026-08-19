"use client";

import Link from "next/link";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center text-zinc-100">
      <p className="blink pixel text-[0.6rem] text-red-400">! Game over !</p>
      <h1 className="marquee text-lg sm:text-xl">The cabinet tripped</h1>

      <p className="max-w-lg text-zinc-400">{error.message || "Something broke. Try again."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-arcade rounded-sm px-5 py-3">
          Continue?
        </button>
        <Link href="/" className="btn-ghost rounded-sm px-5 py-3">
          Back to the arcade
        </Link>
      </div>
    </main>
  );
}
