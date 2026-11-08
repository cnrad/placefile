import { expect, test } from "bun:test";
import { State } from "./state";
import { config, maxMarks } from "./config";



test("rolling capacity with 10-step fade, gone at 210", () => {
  const s = new State();
  for (let i = 0; i < 300; i++) s.place(i % 94, Math.floor(i / 94), i);
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

test("re-marking a cell moves it to newest", () => {
  const s = new State();
  s.place(5, 5, 1);
  s.place(6, 6, 2);
  s.place(5, 5, 3);
  expect(s.marks.length).toBe(2);
  expect(s.marks.at(-1)).toMatchObject({ col: 5, row: 5, at: 3 });
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
  s.place(1, 2, 4);
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
