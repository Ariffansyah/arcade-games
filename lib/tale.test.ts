import assert from "node:assert/strict";
import test from "node:test";
import { LINES_EACH, lineCount, usable, wordFor, writerFor } from "./tale.ts";

test("every screen gets the same word for a line", () => {
  assert.equal(wordFor("room", 4), wordFor("room", 4));
});

test("the story is long enough for everyone to write their share", () => {
  assert.equal(lineCount(3), 3 * LINES_EACH);
  assert.equal(lineCount(1), 2 * LINES_EACH);
});

test("turns go round the room", () => {
  const order = ["a", "b"];
  assert.equal(writerFor(order, 0), "a");
  assert.equal(writerFor(order, 1), "b");
  assert.equal(writerFor(order, 2), "a");
  assert.equal(writerFor([], 0), "");
});

test("a line needs the word and some substance", () => {
  assert.equal(usable("The Goose had other plans entirely.", "goose"), true);
  assert.equal(usable("goose", "goose"), false);
  assert.equal(usable("Nothing happened at all that evening.", "goose"), false);
});
