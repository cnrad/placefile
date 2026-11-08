import { expect, test } from "bun:test";
import { State } from "./state";
import { config, maxMarks } from "./config";



test("rolling capacity with 10-step fade, gone at 210", () => {
  const s = new State();
  for (let i = 0; i < 300; i++) s.toggle(i % 94, Math.floor(i / 94), i);
  expect(s.marks.length).toBe(maxMarks);
  expect(s.total).toBe(300);
  // newest 200 fully opaque
  expect(s.opacityAt(s.marks.length - 1)).toBe(1);
  expect(s.opacityAt(s.marks.length - config.capacity)).toBe(1);
  // 201st newest is 90%, oldest kept (209th) is 10%
  expect(s.opacityAt(s.marks.length - config.capacity - 1)).toBeCloseTo(0.9);
  expect(s.opacityAt(0)).toBeCloseTo(0.1);
  expect(s.marks[0]!.at).toBe(300 - maxMarks);
});

test("clicking a lit cell turns it off", () => {
  const s = new State();
  expect(s.toggle(5, 5, 1)).not.toBeNull();
  s.toggle(6, 6, 2);
  expect(s.toggle(5, 5, 3)).toBeNull();
  expect(s.marks).toEqual([{ col: 6, row: 6, at: 2 }]);
  expect(s.total).toBe(2);
});

test("cooldown blocks any shared key within the window", () => {
  const s = new State();
  s.recordTap(["ip:1", "ck:a"], 1000);
  expect(s.onCooldown(["ip:1"], 3000, 5000)).toBe(true);
  expect(s.onCooldown(["ck:a", "ip:2"], 3000, 5000)).toBe(true);
  expect(s.onCooldown(["ip:2"], 3000, 5000)).toBe(false);
  expect(s.onCooldown(["ip:1"], 6001, 5000)).toBe(false);
});

test("snapshot round-trips", () => {
  const s = new State();
  s.toggle(1, 2, 4);
  s.recordTap(["ip:x"], 4);
  const t = new State();
  t.restore(JSON.parse(JSON.stringify(s.snapshot())));
  expect(t.marks).toEqual(s.marks);
  expect(t.total).toBe(1);
  expect(t.lastTap.get("ip:x")).toBe(4);
});

test("restore drops marks outside the grid", () => {
  const s = new State();
  s.restore({ marks: [{ col: 300, row: 100, at: 1 }, { col: 3, row: 3, at: 2 }], total: 2, lastTap: [] });
  expect(s.marks).toEqual([{ col: 3, row: 3, at: 2 }]);
});

test("tap coordinates map through the centered offset", async () => {
  const { parseTap } = await import("./app");
  const { offsetX, cols } = await import("./config");
  expect(parseTap(new URL(`http://x/tap?${offsetX},0`))).toEqual({ col: 0, row: 0 });
  expect(parseTap(new URL(`http://x/tap?${offsetX + 12 * 3 + 5},25`))).toEqual({ col: 3, row: 2 });
  expect(parseTap(new URL(`http://x/tap?845,0`))).toEqual({ col: cols - 1, row: 0 });
  expect(parseTap(new URL(`http://x/tap?0,0`))).toEqual({ col: 0, row: 0 });
  expect(parseTap(new URL(`http://x/tap?10,200`))).toBeNull();
});

test("github username validation", async () => {
  const { githubUsername } = await import("./config");
  for (const ok of ["cnrad", "a", "octo-cat", "A1-b2", "x".repeat(39)]) expect(githubUsername.test(ok)).toBe(true);
  for (const bad of ["-cnrad", "cnrad-", "octo--cat", "x".repeat(40), "a.b", "a_b", ""]) expect(githubUsername.test(bad)).toBe(false);
});
