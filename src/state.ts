import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config, maxMarks } from "./config";

export type Mark = { col: number; row: number; color: number; at: number };

type Persisted = { marks: Mark[]; total: number };

const path = join(config.dataDir, "state.json");

export class State {
  /** Oldest first. Length never exceeds `maxMarks`. */
  marks: Mark[] = [];
  /** All-time count, including marks that have since faded out. */
  total = 0;

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async load() {
    mkdirSync(config.dataDir, { recursive: true });
    if (!existsSync(path)) return;
    const data = (await Bun.file(path).json()) as Persisted;
    this.marks = (data.marks ?? []).slice(-maxMarks);
    this.total = data.total ?? this.marks.length;
  }

  place(col: number, row: number, color: number, at = Date.now()): Mark {
    const mark: Mark = { col, row, color, at };
    this.marks = this.marks
      .filter((m) => !(m.col === col && m.row === row))
      .concat(mark)
      .slice(-maxMarks);
    this.total++;
    this.scheduleSave();
    return mark;
  }

  /**
   * Opacity for the mark at `index` (oldest = 0). The newest `capacity` marks are
   * fully opaque; older ones step down toward 0 as more marks arrive.
   */
  opacityAt(index: number): number {
    const fromNewest = this.marks.length - 1 - index;
    if (fromNewest < config.capacity) return 1;
    const step = fromNewest - config.capacity + 1;
    return Math.max(0, 1 - step / config.fadeSteps);
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, 250);
  }

  async save() {
    const data: Persisted = { marks: this.marks, total: this.total };
    await Bun.write(path, JSON.stringify(data));
  }
}
