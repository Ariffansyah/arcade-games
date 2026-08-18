import assert from "node:assert/strict";
import test from "node:test";
import { WORDS, extractPaths, isCorrect } from "./doodle.ts";

test("keeps real path data", () => {
  const reply = `Here you go:
    <path d="M10,10 L90,10 L50,80 Z" stroke="#fff"/>
    <path d="M 20 20 C 30 5, 60 5, 70 20 q -5 10 -20 12"/>`;
  assert.deepEqual(extractPaths(reply), [
    "M10,10 L90,10 L50,80 Z",
    "M 20 20 C 30 5, 60 5, 70 20 q -5 10 -20 12",
  ]);
});

test("drops anything that is not path geometry", () => {
  const hostile = `
    <script>alert(1)</script>
    <path d="M0,0 L1,1" onload="steal()"/>
    <image d="javascript:alert(1)"/>
    <path d="M0,0 L1,1 <script>"/>
    <path d="url(#x)"/>
    <path d=""/>`;
  // Only the genuine geometry survives; the sibling attributes are discarded.
  assert.deepEqual(extractPaths(hostile), ["M0,0 L1,1"]);
});

test("respects the path cap", () => {
  const many = Array(80).fill('<path d="M0,0 L1,1"/>').join("");
  assert.equal(extractPaths(many, 12).length, 12);
});

test("guessing is forgiving about case, punctuation and plurals", () => {
  assert.ok(isCorrect("  Rockets! ", "rocket"));
  assert.ok(isCorrect("palm-tree", "palm tree"));
  assert.ok(!isCorrect("rocketship", "rocket"));
  assert.equal(new Set(WORDS).size, WORDS.length); // no duplicate answers
});

test("ignores geometry drafted inside a think block", () => {
  const closed = `<think>maybe <path d="M0,0 L9,9"/> no</think><path d="M1,1 L2,2"/>`;
  assert.deepEqual(extractPaths(closed), ["M1,1 L2,2"]);

  // Truncated reasoning: nothing after it, so nothing is a real drawing.
  const cut = `<think>drafting <path d="M0,0 L9,9"/> and then the tokens ran`;
  assert.deepEqual(extractPaths(cut), []);
});
