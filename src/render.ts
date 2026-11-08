import { config, cols, rows, height, offsetX, offsetY } from "./config";
import type { State } from "./state";

const { width, cell, square, pulseSeconds } = config;
const inset = (cell - square) / 2;

export type ThemeName = "dark" | "light";

/** Empty cells use `fg`; lit squares take the visitor's hue at fixed saturation/lightness per theme. */
const themes: Record<ThemeName, { fg: string; sat: number; light: number }> = {
  dark: { fg: "#ffffff", sat: 75, light: 72 },
  light: { fg: "#1f2328", sat: 70, light: 46 },
};

const EMPTY = 0.03; // empty cells, barely there
const SQUARE_MIN = 0.86; // lit square brightness at the bottom of its pulse
const GLOW_MIN = 0.06; // blurred halo behind each lit square, bottom of pulse
const GLOW_MAX = 0.3;
const GLOW_PAD = 2; // halo extends this far past the square before blur
const GLOW_BLUR = 1.8;
/** Squares are animated in phase groups, not individually, so the SMIL count stays flat as the canvas fills. */
const PHASE_BUCKETS = 12;

/** Which phase group a cell belongs to. Columns drive it with a little row tilt, so it reads as a soft diagonal wave. */
function bucket(col: number, row: number): number {
  const t = (col / cols) * 1.0 + (row / rows) * 0.25;
  return Math.floor((t % 1) * PHASE_BUCKETS);
}

function begin(b: number): string {
  return (-((b / PHASE_BUCKETS) * pulseSeconds)).toFixed(2);
}

function pulse(lo: number, hi: number, b: number): string {
  return `<animate attributeName="opacity" values="${lo};${hi};${lo}" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${pulseSeconds}s" begin="${begin(b)}s" repeatCount="indefinite"/>`;
}

export function renderSvg(state: State, themeName: ThemeName): string {
  const { fg, sat, light } = themes[themeName];
  const colorOf = (hue: number | undefined) => (hue === undefined ? fg : `hsl(${hue} ${sat}% ${light}%)`);

  const squares: string[][] = Array.from({ length: PHASE_BUCKETS }, () => []);
  const glows: string[][] = Array.from({ length: PHASE_BUCKETS }, () => []);
  state.marks.forEach((m, i) => {
    const fade = state.opacityAt(i);
    const x = offsetX + m.col * cell + inset;
    const y = offsetY + m.row * cell + inset;
    const b = bucket(m.col, m.row);
    const op = fade < 1 ? ` opacity="${fade.toFixed(2)}"` : "";
    const fill = ` fill="${colorOf(m.hue)}"`;
    squares[b]!.push(`<rect x="${x}" y="${y}" width="${square}" height="${square}" rx="1"${fill}${op}/>`);
    glows[b]!.push(
      `<rect x="${x - GLOW_PAD}" y="${y - GLOW_PAD}" width="${square + GLOW_PAD * 2}" height="${square + GLOW_PAD * 2}" rx="${GLOW_PAD}"${fill}${op}/>`,
    );
  });
  const group = (items: string[][], lo: number, hi: number) =>
    items
      .map((rects, b) => (rects.length ? `<g>${pulse(lo, hi, b)}${rects.join("")}</g>` : ""))
      .join("");


  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <pattern id="empty" x="${offsetX}" y="${offsetY}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
    <rect x="${inset}" y="${inset}" width="${square}" height="${square}" rx="1" fill="${fg}"/>
  </pattern>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="${GLOW_BLUR}"/>
  </filter>
</defs>
<g>
  <rect x="${offsetX}" y="${offsetY}" width="${cols * cell}" height="${rows * cell}" fill="url(#empty)" opacity="${EMPTY}"/>
  <g filter="url(#glow)">${group(glows, GLOW_MIN, GLOW_MAX)}</g>
  <g>${group(squares, SQUARE_MIN, 1)}</g>
</g>
</svg>`;
}
