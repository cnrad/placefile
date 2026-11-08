import { config, cols, rows, maxMarks } from "./config";

/** `hue` is 0-359, derived from the visitor's salted identity hash. Missing on marks placed before colors existed. */
export type Mark = { col: number; row: number; at: number; hue?: number };

export type Snapshot = { marks: Mark[]; total: number; lastTap: [string, number][]; salt?: string };

/** FNV-1a 32-bit. Fine here: the salt is 128 random bits and never leaves storage. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pure in-memory state. Hosts persist it via `snapshot()` / `restore()`. */
export class State {
  /** Oldest first. Length never exceeds `maxMarks`. */
  marks: Mark[] = [];
  /** All-time count, including marks that have since faded out. */
  total = 0;
  /** Last accepted tap per client key. */
  lastTap = new Map<string, number>();
  /** Per-canvas random salt so identity hashes cannot be brute-forced back to an IP. */
  salt: string = crypto.randomUUID();

  restore(s: Partial<Snapshot> | null | undefined) {
    if (!s) return;
    // Drop anything outside the current grid (e.g. after a resize).
    this.marks = (s.marks ?? [])
      .filter((m) => m.col >= 0 && m.col < cols && m.row >= 0 && m.row < rows)
      .map(({ col, row, at, hue }) => (hue === undefined ? { col, row, at } : { col, row, at, hue }))
      .slice(-maxMarks);
    this.total = s.total ?? this.marks.length;
    this.lastTap = new Map(s.lastTap ?? []);
    if (s.salt) this.salt = s.salt;
  }

  snapshot(): Snapshot {
    return { marks: this.marks, total: this.total, lastTap: [...this.lastTap], salt: this.salt };
  }

  /** Stable anonymous hue for a visitor identity (IP or cookie). */
  hueFor(identity: string): number {
    return fnv1a(`${this.salt}:${identity}`) % 360;
  }

  /** Toggle a cell. Returns the new mark, or null if the click turned a lit square off. */
  toggle(col: number, row: number, hue: number, at = Date.now()): Mark | null {
    const without = this.marks.filter((m) => !(m.col === col && m.row === row));
    if (without.length !== this.marks.length) {
      this.marks = without;
      return null;
    }
    const mark: Mark = { col, row, at, hue };
    this.marks = without.concat(mark).slice(-maxMarks);
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
