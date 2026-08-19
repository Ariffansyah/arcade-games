import { WORDS, extractPaths } from "@/lib/doodle.ts";
import { allow, callerKey, tooMany } from "@/lib/ratelimit.ts";

const DRAWINGS_PER_MINUTE = 12;

const DRAWINGS_PER_DAY = Number(process.env.DOODLE_DAILY_CAP) || 400;

const UPSTREAM_TIMEOUT_MS = 30_000;

const SYSTEM = `You draw simple pictograms as SVG line art on a 400x300 canvas.

Reply with nothing but <path d="..."/> elements — between 8 and 20 of them, in
drawing order: outline first, details after. Stroke-only line art.

Never include: fills, text, letters, numbers, labels, any other SVG element,
markdown fences, or commentary. Never write the name of the subject anywhere.`;

let cached = "";

async function pickModel(key: string): Promise<string> {
  const pinned = process.env.GROQ_MODEL?.trim();
  if (pinned && !/[<>]/.test(pinned)) return pinned;
  if (cached) return cached;

  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`model list returned ${response.status}`);

  const ids: string[] = ((await response.json()).data ?? [])
    .map((model: { id: string }) => model.id)
    .filter((id: string) => !/whisper|tts|guard|embed|safety|prompt/i.test(id));

  const preferred = ["kimi", "maverick", "qwen", "70b", "llama-4", "llama-3.3"];
  cached = preferred.map((p) => ids.find((id) => id.includes(p))).find(Boolean) ?? ids[0];
  if (!cached) throw new Error("no usable chat models on this account");

  console.log("groq model:", cached);
  return cached;
}

export async function POST(request: Request) {
  const verdict = await allow([
    { key: callerKey(request, "doodle"), limit: DRAWINGS_PER_MINUTE, windowMs: 60_000 },
    { key: "doodle:everyone", limit: DRAWINGS_PER_DAY, windowMs: 24 * 60 * 60_000 },
  ]);
  if (!verdict.ok) return tooMany(verdict.retryAfter);

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set");

    return Response.json({ error: "The artist is off duty." }, { status: 503 });
  }

  try {
    const model = await pickModel(process.env.GROQ_API_KEY);
    const call = (extra: Record<string, unknown>, maxTokens: number) =>
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.9,

          max_tokens: maxTokens,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Draw: ${word}` },
          ],
          ...extra,
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

    let response = await call({ reasoning_effort: "none" }, 2500);
    if (response.status === 400) {
      console.warn("groq rejected reasoning_effort, retrying with a thinking budget");
      response = await call({}, 6000);
    }

    if (response.status === 429) {
      const detail = await response.text();
      const wait = Math.min(30, Number(detail.match(/try again in ([\d.]+)s/)?.[1] ?? 5));
      console.warn(`groq rate limited, asking the client to wait ${wait}s`);
      return tooMany(Math.ceil(wait));
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error("groq", response.status, detail);

      return Response.json({ error: "The artist put the pen down. Try again." }, { status: 502 });
    }

    const body = await response.json();
    const paths = extractPaths(body.choices?.[0]?.message?.content ?? "");

    if (paths.length < 3) {
      console.error("groq returned no usable paths:", body.choices?.[0]?.message?.content);
      return Response.json({ error: "The artist drew nothing usable." }, { status: 502 });
    }
    return Response.json({ word, paths });
  } catch (e) {
    console.error("groq request failed", e);
    return Response.json({ error: "Could not reach the artist. Try again." }, { status: 502 });
  }
}
