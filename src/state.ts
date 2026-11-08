import { config, cols, rows, maxMarks } from "./config";

export type Mark = { col: number; row: number; at: number };

export type Snapshot = { marks: Mark[]; total: number; lastTap: [string, number][] };

/** Pure in-memory state. Hosts persist it via `snapshot()` / `restore()`. */
export class State {
  /** Oldest first. Length never exceeds `maxMarks`. */
  marks: Mark[] = [];
  /** All-time count, including marks that have since faded out. */
  total = 0;
  /** Last accepted tap per client key. */
  lastTap = new Map<string, number>();

  restore(s: Partial<Snapshot> | null | undefined) {
    if (!s) return;
    // Drop anything outside the current grid (e.g. after a resize).
    this.marks = (s.marks ?? [])
      .filter((m) => m.col >= 0 && m.col < cols && m.row >= 0 && m.row < rows)
      .map(({ col, row, at }) => ({ col, row, at }))
      .slice(-maxMarks);
    this.total = s.total ?? this.marks.length;
    this.lastTap = new Map(s.lastTap ?? []);
  }

  snapshot(): Snapshot {
    return { marks: this.marks, total: this.total, lastTap: [...this.lastTap] };
  }

  place(col: number, row: number, at = Date.now()): Mark {
    const mark: Mark = { col, row, at };
    this.marks = this.marks
      .filter((m) => !(m.col === col && m.row === row))
      .concat(mark)
      .slice(-maxMarks);
    this.total++;
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

  onCooldown(keys: string[], now: number, cooldownMs: number): boolean {
    for (const [k, t] of this.lastTap) if (now - t > cooldownMs) this.lastTap.delete(k);
    return keys.some((k) => {
      const t = this.lastTap.get(k);
      return t !== undefined && now - t < cooldownMs;
    });
  }

  recordTap(keys: string[], now: number) {
    for (const k of keys) this.lastTap.set(k, now);
  }
}
