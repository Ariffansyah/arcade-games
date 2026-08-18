import { assignRound } from "@/lib/imposter.ts";

// Roles must not be derivable from the client bundle, so the seed stays here.
// ponytail: a determined player can still POST `reveal` before the vote closes.
// Closing that needs server-held round state — add it if anyone actually cheats.
const SECRET = process.env.IMPOSTER_SECRET ?? "arcade-imposter";

export async function POST(request: Request) {
  const { code, round, ids, playerId, reveal } = await request.json();

  if (typeof code !== "string" || !Number.isInteger(round) || !Array.isArray(ids) || ids.length < 3)
    return Response.json({ error: "Bad round." }, { status: 400 });

  const { word, imposterId } = assignRound(SECRET, code, round, ids);
  if (reveal) return Response.json({ word, imposterId });

  // The imposter is told nothing but that they are the imposter.
  return playerId === imposterId
    ? Response.json({ imposter: true })
    : Response.json({ imposter: false, word });
}
