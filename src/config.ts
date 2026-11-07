export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? "./data",
  /** Where /tap sends the visitor after recording a mark. */
  profileUrl: process.env.PROFILE_URL ?? "https://github.com/cnrad",
  cooldownMs: Number(process.env.COOLDOWN_MS ?? 5000),
  /** Header your reverse proxy sets with the real client IP. Fly sets `fly-client-ip`. */
  trustedIpHeader: process.env.TRUSTED_IP_HEADER ?? "fly-client-ip",

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
