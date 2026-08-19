import { assignRound } from "@/lib/imposter.ts";
import { allow, callerKey, tooMany } from "@/lib/ratelimit.ts";

const SECRET =
  process.env.IMPOSTER_SECRET ??
  (process.env.NODE_ENV === "production" ? "" : "arcade-imposter-dev");

const ROLES_PER_MINUTE = 60;

const MAX_PLAYERS = 24;

const MAX_BODY = 8 * 1024;

const bad = (why: string) => Response.json({ error: why }, { status: 400 });

export async function POST(request: Request) {
  const verdict = await allow([
    { key: callerKey(request, "imposter"), limit: ROLES_PER_MINUTE, windowMs: 60_000 },
  ]);
  if (!verdict.ok) return tooMany(verdict.retryAfter);

  if (!SECRET) {
    console.error("IMPOSTER_SECRET is not set; refusing to deal roles from a public default");
    return Response.json({ error: "The dealer is off duty." }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return bad("Body too large.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad round.");
  }

  const { code, round, ids, playerId, reveal } = (body ?? {}) as Record<string, unknown>;

  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) return bad("Bad room.");
  if (!Number.isInteger(round) || (round as number) < 1 || (round as number) > 10_000)
    return bad("Bad round.");
  if (
    !Array.isArray(ids) ||
    ids.length < 3 ||
    ids.length > MAX_PLAYERS ||
    !ids.every((id) => typeof id === "string" && id.length > 0 && id.length <= 64) ||
    new Set(ids).size !== ids.length
  )
    return bad("Bad round.");

  if (typeof playerId !== "string" || !ids.includes(playerId)) return bad("Not in this round.");

  const { word, imposterId } = assignRound(SECRET, code, round as number, ids as string[]);
  if (reveal === true) return Response.json({ word, imposterId });

  return playerId === imposterId
    ? Response.json({ imposter: true })
    : Response.json({ imposter: false, word });
}
