import { admin } from "./supabaseAdmin.ts";

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

function sweep(now: number) {
  if (windows.size < 5000) return;
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
}

export type Verdict = { ok: boolean; retryAfter: number };
export type Check = { key: string; limit: number; windowMs: number };

export function rateLimit(key: string, limit: number, windowMs: number): Verdict {
  const now = Date.now();
  sweep(now);
  const window = windows.get(key);

  if (!window || window.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  window.count += 1;
  return {
    ok: window.count <= limit,
    retryAfter: Math.ceil((window.resetAt - now) / 1000),
  };
}

export async function allow(checks: Check[]): Promise<Verdict> {
  const store = admin();
  for (const check of checks) {
    const verdict = store
      ? await takeShared(store, check)
      : rateLimit(check.key, check.limit, check.windowMs);
    if (!verdict.ok) return verdict;
  }
  return { ok: true, retryAfter: 0 };
}

async function takeShared(
  store: NonNullable<ReturnType<typeof admin>>,
  { key, limit, windowMs }: Check
): Promise<Verdict> {
  const { data, error } = await store.rpc("take_token", {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    console.error("rate limit store unavailable, counting in memory:", error?.message);
    return rateLimit(key, limit, windowMs);
  }
  return { ok: Boolean(row.allowed), retryAfter: Number(row.retry_after) || 0 };
}

export function callerKey(request: Request, route: string) {
  const headers = request.headers;
  const ip =
    headers.get("x-vercel-forwarded-for")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `${route}:${ip}`;
}

export const tooMany = (retryAfter: number) =>
  Response.json(
    { error: "Slow down — too many requests. Try again shortly." },
    { status: 429, headers: { "retry-after": String(Math.max(1, retryAfter)) } }
  );

export const resetLimits = () => windows.clear();
