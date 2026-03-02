"use client";
import { useState, useEffect } from "react";
import Link from "next/link";


const JADE = {
  main: "#2d8c6e",
  light: "#3aaf8a",
  dim: "#1e6b53",
};

const theme = {
  dark: {
    bg: "#0d0d0d",
    surface: "#161616",
    surfaceAlt: "#1e1e1e",
    border: "#2a2a2a",
    borderStrong: "#3a3a3a",
    text: "#e8e8e8",
    textSub: "#888888",
    textMuted: "#555555",
    positive: "#3aaf8a",
    negative: "#e05252",
    headerBg: "#0d0d0d",
    sectionBg: "#161616",
  },
  light: {
    bg: "#f4f4f4",
    surface: "#ffffff",
    surfaceAlt: "#f9f9f9",
    border: "#d8d8d8",
    borderStrong: "#b0b0b0",
    text: "#111111",
    textSub: "#555555",
    textMuted: "#999999",
    positive: "#1e6b53",
    negative: "#c0392b",
    headerBg: "#ffffff",
    sectionBg: "#ffffff",
  },
} as const;

type ThemeMode = keyof typeof theme;

interface ForexItem {
  pair: string;
  value: string | null;
  change: string | null;
  pct: string | null;
}

interface StockItem {
  name: string;
  symbol: string;
  value: string | null;
  change: string | null;
  pct: string | null;
}

interface TreasuryItem {
  term: string;
  value: string | null;
  change: string | null;
  trend: "up" | "down" | null;
}

