export const config = {
  /**
   * Rendered width in CSS px. Must equal the README column width on github.com so ismap
   * click coordinates map to the right cell. The profile README content column is 846px
   * at viewports >= 1280px.
   */
  width: 846,
  /** Space around the grid so edge glows are not clipped by the image bounds. */
  padding: 10,
  /** Cell pitch in px; squares are `square` px with the remainder as gap. floor((846 - 20) / 12) = 68 columns. */
  cell: 12,
  square: 10,
  rows: 10,

  /** This many marks stay fully opaque. */
  capacity: 200,
  /** Beyond capacity, each new placement knocks the oldest mark down by 1/fadeSteps. */
  fadeSteps: 10,

  /** Each lit square pulses its glow over `pulseSeconds`; phase is offset by column so it reads as a wave. */
  pulseSeconds: 3,
} as const;

const innerWidth = config.width - config.padding * 2;
export const cols = Math.floor(innerWidth / config.cell);
export const rows = config.rows;
/** Grid origin. Horizontal slack from `cell` not dividing the inner width is split so the grid is centered. */
export const offsetX = config.padding + Math.floor((innerWidth - cols * config.cell) / 2);
export const offsetY = config.padding;
export const height = rows * config.cell + config.padding * 2;
/** 200 opaque + 9 fading (90% down to 10%). The next placement removes the oldest. */
export const maxMarks = config.capacity + config.fadeSteps - 1;

/** Runtime settings; each host (Bun, Workers) fills these from its own env. */
export type RuntimeOptions = {
  /** Where /tap sends the visitor after recording a mark. */
  profileUrl: string;
  cooldownMs: number;
  /** When set, enables GET /export and POST /import with `Authorization: Bearer <token>`. */
  adminToken?: string;
};

export const defaultCooldownMs = 1000;

/** GitHub username rules: 1-39 chars, alphanumeric or single hyphens, no leading/trailing hyphen. */
export const githubUsername = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
/** GitHub repository name rules: 1-100 chars of letters, digits, `.`, `-`, `_`. */
export const githubRepo = /^[\w.-]{1,100}$/;
