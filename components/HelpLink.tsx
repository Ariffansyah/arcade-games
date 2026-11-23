"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { settings } from "@/lib/settings";

export default function HelpLink() {
  const here = usePathname();

  // Mounted on every page, so the CRT and animation switches hold everywhere.
  useEffect(() => void settings(), []);

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

  // Rooms carry their own rules: in the game select and in every game's menu.
  if (here === "/how-to-play" || here.startsWith("/room/")) return null;

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