export default function Home() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  const [forex, setForex] = useState<ForexItem[] | null>(null);
  const [forexLoading, setForexLoading] = useState(true);
  const [forexError, setForexError] = useState<string | null>(null);
  const [forexUpdatedAt, setForexUpdatedAt] = useState<string | null>(null);

  const [stocks, setStocks] = useState<StockItem[] | null>(null);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState<string | null>(null);

  const [ustreasury, setUstreasury] = useState<TreasuryItem[] | null>(null);
  const [ustreasuryLoading, setUstreasuryLoading] = useState(true);
  const [ustreasuryError, setUstreasuryError] = useState<string | null>(null);

  const [jptreasury, setJptreasury] = useState<TreasuryItem[] | null>(null);
  const [jptreasuryLoading, setJptreasuryLoading] = useState(true);
  const [jptreasuryError, setJptreasuryError] = useState<string | null>(null);

  const [commodities, setCommodities] = useState<ForexItem[] | null>(null);
  const [commoditiesLoading, setCommoditiesLoading] = useState(true);
  const [commoditiesError, setCommoditiesError] = useState<string | null>(null);

  const t = theme[mode];

  useEffect(() => {
    setForexLoading(true);
    setForexError(null);
    fetch("/api/forex")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setForex(data.forex);
        setForexUpdatedAt(data.updatedAt ?? null);
      })
      .catch((err) => {
        setForexError(err.message || "データ取得エラー");
      })
      .finally(() => {
        setForexLoading(false);
      });
  }, []);

  useEffect(() => {
    setStocksLoading(true);
    setStocksError(null);
    fetch("/api/stocks")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStocks(data.stocks);
      })
      .catch((err) => {
        setStocksError(err.message || "データ取得エラー");
      })
      .finally(() => {
        setStocksLoading(false);
      });
  }, []);

  useEffect(() => {
    setUstreasuryLoading(true);
    setUstreasuryError(null);
    fetch("/api/ustreasury")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUstreasury(data.ustreasury);
      })
      .catch((err) => {
        setUstreasuryError(err.message || "データ取得エラー");
      })
      .finally(() => {
        setUstreasuryLoading(false);
      });
  }, []);

  useEffect(() => {
    setJptreasuryLoading(true);
    setJptreasuryError(null);
    fetch("/api/jptreasury")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setJptreasury(data.jptreasury);
      })
      .catch((err) => {
        setJptreasuryError(err.message || "データ取得エラー");
      })
      .finally(() => {
        setJptreasuryLoading(false);
      });
  }, []);

  useEffect(() => {
    setCommoditiesLoading(true);
    setCommoditiesError(null);
    fetch("/api/commodities")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCommodities(data.commodities);
      })
      .catch((err) => {
        setCommoditiesError(err.message || "データ取得エラー");
      })
      .finally(() => {
        setCommoditiesLoading(false);
      });
  }, []);

  const lastUpdated = forexUpdatedAt
    ? new Date(forexUpdatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false }).replace(/\//g, "-") + " JST"
    : "---";

  const isPositive = (val: string) => !val.startsWith("-");
  const changeColor = (val: string) => (isPositive(val) ? t.positive : t.negative);

  return (
    <div style={{ backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: t.headerBg, borderBottom: `1px solid ${t.borderStrong}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 3, height: 20, backgroundColor: JADE.main }} />
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: t.text }}>MACRO MARKETS</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {["株式", "為替", "米国債", "日本国債", "コモディティ"].map((label, i) => (
              <a key={i} href={`#${label}`} style={{ fontSize: 12, color: t.textSub, padding: "8px 14px", textDecoration: "none", letterSpacing: "0.05em", borderLeft: i === 0 ? `1px solid ${t.border}` : "none", borderRight: `1px solid ${t.border}` }}>
                {label}
              </a>
            ))}
            <Link href="/reports" style={{ fontSize: 12, color: JADE.light, padding: "8px 14px", textDecoration: "none", letterSpacing: "0.05em", borderRight: `1px solid ${t.border}` }}>
              レポート
            </Link>
            <button
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              style={{ marginLeft: 16, padding: "5px 12px", fontSize: 11, backgroundColor: "transparent", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", letterSpacing: "0.05em" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </nav>
        </div>
      </header>

      {/* Status Bar */}
      <div style={{ backgroundColor: JADE.dim, borderBottom: `1px solid ${JADE.main}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "6px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "#a8d5c4", letterSpacing: "0.06em" }}>LIVE DATA — 15〜20分遅延 | 投資判断の根拠とする場合は一次情報をご確認ください</span>
          <span style={{ fontSize: 11, color: "#a8d5c4", fontFamily: "monospace" }}>最終更新：{lastUpdated}</span>
        </div>
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Section: 株式 */}
        <Section id="株式" title="株式指数" subtitle="EQUITY INDICES" t={t}>
          {stocksLoading ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted, letterSpacing: "0.1em" }}>LOADING...</span>
            </div>
          ) : stocksError ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, color: t.negative }}>エラー: {stocksError}</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(stocks ?? []).map((s, i) => (
                <div key={i} style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{s.symbol}</div>
                  <div style={{ fontSize: 13, color: t.textSub, marginBottom: 12 }}>{s.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>{s.value}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(s.change ?? "") }}>{s.change}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: changeColor(s.change ?? ""), opacity: 0.8 }}>({s.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section: 為替 */}
        <Section id="為替" title="為替レート" subtitle="FOREIGN EXCHANGE" t={t}>
          {forexLoading ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted, letterSpacing: "0.1em" }}>LOADING...</span>
            </div>
          ) : forexError ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, color: t.negative }}>エラー: {forexError}</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(forex ?? []).map((f, i) => (
                <div key={i} style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 12 }}>{f.pair}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>
                    {f.value ?? "---"}
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: t.textMuted }}>前日比データなし（無料版）</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section: 債券 2列 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* 米国債 */}
          <Section id="米国債" title="米国債利回り" subtitle="US TREASURY YIELDS" t={t}>
            {ustreasuryLoading ? (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted, letterSpacing: "0.1em" }}>LOADING...</span>
              </div>
            ) : ustreasuryError ? (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 13, color: t.negative }}>エラー: {ustreasuryError}</span>
              </div>
            ) : (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.surfaceAlt }}>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em" }}>期間</span>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", textAlign: "right" }}>利回り</span>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", textAlign: "right" }}>前日比</span>
                </div>
                {(ustreasury ?? []).map((b, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "14px 16px", borderBottom: i < (ustreasury?.length ?? 0) - 1 ? `1px solid ${t.border}` : "none" }}>
                    <span style={{ fontSize: 13, color: t.textSub }}>{b.term}</span>
                    <span style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 600, color: t.text, textAlign: "right" }}>{b.value}</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(b.change ?? ""), textAlign: "right" }}>
                      {b.trend === "up" ? "▲" : "▼"} {b.change ?? "---"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 日本国債 */}
          <Section id="日本国債" title="日本国債利回り" subtitle="JGB YIELDS" t={t}>
            {jptreasuryLoading ? (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted, letterSpacing: "0.1em" }}>LOADING...</span>
              </div>
            ) : jptreasuryError ? (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 13, color: t.negative }}>エラー: {jptreasuryError}</span>
              </div>
            ) : (
              <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 16px", borderBottom: `1px solid ${t.border}`, backgroundColor: t.surfaceAlt }}>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em" }}>期間</span>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", textAlign: "right" }}>利回り</span>
                  <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", textAlign: "right" }}>前日比</span>
                </div>
                {(jptreasury ?? []).map((b, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "14px 16px", borderBottom: i < (jptreasury?.length ?? 0) - 1 ? `1px solid ${t.border}` : "none" }}>
                    <span style={{ fontSize: 13, color: t.textSub }}>{b.term}</span>
                    <span style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 600, color: t.text, textAlign: "right" }}>{b.value}</span>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(b.change ?? ""), textAlign: "right" }}>
                      {b.trend === "up" ? "▲" : "▼"} {b.change ?? "---"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Section: コモディティ */}
        <Section id="コモディティ" title="コモディティ" subtitle="COMMODITIES" t={t}>
          {commoditiesLoading ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted, letterSpacing: "0.1em" }}>LOADING...</span>
            </div>
          ) : commoditiesError ? (
            <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
              <span style={{ fontSize: 13, color: t.negative }}>エラー: {commoditiesError}</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(commodities ?? []).map((c: any, i: number) => (
                <div key={i} style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{c.unit}</div>
                  <div style={{ fontSize: 14, color: t.textSub, marginBottom: 12 }}>{c.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>{c.value}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(c.change ?? "") }}>{c.change}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: changeColor(c.change ?? ""), opacity: 0.8 }}>({c.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${t.borderStrong}`, backgroundColor: t.surface, marginTop: 48 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 2, height: 14, backgroundColor: JADE.main }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: t.text, letterSpacing: "0.08em" }}>MACRO MARKETS</span>
              </div>
              <p style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.8, maxWidth: 480 }}>
                本サイトに掲載されている情報は、投資判断の参考を目的としたものであり、投資を勧誘するものではありません。
                掲載データは15〜20分遅延しており、情報の正確性・完全性を保証するものではありません。
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6, letterSpacing: "0.05em" }}>DATA SOURCES</div>
              {["Yahoo Finance", "ExchangeRate-API", "FRED API (Federal Reserve)", "日本銀行 API"].map((src, i) => (
                <div key={i} style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{src}</div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.textMuted }}>
            © 2024 MACRO MARKETS — All data delayed 15–20 minutes.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, title, subtitle, t, children }: {
  id: string;
  title: string;
  subtitle: string;
  t: typeof theme["dark"] | typeof theme["light"];
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${t.border}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: 0, letterSpacing: "0.03em" }}>{title}</h2>
        <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.12em" }}>{subtitle}</span>
      </div>
      {children}
    </section>
  );
}
