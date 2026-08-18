import assert from "node:assert/strict";
import test from "node:test";
import { PROMPT_COUNT, sheet, tally, usable } from "./scatter.ts";

test("a sheet is five different prompts and one letter, same for everyone", () => {
  const one = sheet("room", 1);
  assert.deepEqual(sheet("room", 1), one);
  assert.equal(one.prompts.length, PROMPT_COUNT);
  assert.equal(new Set(one.prompts).size, PROMPT_COUNT);
  assert.notDeepEqual(sheet("room", 2).prompts, one.prompts);
});

test("an answer needs the right letter and some length", () => {
  assert.equal(usable("Badger", "b"), true);
  assert.equal(usable("b", "b"), false);
  assert.equal(usable("otter", "b"), false);
});

test("matching answers cancel, unique ones score", () => {
  const scores = tally(
    { a: ["badger", "Brazil"], b: ["Badger!", "belgium"], c: ["bear", "cheese"] },
    "b"
  );
  assert.equal(scores.a, 1); // badger matched, Brazil is unique
  assert.equal(scores.b, 1); // badger matched, belgium is unique
  assert.equal(scores.c, 1); // bear is unique, cheese is the wrong letter
});

test("the same word in a different slot does not cancel", () => {
  const scores = tally({ a: ["bat", ""], b: ["", "bat"] }, "b");
  assert.deepEqual(scores, { a: 1, b: 1 });
});
