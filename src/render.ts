import { config, cols, gridHeight, height } from "./config";
import type { State } from "./state";

const { width, cell, square, footerHeight, cornerRadius, pulseSeconds } = config;
const inset = (cell - square) / 2;

export type ThemeName = "dark" | "light";

/** Everything is one foreground color at varying opacity, over a transparent background. */
const themes: Record<ThemeName, { fg: string }> = {
  dark: { fg: "#ffffff" },
  light: { fg: "#1f2328" },
};

const EMPTY = 0.03; // empty cells, barely there
const SQUARE_MIN = 0.8; // lit square brightness at the bottom of its pulse
const GLOW_MIN = 0.1; // blurred halo behind each lit square, bottom of pulse
const GLOW_MAX = 0.55;
const GLOW_PAD = 3; // halo extends this far past the square before blur
const GLOW_BLUR = 2.5;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Pulse phase offset so neighbouring columns are slightly out of step: a soft wave across the grid. */
function phase(col: number, row: number): string {
  const t = ((col / cols) * 1.0 + (row / config.rows) * 0.25) * pulseSeconds;
  return (-(t % pulseSeconds)).toFixed(2);
}

function pulse(attr: string, lo: number, hi: number, begin: string): string {
  return `<animate attributeName="${attr}" values="${lo};${hi};${lo}" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${pulseSeconds}s" begin="${begin}s" repeatCount="indefinite"/>`;
}

export function renderSvg(state: State, themeName: ThemeName): string {
  const { fg } = themes[themeName];

  const squares: string[] = [];
  const glows: string[] = [];
  state.marks.forEach((m, i) => {
    const fade = state.opacityAt(i);
    const x = m.col * cell + inset;
    const y = m.row * cell + inset;
    const begin = phase(m.col, m.row);
    const op = fade < 1 ? ` opacity="${fade.toFixed(2)}"` : "";
    squares.push(
      `<rect x="${x}" y="${y}" width="${square}" height="${square}" rx="1"${op}>${pulse("fill-opacity", SQUARE_MIN, 1, begin)}</rect>`,
    );
    glows.push(
      `<rect x="${x - GLOW_PAD}" y="${y - GLOW_PAD}" width="${square + GLOW_PAD * 2}" height="${square + GLOW_PAD * 2}" rx="${GLOW_PAD}"${op}>${pulse("fill-opacity", GLOW_MIN, GLOW_MAX, begin)}</rect>`,
    );
  });

  const lit = state.marks.length;
  const label = lit === 0 ? "click a square to light it up" : "click a square to toggle it";
  const count = lit === 1 ? "1 square lit" : `${fmt(lit)} squares lit`;
  const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
  const textY = gridHeight + footerHeight / 2 + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <pattern id="empty" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
    <rect x="${inset}" y="${inset}" width="${square}" height="${square}" rx="1" fill="${fg}"/>
  </pattern>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="${GLOW_BLUR}"/>
  </filter>
  <clipPath id="round"><rect x="0" y="0" width="${width}" height="${gridHeight}" rx="${cornerRadius}"/></clipPath>
</defs>
<g clip-path="url(#round)">
  <rect x="0" y="0" width="${width}" height="${gridHeight}" fill="url(#empty)" opacity="${EMPTY}"/>
  <g fill="${fg}" filter="url(#glow)">${glows.join("")}</g>
  <g fill="${fg}">${squares.join("")}</g>
</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${gridHeight - 1}" rx="${cornerRadius - 0.5}" fill="none" stroke="${fg}" stroke-opacity="0.12"/>
<g font-family='${font}' font-size="12" fill="${fg}" dominant-baseline="middle">
  <text x="0" y="${textY}" fill-opacity="0.5">${esc(label)}</text>
  <text x="${width}" y="${textY}" text-anchor="end" fill-opacity="0.8">${esc(count)}</text>
</g>
</svg>`;
}
