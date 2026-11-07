/** Index 0 is reserved for "empty"; it takes the theme background at encode time. */
export const palette: readonly string[] = [
  "#ff4500", "#ffa800", "#ffd635", "#fff8b8",
  "#00a368", "#00cc78", "#7eed56", "#00756f",
  "#009eaa", "#00ccc0", "#2450a4", "#3690ea",
  "#51e9f4", "#493ac1", "#6a5cff", "#811e9f",
  "#b44ac0", "#e4abff", "#de107f", "#ff3881",
  "#ff99aa", "#6d482f", "#9c6926", "#ffb470",
];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function randomColorIndex(): number {
  // 1-based: 0 is empty.
  return 1 + Math.floor(Math.random() * palette.length);
}

export type Theme = {
  name: "dark" | "light";
  bg: string;
  surface: string;
  border: string;
  dot: string;
  text: string;
  textStrong: string;
};

export const themes: Record<Theme["name"], Theme> = {
  dark: {
    name: "dark",
    bg: "#0d1117",
    surface: "#0d1117",
    border: "#30363d",
    dot: "#21262d",
    text: "#8b949e",
    textStrong: "#e6edf3",
  },
  light: {
    name: "light",
    bg: "#ffffff",
    surface: "#ffffff",
    border: "#d0d7de",
    dot: "#eaeef2",
    text: "#656d76",
    textStrong: "#1f2328",
  },
};
