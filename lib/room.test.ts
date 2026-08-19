import assert from "node:assert/strict";
import test from "node:test";
import { CODE_LENGTH, cleanCode, isCode, newCode } from "./room.ts";

test("new codes are the right shape and not all the same", () => {
  const codes = new Set(Array.from({ length: 200 }, newCode));
  for (const code of codes) {
    assert.equal(code.length, CODE_LENGTH);
    assert.ok(isCode(code), `${code} should route`);
  }
  assert.ok(codes.size > 190, "codes should not collide");
});

test("only six-character codes route", () => {
  assert.equal(isCode("0420"), false);
  assert.equal(isCode("042"), false);
  assert.equal(isCode("ABCDEF"), false);
  assert.equal(isCode("../etc/passwd"), false);
});

test("typing is forgiving about case and junk", () => {
  assert.equal(cleanCode("  ac3-df7!! "), "AC3DF7");
  assert.equal(cleanCode("acdefghjk"), "ACDEFG");

  assert.equal(cleanCode("0420"), "4");
});
