"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function HelpLink() {
  const here = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;

      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? "")) return;
      window.open("/how-to-play", "_blank", "noopener");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (here === "/how-to-play") return null;

  return (
    <a
      href="/how-to-play"
      target="_blank"
      rel="noreferrer"
      title="How to play — every cabinet, every rule (?)"
      aria-label="How to play"
      className="btn-ghost fixed right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-sm text-sm opacity-60 hover:opacity-100"
    >
      ?
    </a>
  );
}
