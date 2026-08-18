import { notFound } from "next/navigation";
import Lobby from "@/components/Lobby";

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params;
  if (!/^\d{4}$/.test(code)) notFound();
  return <Lobby code={code} />;
}
