import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set both in the host's build environment and rebuild — adding them to a " +
      "running deployment is not enough."
  );
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 40 } },
});
