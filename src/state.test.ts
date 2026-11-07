import { expect, test } from "bun:test";
import { State } from "./state";
import { config, maxMarks } from "./config";

process.env.DATA_DIR = "/tmp/pp-test";

test("rolling capacity with 10-step fade, gone at 210", () => {
  const s = new State();
  for (let i = 0; i < 300; i++) s.place(i % 400, Math.floor(i / 400), 1, i);
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
  s.place(5, 5, 1, 1);
  s.place(6, 6, 2, 2);
  s.place(5, 5, 3, 3);
  expect(s.marks.length).toBe(2);
  expect(s.marks.at(-1)).toMatchObject({ col: 5, row: 5, color: 3 });
});
