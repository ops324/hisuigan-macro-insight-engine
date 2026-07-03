"use client";
import Link from "next/link";
import { Theme } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";
import { StockItem, ForexItem, TreasuryItem, CommodityItem } from "@/lib/market-data";

export interface SectionState<T> {
  data: T[] | null;
  error: string | null;
}

interface Props {
  stocks: SectionState<StockItem>;
  forex: SectionState<ForexItem>;
  ustreasury: SectionState<TreasuryItem>;
  jptreasury: SectionState<TreasuryItem>;
  commodities: SectionState<CommodityItem>;
  updatedAt: string | null;
}

export default function MarketClient({ stocks, forex, ustreasury, jptreasury, commodities, updatedAt }: Props) {
  const { mode, t, toggleTheme } = useTheme();

  const lastUpdated = updatedAt
    ? new Date(updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false }).replace(/\//g, "-") + " JST"
    : "---";

  const isPositive = (val: string) => !val.startsWith("-");
  const changeColor = (val: string) => (isPositive(val) ? t.positive : t.negative);

  return (
    <div style={{ backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 3, height: 22, background: t.positive, flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-serif-jp)", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: t.text }}>翡翠眼</span>
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <div className="hg-nav-sections" style={{ display: "flex" }}>
              {["株式", "為替", "米国債", "日本国債", "コモディティ"].map((label, i) => (
                <a key={i} href={`#${label}`} className="hg-nav-link" style={{ fontSize: 12, color: t.textSub, padding: "8px 14px", textDecoration: "none", letterSpacing: "0.05em", borderLeft: i === 0 ? `1px solid ${t.border}` : "none", borderRight: `1px solid ${t.border}` }}>
                  {label}
                </a>
              ))}
            </div>
            <Link href="/reports" className="hg-nav-link" style={{ fontSize: 12, color: t.positive, padding: "8px 14px", textDecoration: "none", letterSpacing: "0.05em", borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}` }}>
              レポート
            </Link>
            <button
              onClick={toggleTheme}
              aria-label={`テーマ切替（現在: ${mode === "dark" ? "ダーク" : "ライト"}）`}
              aria-pressed={mode === "dark"}
              style={{ marginLeft: 16, padding: "4px 11px", fontSize: 11, backgroundColor: "transparent", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", letterSpacing: "0.06em", borderRadius: 2, transition: "border-color 0.15s, color 0.15s" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </nav>
        </div>
      </header>

      {/* Status Bar */}
      <div style={{ backgroundColor: t.surfaceAlt, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "5px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="hg-status-text" style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.06em" }}>MARKET DATA — 株式指数・債券・WTIは日次値／為替・金銀銅は準リアルタイム | 投資判断の根拠とする場合は一次情報をご確認ください</span>
          <span style={{ fontSize: 11, color: t.textSub, fontFamily: "monospace" }}>最終更新：{lastUpdated}</span>
        </div>
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Section: 株式 */}
        <Section id="株式" title="株式指数" subtitle="EQUITY INDICES" note="前日終値比（約1営業日遅延）" t={t}>
          {stocks.error ? (
            <ErrorBox message={stocks.error} t={t} />
          ) : (
            <div className="hg-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(stocks.data ?? []).map((s, i) => (
                <div key={i} className="hg-data-card" style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 8 }}>{s.symbol}</div>
                  <div style={{ fontSize: 13, color: t.textSub, marginBottom: 12 }}>{s.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>{s.value ?? "---"}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(s.change ?? "") }}>{s.change ?? "---"}</span>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: changeColor(s.change ?? ""), opacity: 0.8 }}>{s.pct ? `(${s.pct})` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section: 為替 */}
        <Section id="為替" title="為替レート" subtitle="FOREIGN EXCHANGE" t={t}>
          {forex.error ? (
            <ErrorBox message={forex.error} t={t} />
          ) : (
            <div className="hg-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(forex.data ?? []).map((f, i) => (
                <div key={i} className="hg-data-card" style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 12 }}>{f.pair}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>
                    {f.value ?? "---"}
                  </div>
                  <div>
                    <span className="hg-data-note" style={{ fontSize: 11, color: t.textMuted }}>前日比データなし（無料版）</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section: 債券 2列 */}
        <div className="hg-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* 米国債 */}
          <Section id="米国債" title="米国債利回り" subtitle="US TREASURY YIELDS" t={t}>
            {ustreasury.error ? (
              <ErrorBox message={ustreasury.error} t={t} pad="32px 16px" />
            ) : (
              <TreasuryTable rows={ustreasury.data ?? []} t={t} />
            )}
          </Section>

          {/* 日本国債 */}
          <Section id="日本国債" title="日本国債利回り" subtitle="JGB YIELDS" t={t}>
            {jptreasury.error ? (
              <ErrorBox message={jptreasury.error} t={t} pad="32px 16px" />
            ) : (
              <TreasuryTable rows={jptreasury.data ?? []} t={t} />
            )}
          </Section>
        </div>

        {/* Section: コモディティ */}
        <Section id="コモディティ" title="コモディティ" subtitle="COMMODITIES" note="金・銀・銅はスポット／WTIは前日比（数営業日遅延）" t={t}>
          {commodities.error ? (
            <ErrorBox message={commodities.error} t={t} />
          ) : (
            <div className="hg-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, backgroundColor: t.border }}>
              {(commodities.data ?? []).map((c, i) => (
                <div key={i} className="hg-data-card" style={{ backgroundColor: t.surface, padding: "20px 24px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>{c.unit}</div>
                  <div style={{ fontSize: 14, color: t.textSub, marginBottom: 12 }}>{c.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "monospace", letterSpacing: "-0.02em", color: t.text, marginBottom: 8 }}>{c.value ?? "---"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {c.change ? (
                      <>
                        <span style={{ fontSize: 13, fontFamily: "monospace", color: changeColor(c.change) }}>{c.change}</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: changeColor(c.change), opacity: 0.8 }}>{c.pct ? `(${c.pct})` : ""}</span>
                      </>
                    ) : c.value ? (
                      <span className="hg-data-note" style={{ fontSize: 11, color: t.textMuted }}>前日比データなし</span>
                    ) : (
                      <span style={{ fontSize: 13, fontFamily: "monospace", color: t.textMuted }}>---</span>
                    )}
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
          <div className="hg-footer-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, height: 16, background: t.positive, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-serif-jp)", fontSize: 16, fontWeight: 700, color: t.text, letterSpacing: "0.08em" }}>翡翠眼</span>
              </div>
              <p style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.8, maxWidth: 480 }}>
                本サイトに掲載されている情報は、投資判断の参考を目的としたものであり、投資を勧誘するものではありません。
                掲載データは終値ベースまたは遅延データであり、情報の正確性・完全性を保証するものではありません。
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6, letterSpacing: "0.05em" }}>DATA SOURCES</div>
              {["FRED API (Federal Reserve)", "gold-api.com", "ExchangeRate-API", "財務省 (MOF)"].map((src, i) => (
                <div key={i} style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{src}</div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.textMuted }}>
            © 2026 翡翠眼 — Data is end-of-day or delayed.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ErrorBox({ message, t, pad = "32px 24px" }: { message: string; t: Theme; pad?: string }) {
  return (
    <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}`, padding: pad, textAlign: "center" }}>
      <span style={{ fontSize: 13, color: t.negative }}>エラー: {message}</span>
    </div>
  );
}

