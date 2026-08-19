import assert from "node:assert/strict";
import test from "node:test";
import { allow, callerKey, rateLimit, resetLimits } from "./ratelimit.ts";

test("requests pass up to the limit, then get refused", () => {
  resetLimits();
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("a", 3, 60_000).ok, true);
  const refused = rateLimit("a", 3, 60_000);
  assert.equal(refused.ok, false);
  assert.ok(refused.retryAfter > 0);
});

test("callers are counted separately", () => {
  resetLimits();
  assert.equal(rateLimit("a", 1, 60_000).ok, true);
  assert.equal(rateLimit("b", 1, 60_000).ok, true);
  assert.equal(rateLimit("a", 1, 60_000).ok, false);
});

test("the window expires", async () => {
  resetLimits();
  assert.equal(rateLimit("a", 1, 5).ok, true);
  assert.equal(rateLimit("a", 1, 5).ok, false);
  await new Promise((done) => setTimeout(done, 10));
  assert.equal(rateLimit("a", 1, 5).ok, true);
});

test("the caller key takes the first forwarded address", () => {
  const request = new Request("http://x/", {
    headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" },
  });
  assert.equal(callerKey(request, "draw"), "draw:9.9.9.9");
  assert.equal(callerKey(new Request("http://x/"), "draw"), "draw:unknown");
});

test("without a shared store, the in-memory counter still applies", async () => {
  resetLimits();
  const check = { key: "solo", limit: 2, windowMs: 60_000 };
  assert.equal((await allow([check])).ok, true);
  assert.equal((await allow([check])).ok, true);
  assert.equal((await allow([check])).ok, false);
});

test("every check has to pass, and a refusal stops the rest", async () => {
  resetLimits();
  const caller = { key: "caller", limit: 1, windowMs: 60_000 };
  const budget = { key: "budget", limit: 10, windowMs: 60_000 };
  assert.equal((await allow([caller, budget])).ok, true);

  assert.equal((await allow([caller, budget])).ok, false);
  assert.equal((await allow([budget])).ok, true);
  assert.equal((await allow([{ ...budget, limit: 2 }])).ok, false);
});

test("the caller key trusts the platform's header over the client's", () => {
  const key = (headers: Record<string, string>) =>
    callerKey(new Request("https://arcade.test/api/doodle", { headers }), "doodle");

  assert.equal(key({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }), "doodle:1.1.1.1");
  assert.equal(key({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" }), "doodle:2.2.2.2");
  assert.equal(key({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }), "doodle:3.3.3.3");
  assert.equal(key({}), "doodle:unknown");
});
