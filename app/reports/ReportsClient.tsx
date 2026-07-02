"use client";
import Link from "next/link";
import { ReportMeta, ReportType } from "@/lib/reports";
import { MetricsHistory } from "@/lib/history";
import { useTheme } from "@/lib/useTheme";
import { ReportCard } from "./ReportCard";
import { CurrentView } from "./CurrentView";

const TYPE_LABELS: Record<ReportType, string> = {
  monthly: "月次",
  weekly:  "週次",
  daily:   "日次",
};

// 抑制トーンの和文サブタイトル（旧 CONSCIOUSNESS LOG 等の不自然な英語を置換）
const TYPE_SUBTITLES: Record<ReportType, string> = {
  monthly: "中長期の俯瞰",
  weekly:  "市場環境の記録",
  daily:   "日々の動向",
};

interface Props {
  latestWeekly?: ReportMeta;
  latestDaily?: ReportMeta;
  reportsByType: Record<ReportType, ReportMeta[]>;
  metricsHistory?: MetricsHistory;
}

export default function ReportsClient({ latestWeekly, latestDaily, reportsByType, metricsHistory }: Props) {
  const { mode, t, toggleTheme } = useTheme();

  const types: ReportType[] = ["monthly", "weekly", "daily"];

  // フラットな紙面（放射グロー廃止）
  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, height: 56 }}>
          <div style={{ width: 3, height: 22, background: t.positive, flexShrink: 0 }} />
          <Link href="/reports" style={{ fontFamily: "var(--font-serif-jp)", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>
            翡翠眼
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/market" className="hg-nav-link" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.05em" }}>
              マーケット
            </Link>
            <button
              onClick={toggleTheme}
              aria-label={`テーマ切替（現在: ${mode === "dark" ? "ダーク" : "ライト"}）`}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 11, letterSpacing: "0.06em", borderRadius: 2, transition: "border-color 0.15s, color 0.15s" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* ページタイトル（マストヘッド） */}
      <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface, padding: "52px 0 44px" }}>
        <div className="hg-reveal" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ width: 3, height: 46, background: t.positive, flexShrink: 0 }} />
            <h1 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 44, fontWeight: 700, letterSpacing: "0.05em", margin: 0, color: t.text, lineHeight: 1 }}>
              レポート
            </h1>
          </div>
          <p style={{ fontSize: 13, color: t.textSub, margin: 0, letterSpacing: "0.06em", paddingLeft: 19 }}>
            月次・週次・日次のマクロ市場分析レポート
          </p>
        </div>
      </div>

      {/* Quote Banner — エディトリアルなプルクオート */}
      {latestWeekly?.quote && (
        <div style={{ borderBottom: `1px solid ${t.border}`, background: t.bg }}>
          <div className="hg-reveal" style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 24px", display: "flex", alignItems: "flex-start", gap: 18, animationDelay: "0.08s" }}>
            <span className="hg-quote-mark" aria-hidden style={{ fontSize: 56, color: t.positive, opacity: 0.28, marginTop: -6, flexShrink: 0 }}>&ldquo;</span>
            <div style={{ paddingTop: 4 }}>
              <p style={{ fontFamily: "var(--font-serif-jp)", fontSize: 21, fontWeight: 600, color: t.text, margin: "0 0 8px", lineHeight: 1.65, letterSpacing: "0.04em" }}>
                {latestWeekly.quote}
              </p>
              {latestWeekly.quoteAuthor && (
                <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>— {latestWeekly.quoteAuthor}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        {latestWeekly && (
          <div className="hg-reveal" style={{ animationDelay: "0.16s" }}>
            <CurrentView report={latestWeekly} metricsHistory={metricsHistory} t={t} />
          </div>
        )}

        {/* 現状解説（最新日次レポートより） */}
        {latestDaily?.description && (
          <div style={{ marginBottom: 48, borderLeft: `2px solid ${t.positive}44`, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: t.positive, letterSpacing: "0.1em", fontWeight: 700 }}>DAILY BRIEF</span>
              <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
              <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em" }}>{latestDaily.date}</span>
            </div>
            <p style={{ fontSize: 13, color: t.textSub, margin: 0, lineHeight: 1.85 }}>
              {latestDaily.description}
            </p>
            <Link href={`/reports/${latestDaily.slug}`} style={{ fontSize: 11, color: t.positive, textDecoration: "none", letterSpacing: "0.04em", display: "inline-block", marginTop: 8 }}>
              詳細を読む →
            </Link>
          </div>
        )}

        {/* 予測ログリンク */}
        <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 1, background: t.border }} />
          <Link href="/reports/track-record" style={{ fontSize: 12, color: t.positive, textDecoration: "none", letterSpacing: "0.06em", whiteSpace: "nowrap", border: `1px solid ${t.positive}55`, padding: "6px 14px" }}>
            予測ログ（ベースシナリオ vs 実績）→
          </Link>
          <div style={{ flex: 1, height: 1, background: t.border }} />
        </div>

        {types.map((type) => {
          const reports = reportsByType[type] ?? [];
          return (
            <section key={type} style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
                <div style={{ width: 3, height: 18, background: `linear-gradient(${t.positive}, ${t.positive})`, flexShrink: 0 }} />
                <h2 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 19, fontWeight: 700, margin: 0, color: t.text, letterSpacing: "0.08em" }}>
                  {TYPE_LABELS[type]}
                </h2>
                <span style={{ fontSize: 10, color: t.positive, letterSpacing: "0.12em", opacity: 0.75 }}>
                  {TYPE_SUBTITLES[type]}
                </span>
              </div>
              {reports.length === 0 ? (
                <p style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>レポートはまだありません。</p>
              ) : (
                <div style={{ display: "grid", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
                  {reports.slice(0, 1).map((r) => (
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
