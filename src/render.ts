import { config, height } from "./config";
import { palette, themes, type Theme } from "./palette";
import type { Mark, State } from "./state";

const { width, gridHeight, footerHeight, cell, glowMs } = config;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function colorOf(m: Mark): string {
  return palette[m.color - 1] ?? "#ffffff";
}

function markRect(m: Mark, opacity: number): string {
  const o = opacity < 1 ? ` fill-opacity="${opacity.toFixed(2)}"` : "";
  return `<rect x="${m.col * cell}" y="${m.row * cell}" width="${cell}" height="${cell}" fill="${colorOf(m)}"${o}/>`;
}

function glow(m: Mark, now: number): string {
  const hex = colorOf(m);
  const age = Math.min(now - m.at, glowMs) / 1000;
  const cx = m.col * cell + cell / 2;
  const cy = m.row * cell + cell / 2;
  const fade = glowMs / 1000;
  const phase = (age % 1.6).toFixed(2);
  // Negative `begin` starts each animation mid-flight at the mark's true age, so
  // repeated camo fetches of this SVG all agree on where the animation is.
  return `<g>
  <animate attributeName="opacity" from="1" to="0" dur="${fade}s" begin="-${age.toFixed(2)}s" fill="freeze"/>
  <circle cx="${cx}" cy="${cy}" r="${cell * 1.5}" fill="${hex}" opacity="0.45"/>
  <circle cx="${cx}" cy="${cy}" r="${cell}" fill="none" stroke="${hex}" stroke-width="1">
    <animate attributeName="r" from="${cell}" to="${cell * 7}" dur="1.6s" begin="-${phase}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from="0.9" to="0" dur="1.6s" begin="-${phase}s" repeatCount="indefinite"/>
  </circle>
</g>`;
}

export function renderSvg(state: State, themeName: Theme["name"], now = Date.now()): string {
  const theme = themes[themeName];
  const rects = state.marks.map((m, i) => markRect(m, state.opacityAt(i))).join("\n  ");
  const glows = state.marks
    .filter((m) => now - m.at < glowMs)
    .map((m) => glow(m, now))
    .join("\n  ");
  const label =
    state.total === 0
      ? "click any square to leave the first mark"
      : "click any square to leave your mark";
  const count = state.total === 1 ? "1 mark" : `${fmt(state.total)} marks`;
  const fontStack = `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <pattern id="dots" width="${cell * 10}" height="${cell * 10}" patternUnits="userSpaceOnUse">
    <rect x="0" y="0" width="1" height="1" fill="${theme.dot}"/>
  </pattern>
  <clipPath id="grid"><rect x="0" y="0" width="${width}" height="${gridHeight}"/></clipPath>
</defs>
<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.bg}"/>
<g clip-path="url(#grid)" shape-rendering="crispEdges">
  <rect x="0" y="0" width="${width}" height="${gridHeight}" fill="url(#dots)"/>
  ${rects}
</g>
<g clip-path="url(#grid)">
  ${glows}
</g>
<rect x="0.5" y="0.5" width="${width - 1}" height="${gridHeight}" fill="none" stroke="${theme.border}"/>
<g font-family='${fontStack}' font-size="11" fill="${theme.text}" dominant-baseline="middle">
  <text x="1" y="${gridHeight + footerHeight / 2 + 1}">${esc(label)}</text>
  <text x="${width - 1}" y="${gridHeight + footerHeight / 2 + 1}" text-anchor="end" fill="${theme.textStrong}">${esc(count)}</text>
</g>
</svg>`;
}
