// 金融エディトリアル・パレット：暖かい紙＋墨＋彩度を落とした翡翠＋オックスブラッド。
// ネオン翡翠（旧 #3aaf8a / #2d8c6e）と冷たいグレーを廃し、FT/Monocle 的な紙面感へ。
export const themeMap = {
  dark: {
    // 暖かい墨（ネオン排除）
    bg: "#15140f",
    surface: "#1c1b15",
    surfaceAlt: "#24221b",
    border: "#302d24",
    borderStrong: "#403c30",
    text: "#ece7da",
    textSub: "#a39c8c",
    textMuted: "#807969",
    headerBg: "#15140f",
    positive: "#6aa589",
    negative: "#cf6f60",
  },
  light: {
    // 紙面（エディトリアルの主役）
    bg: "#f4f1ea",
    surface: "#fbfaf6",
    surfaceAlt: "#ece7db",
    border: "#e0d9ca",
    borderStrong: "#cabfa8",
    text: "#1b1a16",
    textSub: "#57534a",
    textMuted: "#8c8576",
    headerBg: "#fbfaf6",
    positive: "#2f6f55",
    negative: "#a23c30",
  },
} as const;

export type ThemeMode = keyof typeof themeMap;
export type Theme = typeof themeMap["dark"] | typeof themeMap["light"];
