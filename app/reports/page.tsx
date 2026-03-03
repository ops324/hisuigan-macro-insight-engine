import Link from "next/link";
import { getReportsByType, ReportType } from "@/lib/reports";
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

export default function ReportsPage() {
  const types: ReportType[] = ["monthly", "weekly", "daily"];

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#e5e5e5", fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#111", borderBottom: "1px solid #222" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 3, height: 20, background: JADE, flexShrink: 0 }} />
          <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#e5e5e5", textDecoration: "none" }}>
            MACRO MARKETS
          </Link>
          <span style={{ color: "#444", fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: "#aaa", letterSpacing: "0.05em" }}>REPORTS</span>
        </div>
      </header>

      {/* ページタイトル */}
      <div style={{ borderBottom: `1px solid ${JADE}33`, background: "#141414", padding: "32px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.06em", margin: 0, color: "#e5e5e5", display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 28, color: JADE, letterSpacing: "0.08em" }}>翡翠眼</span>
            REPORTS
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, letterSpacing: "0.04em" }}>
            月次・週次・日次のマクロ市場分析レポート
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        {types.map((type) => {
          const reports = getReportsByType(type);
          return (
            <section key={type} style={{ marginBottom: 56 }}>
              {/* セクションヘッダー */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #222" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#e5e5e5", letterSpacing: "0.04em" }}>
                  {TYPE_LABELS[type]}
                </h2>
                <span style={{ fontSize: 11, color: JADE, letterSpacing: "0.1em" }}>
                  {TYPE_SUBTITLES[type]}
                </span>
              </div>

              {reports.length === 0 ? (
                <p style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>レポートはまだありません。</p>
              ) : (
                <div style={{ display: "grid", gap: 1, background: "#1a1a1a", border: "1px solid #222" }}>
                  {reports.map((r) => (
                    <ReportCard key={r.slug} report={r} />
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
