"use client";

export default function RoomError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center text-zinc-100">
      <p className="blink pixel text-[0.6rem] text-red-400">! Game over !</p>
      <h1 className="marquee text-lg sm:text-xl">This room could not start</h1>
      <p className="max-w-lg text-zinc-400">{error.message || "Something broke on the way in."}</p>
      <button onClick={reset} className="btn-arcade rounded-sm px-5 py-3">
        Continue?
      </button>
    </main>
  );
}
