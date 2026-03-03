export const themeMap = {
  dark: {
    bg: "#0d0d0d",
    surface: "#141414",
    surfaceAlt: "#1e1e1e",
    border: "#222222",
    borderStrong: "#2a2a2a",
    text: "#e5e5e5",
    textSub: "#888888",
    textMuted: "#555555",
    headerBg: "#0d0d0d",
    positive: "#3aaf8a",
    negative: "#e05252",
  },
  light: {
    bg: "#f4f4f4",
    surface: "#ffffff",
    surfaceAlt: "#f0f0f0",
    border: "#e0e0e0",
    borderStrong: "#c8c8c8",
    text: "#111111",
    textSub: "#555555",
    textMuted: "#999999",
    headerBg: "#ffffff",
    positive: "#1e6b53",
    negative: "#c0392b",
  },
} as const;

export type ThemeMode = keyof typeof themeMap;
export type Theme = typeof themeMap["dark"] | typeof themeMap["light"];
