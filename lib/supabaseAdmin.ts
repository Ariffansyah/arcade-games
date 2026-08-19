import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function admin(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;

  if (!client)
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY is not set — rate limits are per instance, which on Vercel " +
        "means barely a limit at all."
    );
  return client;
}

export const resetAdmin = () => {
  client = undefined;
};
