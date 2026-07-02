import { ImageResponse } from "next/og";
import { themeMap } from "@/lib/theme";

// OG 画像（1200×630）。ビルド時に静的生成され、og:image / twitter:image に自動注入される。
export const alt = "翡翠眼 | マクロ市場分析";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Google Fonts CSS API から「翡翠眼」等の必要グリフのみサブセット取得（Shippori Mincho）。
// 失敗時は null を返しシステムフォントで生成継続（外部依存でビルドを落とさない）。
async function loadShipporiMincho(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype|woff)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const t = themeMap.dark;
  const title = "翡翠眼";
  const subtitle = "マクロ市場分析";
  const fontData = await loadShipporiMincho(title + subtitle);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: t.bg,
          padding: "0 96px",
        }}
      >
        {/* 左端の翡翠バー（マストヘッドの意匠を踏襲） */}
        <div style={{ width: 10, height: 260, backgroundColor: t.positive, marginRight: 56 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 168,
              fontWeight: 700,
              color: t.text,
              letterSpacing: "0.08em",
              lineHeight: 1.1,
              fontFamily: fontData ? "Shippori Mincho" : "serif",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 44,
              color: t.textSub,
              letterSpacing: "0.2em",
              marginTop: 28,
              fontFamily: fontData ? "Shippori Mincho" : "serif",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "Shippori Mincho", data: fontData, weight: 700 as const, style: "normal" as const }]
        : undefined,
    },
  );
}
