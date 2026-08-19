import assert from "node:assert/strict";
import test from "node:test";
import { groups, perfect, prompt, promptIndex, together } from "./samepage.ts";

test("a round's prompt is the same everywhere and never repeats back to back", () => {
  assert.equal(prompt("room", 3), prompt("room", 3));
  const first = promptIndex("room", 1);
  assert.notEqual(promptIndex("room", 2, first), first);
});

test("same answer groups together however it was typed", () => {
  const found = groups({ a: "Cheese", b: " cheese! ", c: "olives" });
  assert.deepEqual(found[0], ["a", "b"]);
  assert.equal(together({ a: "Cheese", b: "cheese", c: "olives" }), 2);
});

test("blank answers count for nobody", () => {
  assert.deepEqual(groups({ a: "", b: "  " }), []);
  assert.equal(together({ a: "", b: "" }), 0);
});

test("perfect needs the whole room on one answer", () => {
  assert.equal(perfect({ a: "cat", b: "cat" }, 2), true);
  assert.equal(perfect({ a: "cat", b: "dog" }, 2), false);
  assert.equal(perfect({ a: "cat", b: "cat" }, 3), false);
});
