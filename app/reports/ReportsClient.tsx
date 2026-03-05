"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ReportMeta, ReportType, ScenarioItem } from "@/lib/reports";
import { themeMap, ThemeMode } from "@/lib/theme";
import { ReportCard } from "./ReportCard";

const JADE = "#2d8c6e";

const TYPE_LABELS: Record<ReportType, string> = {
  monthly: "月次",
  weekly:  "週次",
  daily:   "日次",
};

const TYPE_SUBTITLES: Record<ReportType, string> = {
  monthly: "PORTFOLIO HEALTH CHECK",
  weekly:  "ENVIRONMENT LOG",
  daily:   "CONSCIOUSNESS LOG",
};

function directionColor(d: string) {
  return d === "up" ? "#3aaf8a" : d === "down" ? "#e05252" : "#888";
}
function directionLabel(d: string) {
  return d === "up" ? "↑" : d === "down" ? "↓" : "→";
}

function CurrentView({ report, t }: { report: ReportMeta; t: typeof themeMap["dark"] | typeof themeMap["light"] }) {
  const { stance, stanceLabel, themes, scenarios } = report;
  if (stance == null && !themes && !scenarios) return null;

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="hg-cv-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: JADE, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>カレントビュー</span>
          <span className="hg-cv-header-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
            <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em" }}>{report.title}</span>
          </span>
        </div>
        <Link href={`/reports/${report.slug}`} style={{ fontSize: 11, color: JADE, textDecoration: "none", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
          詳細レポートを読む →
        </Link>
      </div>

      <div className="hg-cv-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
        {/* スタンス */}
        {stance != null && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 4 }}>スタンス</div>
            <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.06em", marginBottom: 10 }}>中長期目線</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 16 }}>{stanceLabel ?? "—"}</div>
            <div style={{ position: "relative", height: 4, background: t.borderStrong, marginBottom: 8 }}>
              <div style={{ position: "absolute", left: 0, width: `${stance}%`, height: "100%", background: `linear-gradient(to right, ${JADE}, #e05252)` }} />
              <div style={{ position: "absolute", left: `${stance}%`, top: "50%", transform: "translate(-50%, -50%)", width: 8, height: 8, background: t.text, borderRadius: "50%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.06em" }}>RISK-ON</span>
              <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.06em" }}>RISK-OFF</span>
            </div>
            <div style={{ marginTop: 16, fontSize: 10, color: t.textMuted, lineHeight: 1.6 }}>
              AI（翡翠眼）による参考値。<br />投資助言ではありません。
            </div>
          </div>
        )}

        {/* テーマ */}
        {themes && themes.length > 0 && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 14 }}>市況概要</div>
            {report.marketOverview && (
              <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.8, margin: "0 0 14px", borderBottom: `1px solid ${t.borderStrong}`, paddingBottom: 12 }}>
                {report.marketOverview}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {themes.map((theme, i) => (
                <div key={i} style={{ fontSize: 13, color: t.textSub, lineHeight: 1.5 }}>{theme}</div>
              ))}
            </div>
          </div>
        )}

        {/* シナリオ */}
        {scenarios && scenarios.length > 0 && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", marginBottom: 14 }}>予測シナリオ（翡翠眼 AI推定・参考値）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(scenarios as ScenarioItem[]).map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: directionColor(s.direction), fontWeight: 700 }}>{directionLabel(s.direction)}</span>
                      <span style={{ fontSize: 12, color: s.base ? t.text : t.textSub }}>
                        {s.label}
                        {s.base && <span style={{ fontSize: 10, color: JADE, marginLeft: 4 }}>BASE</span>}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "monospace" }}>{s.probability}%</span>
                  </div>
                  <div style={{ height: 3, background: t.borderStrong }}>
                    <div style={{ height: "100%", width: `${s.probability}%`, background: directionColor(s.direction), opacity: s.base ? 1 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  latestWeekly?: ReportMeta;
  latestDaily?: ReportMeta;
  reportsByType: Record<ReportType, ReportMeta[]>;
}

export default function ReportsClient({ latestWeekly, latestDaily, reportsByType }: Props) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const t = themeMap[mode];

  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeMode | null;
    if (saved === "light" || saved === "dark") setMode(saved);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("theme", next);
  };

  const types: ReportType[] = ["monthly", "weekly", "daily"];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 3, height: 20, background: JADE, flexShrink: 0 }} />
          <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>
            翡翠眼
          </Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: t.textSub, letterSpacing: "0.05em" }}>レポート</span>
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={toggleTheme}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 12, letterSpacing: "0.04em" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* ページタイトル */}
      <div style={{ borderBottom: `1px solid ${JADE}33`, background: t.surface, padding: "32px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.06em", margin: 0, color: t.text }}>
            レポート
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 8, letterSpacing: "0.04em" }}>
            月次・週次・日次のマクロ市場分析レポート
          </p>
        </div>
      </div>

      {/* Quote Banner */}
      {latestWeekly?.quote && (
        <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 2, height: 36, background: JADE, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, color: t.textSub, fontStyle: "italic", margin: "0 0 4px", lineHeight: 1.6 }}>
                &ldquo;{latestWeekly.quote}&rdquo;
              </p>
              {latestWeekly.quoteAuthor && (
                <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em" }}>— {latestWeekly.quoteAuthor}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        {latestWeekly && <CurrentView report={latestWeekly} t={t} />}

        {/* 現状解説（最新日次レポートより） */}
        {latestDaily?.description && (
          <div style={{ marginBottom: 48, borderLeft: `2px solid ${JADE}44`, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: JADE, letterSpacing: "0.1em", fontWeight: 700 }}>DAILY BRIEF</span>
              <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
              <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em" }}>{latestDaily.date}</span>
            </div>
            <p style={{ fontSize: 13, color: t.textMuted, margin: 0, lineHeight: 1.8 }}>
              {latestDaily.description}
            </p>
            <Link href={`/reports/${latestDaily.slug}`} style={{ fontSize: 11, color: JADE, textDecoration: "none", letterSpacing: "0.04em", display: "inline-block", marginTop: 8 }}>
              詳細を読む →
            </Link>
          </div>
        )}

        {types.map((type) => {
          const reports = reportsByType[type] ?? [];
          return (
            <section key={type} style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${t.border}` }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.text, letterSpacing: "0.04em" }}>
                  {TYPE_LABELS[type]}
                </h2>
                <span style={{ fontSize: 11, color: JADE, letterSpacing: "0.1em" }}>
                  {TYPE_SUBTITLES[type]}
                </span>
              </div>
              {reports.length === 0 ? (
                <p style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>レポートはまだありません。</p>
              ) : (
                <div style={{ display: "grid", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
                  {(type === "daily" ? reports.slice(0, 1) : reports).map((r) => (
                    <ReportCard key={r.slug} report={r} t={t} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