// semantic な <table>（スクリーンリーダー対応）。見た目は旧 div グリッドと同一に保つ。
// th はブラウザ既定が bold/center のため fontWeight / textAlign を明示。
function TreasuryTable({ rows, t }: { rows: TreasuryItem[]; t: Theme }) {
  const thBase = { fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", fontWeight: 400, padding: "10px 16px", width: "33.33%" } as const;
  return (
    <div style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ backgroundColor: t.surfaceAlt }}>
            <th scope="col" style={{ ...thBase, textAlign: "left", borderBottom: `1px solid ${t.border}` }}>期間</th>
            <th scope="col" style={{ ...thBase, textAlign: "right", borderBottom: `1px solid ${t.border}` }}>利回り</th>
            <th scope="col" style={{ ...thBase, textAlign: "right", borderBottom: `1px solid ${t.border}` }}>前日比</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => {
            const tdBorder = i < rows.length - 1 ? `1px solid ${t.border}` : "none";
            return (
              <tr key={i} className="hg-treasury-row">
                <td style={{ fontSize: 13, color: t.textSub, padding: "14px 16px", borderBottom: tdBorder }}>{b.term}</td>
                <td style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 600, color: t.text, textAlign: "right", padding: "14px 16px", borderBottom: tdBorder }}>{b.value ?? "---"}</td>
                <td style={{ fontSize: 13, fontFamily: "monospace", color: b.change && b.change.startsWith("-") ? t.negative : t.positive, textAlign: "right", padding: "14px 16px", borderBottom: tdBorder }}>
                  {b.trend === "up" ? "▲" : b.trend === "down" ? "▼" : ""} {b.change ?? "---"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Section({ id, title, subtitle, note, t, children }: {
  id: string;
  title: string;
  subtitle: string;
  note?: string;
  t: Theme;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ width: 2, height: 14, backgroundColor: t.positive, flexShrink: 0 }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, margin: 0, letterSpacing: "0.04em" }}>{title}</h2>
        <span style={{ fontFamily: "var(--font-serif-en)", fontStyle: "italic", fontSize: 12, color: t.textMuted, letterSpacing: "0.04em" }}>{subtitle}</span>
        {note && (
          <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em", marginLeft: "auto" }}>※{note}</span>
        )}
      </div>
      {children}
    </section>
  );
}
