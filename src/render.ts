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
const SQUARE_MIN = 0.8; // lit square brightness at the bottom of its pulse
const GLOW_MIN = 0.1; // blurred halo behind each lit square, bottom of pulse
const GLOW_MAX = 0.55;
const GLOW_PAD = 3; // halo extends this far past the square before blur
const GLOW_BLUR = 2.5;

/** Pulse phase offset so neighbouring columns are slightly out of step: a soft wave across the grid. */
function phase(col: number, row: number): string {
  const t = ((col / cols) * 1.0 + (row / config.rows) * 0.25) * pulseSeconds;
  return (-(t % pulseSeconds)).toFixed(2);
}

function pulse(attr: string, lo: number, hi: number, begin: string): string {
  return `<animate attributeName="${attr}" values="${lo};${hi};${lo}" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${pulseSeconds}s" begin="${begin}s" repeatCount="indefinite"/>`;
}

export function renderSvg(state: State, themeName: ThemeName): string {
  const { fg, sat, light } = themes[themeName];
  const colorOf = (hue: number | undefined) => (hue === undefined ? fg : `hsl(${hue} ${sat}% ${light}%)`);

  const squares: string[] = [];
  const glows: string[] = [];
  state.marks.forEach((m, i) => {
    const fade = state.opacityAt(i);
    const x = offsetX + m.col * cell + inset;
    const y = offsetY + m.row * cell + inset;
    const begin = phase(m.col, m.row);
    const op = fade < 1 ? ` opacity="${fade.toFixed(2)}"` : "";
    const fill = ` fill="${colorOf(m.hue)}"`;
    squares.push(
      `<rect x="${x}" y="${y}" width="${square}" height="${square}" rx="1"${fill}${op}>${pulse("fill-opacity", SQUARE_MIN, 1, begin)}</rect>`,
    );
    glows.push(
      `<rect x="${x - GLOW_PAD}" y="${y - GLOW_PAD}" width="${square + GLOW_PAD * 2}" height="${square + GLOW_PAD * 2}" rx="${GLOW_PAD}"${fill}${op}>${pulse("fill-opacity", GLOW_MIN, GLOW_MAX, begin)}</rect>`,
    );
  });


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
  <g filter="url(#glow)">${glows.join("")}</g>
  <g>${squares.join("")}</g>
</g>
</svg>`;
}
