import assert from "node:assert/strict";
import test from "node:test";
import { GAMES } from "./games.ts";
import { HOWTO } from "./howto.ts";

test("every cabinet on the menu has rules on the how-to page", () => {
  for (const g of GAMES) {
    const guide = HOWTO[g.id];
    assert.ok(guide, `no guide for ${g.id}`);
    assert.ok(guide.goal.length > 20, g.id);
    assert.ok(guide.round.length >= 3, g.id);
    assert.ok(guide.scoring.length > 20, g.id);
    assert.ok(guide.tips.length >= 2, g.id);
  }
});

test("the how-to page has no rules for cabinets that do not exist", () => {
  const ids = new Set(GAMES.map((g) => g.id));
  for (const id of Object.keys(HOWTO)) assert.ok(ids.has(id), `${id} is not on the menu`);
});
