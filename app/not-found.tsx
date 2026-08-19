import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center text-zinc-100">
      <p className="blink pixel text-[0.6rem] text-red-400">! No such cabinet !</p>
      <h1 className="marquee text-xl sm:text-2xl">404</h1>
      <p className="max-w-md text-zinc-400">
        That room code does not lead anywhere. Codes are six characters — check the link you were
        sent, or start a room of your own.
      </p>
      <Link href="/" className="btn-arcade rounded-sm px-5 py-3">
        Back to the arcade
      </Link>
    </main>
  );
}
