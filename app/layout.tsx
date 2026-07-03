import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { themeMap } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "翡翠眼 | マクロ市場分析",
    template: "%s",
  },
  description: "為替・株式指数・米国債・日本国債・コモディティのリアルタイムデータと、月次・週次・日次のマクロ市場分析レポート。",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "翡翠眼 | マクロ市場分析",
    description: "為替・株式指数・米国債・日本国債・コモディティのリアルタイムデータと、月次・週次・日次のマクロ市場分析レポート。",
    url: "/",
  },
  // og:image / twitter:image は app/opengraph-image.tsx から自動注入される
  twitter: {
    card: "summary_large_image",
    title: "翡翠眼 | マクロ市場分析",
    description: "為替・株式指数・米国債・日本国債・コモディティのリアルタイムデータと、月次・週次・日次のマクロ市場分析レポート。",
  },
};

// モバイルブラウザの chrome 色をページ背景に揃える。テーマは localStorage 制御のため
// prefers-color-scheme で静的近似（色源は lib/theme.ts の themeMap に一本化）。
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeMap.light.bg },
    { media: "(prefers-color-scheme: dark)", color: themeMap.dark.bg },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 和文セリフ（明朝）: 翡翠眼ロゴ・マストヘッド・格言などエディトリアルな見出しに使用 */}
        {/* Latin セリフ（Newsreader）: 英語見出し・ラベル・数字見出しの紙面感強化 */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
