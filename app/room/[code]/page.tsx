import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Lobby from "@/components/Lobby";
import { isCode } from "@/lib/room";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params;
  if (!isCode(code)) notFound();
  return <Lobby code={code} />;
}
