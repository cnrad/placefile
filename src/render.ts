import { config, gridHeight, height } from "./config";
import type { State } from "./state";

const { width, cell, square, footerHeight, cornerRadius, sweepSeconds, periodSeconds } = config;
const inset = (cell - square) / 2;

export type ThemeName = "dark" | "light";

/** Everything is one foreground color at varying opacity, over a transparent background. */
const themes: Record<ThemeName, { fg: string }> = {
  dark: { fg: "#ffffff" },
  light: { fg: "#1f2328" },
};

const FILLED = 0.78; // base opacity of a placed square; the shimmer lifts it toward 1
const EMPTY = 0.05; // empty cells, just enough to show the grid
const SHIMMER_PEAK = 0.9; // gradient peak; multiplied by the mask (1 on filled, EMPTY on empty)

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function renderSvg(state: State, themeName: ThemeName): string {
  const { fg } = themes[themeName];

  const filled = state.marks
    .map((m, i) => {
      const o = state.opacityAt(i);
      const x = m.col * cell + inset;
      const y = m.row * cell + inset;
      const op = o < 1 ? ` opacity="${o.toFixed(2)}"` : "";
      return `<rect x="${x}" y="${y}" width="${square}" height="${square}" rx="1"${op}/>`;
    })
    .join("");

  const band = width * 0.6;
  const sweepFrac = (sweepSeconds / periodSeconds).toFixed(4);

  const label = state.total === 0 ? "click a square to leave the first mark" : "click a square to leave your mark";
  const count = state.total === 1 ? "1 mark" : `${fmt(state.total)} marks`;
  const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
  const textY = gridHeight + footerHeight / 2 + 1;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <pattern id="empty" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
    <rect x="${inset}" y="${inset}" width="${square}" height="${square}" rx="1" fill="${fg}"/>
  </pattern>
  <pattern id="emptyMask" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
    <rect x="${inset}" y="${inset}" width="${square}" height="${square}" rx="1" fill="#fff"/>
  </pattern>
  <linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${band}" y2="0">
    <stop offset="0" stop-color="${fg}" stop-opacity="0"/>
    <stop offset="0.5" stop-color="${fg}" stop-opacity="${SHIMMER_PEAK}"/>
    <stop offset="1" stop-color="${fg}" stop-opacity="0"/>
  </linearGradient>
  <mask id="cells" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${gridHeight}">
    <rect x="0" y="0" width="${width}" height="${gridHeight}" fill="url(#emptyMask)" opacity="${EMPTY}"/>
    <g fill="#fff">${filled}</g>
  </mask>
  <clipPath id="round"><rect x="0" y="0" width="${width}" height="${gridHeight}" rx="${cornerRadius}"/></clipPath>
</defs>
<g clip-path="url(#round)">
  <rect x="0" y="0" width="${width}" height="${gridHeight}" fill="url(#empty)" opacity="${EMPTY}"/>
  <g fill="${fg}" opacity="${FILLED}">${filled}</g>
  <g mask="url(#cells)">
    <rect x="0" y="0" width="${band}" height="${gridHeight}" fill="url(#sheen)">
      <animateTransform attributeName="transform" type="translate"
        values="${-band} 0; ${width} 0; ${width} 0" keyTimes="0; ${sweepFrac}; 1"
        calcMode="spline" keySplines="0.4 0 0.6 1; 0 0 1 1"
        dur="${periodSeconds}s" repeatCount="indefinite"/>
    </rect>
  </g>
</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${gridHeight - 1}" rx="${cornerRadius - 0.5}" fill="none" stroke="${fg}" stroke-opacity="0.12"/>
<g font-family='${font}' font-size="12" fill="${fg}" dominant-baseline="middle">
  <text x="0" y="${textY}" fill-opacity="0.5">${esc(label)}</text>
  <text x="${width}" y="${textY}" text-anchor="end" fill-opacity="0.8">${esc(count)}</text>
</g>
</svg>`;
}
