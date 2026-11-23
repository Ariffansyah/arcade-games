import { supabase } from "@/lib/supabase.ts";

export const dynamic = "force-dynamic";

// Supabase pauses a free project after a week with no database traffic; a cron hitting this keeps it awake.
export async function GET() {
  const { error } = await supabase.from("game_state").select("room_code").limit(1);
  if (error) {
    console.error("ping: database unreachable:", error.message);
    return Response.json({ ok: false }, { status: 503 });
  }
  return Response.json({ ok: true });
}
