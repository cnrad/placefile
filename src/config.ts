export const config = {
  /**
   * Rendered width in CSS px. Must equal the README column width on github.com so ismap
   * click coordinates map to the right cell. Measured: profile README content is 846px
   * at viewports >= 1280px.
   */
  width: 846,
  /** Cell pitch in px; squares are `square` px with the remainder as gap. 846 / 9 = 94 columns. */
  cell: 9,
  square: 7,
  rows: 20,
  footerHeight: 24,
  cornerRadius: 6,

  /** This many marks stay fully opaque. */
  capacity: 200,
  /** Beyond capacity, each new placement knocks the oldest mark down by 1/fadeSteps. */
  fadeSteps: 10,

  /** Each lit square pulses its glow over `pulseSeconds`; phase is offset by column so it reads as a wave. */
  pulseSeconds: 3,
} as const;

export const cols = Math.floor(config.width / config.cell);
export const rows = config.rows;
export const gridHeight = rows * config.cell;
export const height = gridHeight + config.footerHeight;
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
  cooldownMs: 1000,
};
