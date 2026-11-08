export const config = {
  /** Rendered image is `width` x `height` CSS px; coordinates from ismap arrive in this space. */
  width: 800,
  gridHeight: 400,
  footerHeight: 24,
  cell: 2,

  /** Marks newer than this still glow and pulse. */
  glowMs: 90_000,
  /** This many marks stay fully opaque. */
  capacity: 200,
  /** Beyond capacity, each new placement knocks the oldest mark down by 1/fadeSteps. */
  fadeSteps: 10,
} as const;

export const cols = config.width / config.cell;
export const rows = config.gridHeight / config.cell;
export const height = config.gridHeight + config.footerHeight;
/** 200 opaque + 9 fading (90% down to 10%). The next placement removes the oldest. */
export const maxMarks = config.capacity + config.fadeSteps - 1;

/** Runtime settings; each host (Bun, Workers) fills these from its own env. */
export type RuntimeOptions = {
  /** Where /tap sends the visitor after recording a mark. */
  profileUrl: string;
  cooldownMs: number;
};

export const defaultOptions: RuntimeOptions = {
  profileUrl: "https://github.com/cnrad",
  cooldownMs: 5000,
};
