import assert from "node:assert/strict";
import test from "node:test";
import {
  H,
  LEVELS,
  canPull,
  collapse,
  fallen,
  height,
  levelOf,
  newTower,
  nextSlot,
  onTop,
  place,
  restPose,
  type Pose,
} from "./topple.ts";

const at = (level: number, slot: number) => level * 3 + slot;

// Moves one block, as if it had been pulled and set down there.
const moveTo = (poses: Pose[], id: number, to: Pose) => poses.map((p, i) => (i === id ? to : p));

test("a fresh tower is fifteen levels of three, alternating direction", () => {
  const t = newTower(["a", "b"]);
  assert.equal(t.poses.length, LEVELS * 3);
  assert.equal(height(t.poses), LEVELS);
  assert.equal(levelOf(t.poses[at(4, 2)]), 4);
  assert.deepEqual(t.poses[at(0, 0)].slice(0, 3), [0, H / 2, -1]);
  assert.deepEqual(t.poses[at(1, 0)].slice(0, 3), [-1, H / 2 + H, 0]);
});

test("the top level and the one under an unfinished top are off limits", () => {
  const t = newTower(["a", "b"]);
  assert.ok(!canPull(t, at(LEVELS - 1, 1)));
  assert.ok(canPull(t, at(LEVELS - 2, 1)));
  const started = { ...t, poses: moveTo(t.poses, at(3, 1), restPose(LEVELS, 0)) };
  assert.equal(height(started.poses), LEVELS + 1);
  assert.ok(!canPull(started, at(LEVELS - 1, 0)));
  assert.ok(canPull(started, at(LEVELS - 2, 0)));
});

test("a block let go over the top lands in the free spot nearest the hand", () => {
  const t = newTower(["a", "b"]);
  const id = at(2, 1);
  const first = nextSlot(t.poses, id, 0.9, 0);
  assert.deepEqual(first, restPose(LEVELS, 2), "a full top starts a new level, turned");
  const poses = moveTo(t.poses, id, first);
  const second = nextSlot(poses, at(4, 1), 0.9, 0);
  assert.deepEqual(second, restPose(LEVELS, 1), "the taken spot is skipped");
  assert.ok(onTop(poses, id));
  assert.ok(!onTop(t.poses, at(2, 1)));
});

test("the tower is down when anything but the block in hand drops", () => {
  const start = newTower(["a", "b"]).poses;
  const dropped = moveTo(start, at(9, 0), [4, H / 2, 4, 0, 0, 0, 1]);
  assert.ok(fallen(start, dropped, -1));
  assert.ok(!fallen(start, dropped, at(9, 0)), "the one being moved does not count");
  const nudged = moveTo(start, at(9, 0), [0.2, start[at(9, 0)][1] - 0.05, -1, 0, 0, 0, 1]);
  assert.ok(!fallen(start, nudged, -1));
});

test("placing passes the turn; a collapse marks whoever was pulling", () => {
  const t = newTower(["a", "b"]);
  const poses = moveTo(t.poses, at(2, 1), restPose(LEVELS, 0));
  const next = place(t, poses, at(2, 1));
  assert.equal(next.order[next.turn], "b");
  assert.equal(next.pulls, 1);
  assert.equal(next.moved, at(2, 1));
  const down = collapse(next, poses);
  assert.equal(down.loser, "b");
  assert.equal(down.falls.b, 1);
  assert.equal(place(down, poses, 0), down);
});
