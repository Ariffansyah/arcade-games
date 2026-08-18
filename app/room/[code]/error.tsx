"use client";

export default function RoomError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
      <h1 className="text-xl font-bold">This room could not start</h1>
      <p className="max-w-lg text-sm text-zinc-400">{error.message || "Something broke on the way in."}</p>
      <button onClick={reset} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium">
        Try again
      </button>
    </main>
  );
}
