"use client";

// A word swept across the table for a moment, for what everyone should catch: a new street, a
// skip, the dealer busting. A new `id` plays it again; `at` is how far down its table it runs.
export default function Banner({
  id,
  text,
  colour = "#39ff88",
  delay = 0,
  at = "50%",
}: {
  id: string;
  text: string;
  colour?: string;
  delay?: number;
  at?: string;
}) {
  return (
    <div
      key={id}
      aria-hidden
      className="table-banner pointer-events-none absolute inset-x-0 z-[15] -translate-y-1/2"
      style={{ top: at, "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <span
        className="pixel block border-y-2 bg-[#06030d]/85 px-4 py-2.5 text-center text-[clamp(0.9rem,3.6vmin,1.5rem)] leading-snug uppercase"
        style={{ borderColor: colour, color: colour, textShadow: `0 0 14px ${colour}` }}
      >
        {text}
      </span>
    </div>
  );
}
