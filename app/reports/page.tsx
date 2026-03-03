import Link from "next/link";
import { getReportsByType, ReportType, ReportMeta } from "@/lib/reports";
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

function CurrentView({ report }: { report: ReportMeta }) {
  const { stance, stanceLabel, themes, scenarios } = report;
  if (stance == null && !themes && !scenarios) return null;

  const directionColor = (d: string) =>
    d === "up" ? "#3aaf8a" : d === "down" ? "#e05252" : "#888";
  const directionLabel = (d: string) =>
    d === "up" ? "↑" : d === "down" ? "↓" : "→";

  return (
    <div style={{ marginBottom: 48 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: JADE, fontWeight: 700, letterSpacing: "0.12em" }}>CURRENT VIEW</span>
          <span style={{ fontSize: 11, color: "#444" }}>·</span>
          <span style={{ fontSize: 11, color: "#555", letterSpacing: "0.04em" }}>{report.title}</span>
        </div>
        <Link href={`/reports/${report.slug}`} style={{ fontSize: 11, color: JADE, textDecoration: "none", letterSpacing: "0.06em" }}>
          詳細レポートを読む →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", gap: 1, background: "#1e1e1e", border: "1px solid #222" }}>

        {/* スタンス */}
        {stance != null && (
          <div style={{ background: "#141414", padding: "20px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>STANCE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e5e5e5", marginBottom: 16 }}>
              {stanceLabel ?? "—"}
            </div>
            {/* ゲージ */}
            <div style={{ position: "relative", height: 4, background: "#2a2a2a", marginBottom: 8 }}>
              <div style={{
                position: "absolute",
                left: 0,
                width: `${stance}%`,
                height: "100%",
                background: `linear-gradient(to right, ${JADE}, #e05252)`,
              }} />
              <div style={{
                position: "absolute",
                left: `${stance}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 8,
                height: 8,
                background: "#e5e5e5",
                borderRadius: "50%",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em" }}>RISK-ON</span>
              <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em" }}>RISK-OFF</span>
            </div>
            <div style={{ marginTop: 16, fontSize: 10, color: "#333", lineHeight: 1.6 }}>
              AIによる参考値。<br />投資助言ではありません。
            </div>
          </div>
        )}

        {/* テーマ */}
        {themes && themes.length > 0 && (
          <div style={{ background: "#141414", padding: "20px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>KEY THEMES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {themes.map((theme, i) => (
                <div key={i} style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5, paddingLeft: 0 }}>
                  {theme}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* シナリオ */}
        {scenarios && scenarios.length > 0 && (
          <div style={{ background: "#141414", padding: "20px 20px" }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.1em", marginBottom: 14 }}>SCENARIOS（AI推定・参考値）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scenarios.map((s, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: directionColor(s.direction), fontWeight: 700 }}>
                        {directionLabel(s.direction)}
                      </span>
                      <span style={{ fontSize: 12, color: s.base ? "#e5e5e5" : "#888" }}>
                        {s.label}
                        {s.base && <span style={{ fontSize: 10, color: JADE, marginLeft: 4 }}>BASE</span>}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>{s.probability}%</span>
                  </div>
                  <div style={{ height: 3, background: "#222" }}>
                    <div style={{
                      height: "100%",
                      width: `${s.probability}%`,
                      background: directionColor(s.direction),
                      opacity: s.base ? 1 : 0.5,
                    }} />
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

export default function ReportsPage() {
  const types: ReportType[] = ["monthly", "weekly", "daily"];
  const latestWeekly = getReportsByType("weekly")[0];

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#e5e5e5", fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#111", borderBottom: "1px solid #222" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 3, height: 20, background: JADE, flexShrink: 0 }} />
          <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#e5e5e5", textDecoration: "none" }}>
            翡翠眼
          </Link>
          <span style={{ color: "#444", fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: "#aaa", letterSpacing: "0.05em" }}>REPORTS</span>
        </div>
      </header>

      {/* ページタイトル */}
      <div style={{ borderBottom: `1px solid ${JADE}33`, background: "#141414", padding: "32px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.06em", margin: 0, color: "#e5e5e5", display: "flex", alignItems: "baseline", gap: 16 }}>
            REPORTS
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, letterSpacing: "0.04em" }}>
            月次・週次・日次のマクロ市場分析レポート
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>

        {/* CURRENT VIEW パネル */}
        {latestWeekly && <CurrentView report={latestWeekly} />}

        {/* レポート一覧 */}
        {types.map((type) => {
          const reports = getReportsByType(type);
          return (
            <section key={type} style={{ marginBottom: 56 }}>
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
