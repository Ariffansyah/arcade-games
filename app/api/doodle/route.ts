import { WORDS, extractPaths } from "@/lib/doodle.ts";

const SYSTEM = `You draw simple pictograms as SVG line art on a 400x300 canvas.

Reply with nothing but <path d="..."/> elements — between 8 and 20 of them, in
drawing order: outline first, details after. Stroke-only line art.

Never include: fills, text, letters, numbers, labels, any other SVG element,
markdown fences, or commentary. Never write the name of the subject anywhere.`;

// Groq retires model ids regularly, so ask what exists instead of hardcoding one.
// Set GROQ_MODEL to pin a specific id and skip the lookup.
let cached = "";

async function pickModel(key: string): Promise<string> {
  // Ignore placeholders like GROQ_MODEL=<id> left in .env.local.
  const pinned = process.env.GROQ_MODEL?.trim();
  if (pinned && !/[<>]/.test(pinned)) return pinned;
  if (cached) return cached;

  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`model list returned ${response.status}`);

  const ids: string[] = ((await response.json()).data ?? [])
    .map((model: { id: string }) => model.id)
    .filter((id: string) => !/whisper|tts|guard|embed|safety|prompt/i.test(id));

  // Bigger instruct models draw better; fall back to whatever is there.
  const preferred = ["kimi", "maverick", "qwen", "70b", "llama-4", "llama-3.3"];
  cached = preferred.map((p) => ids.find((id) => id.includes(p))).find(Boolean) ?? ids[0];
  if (!cached) throw new Error("no usable chat models on this account");

  console.log("groq model:", cached);
  return cached;
}

export async function POST() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  if (!process.env.GROQ_API_KEY)
    return Response.json({ error: "GROQ_API_KEY is not set." }, { status: 500 });

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
          temperature: 0.9, // the same word twice shouldn't draw the same picture
          // Counts against the per-minute token allowance whether or not it is
          // used, so keep it just above what 20 paths actually need.
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Draw: ${word}` },
          ],
          ...extra,
        }),
      });

    // A reasoning model will happily spend the whole budget thinking and never
    // reach the drawing. Ask for no reasoning; if the model has no such knob,
    // give it room to think instead.
    let response = await call({ reasoning_effort: "none" }, 2500);
    if (response.status === 400) {
      console.warn("groq rejected reasoning_effort, retrying with a thinking budget");
      response = await call({}, 6000);
    }

    if (response.status === 429) {
      const detail = await response.text();
      const wait = Math.min(20, Number(detail.match(/try again in ([\d.]+)s/)?.[1] ?? 5));
      console.warn(`groq rate limited, waiting ${wait}s`);
      await new Promise((done) => setTimeout(done, wait * 1000));
      response = await call({ reasoning_effort: "none" }, 2500);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error("groq", response.status, detail);
      return Response.json(
        { error: `Groq ${response.status}: ${detail.slice(0, 300)}` },
        { status: 502 }
      );
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
    return Response.json({ error: `Could not reach Groq: ${e}` }, { status: 502 });
  }
}
