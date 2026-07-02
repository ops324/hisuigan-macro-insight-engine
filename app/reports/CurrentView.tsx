"use client";
import Link from "next/link";
import { ReportMeta } from "@/lib/reports";
import { MetricsHistory } from "@/lib/history";
import { Theme } from "@/lib/theme";
import { directionColor, directionLabel } from "@/lib/metrics";
import { AllocationDonut, SECTOR_COLORS } from "./AllocationDonut";
import { KeyMetrics } from "./KeyMetrics";
import { RegimePanel } from "./RegimePanel";

// テーマ文字列先頭の信号絵文字を無発光スウォッチへ変換（frontmatter は不変・表示層のみ）
const THEME_SWATCH: Record<string, string> = {
  "🔴": "#b5544a", "🟠": "#c0894d", "🟡": "#b9a35f",
  "🟢": "#5f8c70", "🔵": "#5b7f9c", "🟣": "#8a7d8f",
};
function parseTheme(theme: string): { color: string | null; text: string } {
  const trimmed = theme.trimStart();
  const first = [...trimmed][0];
  if (first && THEME_SWATCH[first]) {
    return { color: THEME_SWATCH[first], text: trimmed.slice(first.length).trimStart() };
  }
  return { color: null, text: theme };
}

export function CurrentView({ report, metricsHistory, t }: { report: ReportMeta; metricsHistory?: MetricsHistory; t: Theme }) {
  const { stance, stancePrev, stanceLabel, stanceRationale, themes, scenarios, allocation, keyMetrics, regime } = report;
  if (stance == null && !themes && !scenarios) return null;

  const delta = stance != null && stancePrev != null ? stance - stancePrev : null;
  const deltaColor = delta == null ? t.textMuted : delta > 0 ? "#b08a4a" : delta < 0 ? t.positive : t.textMuted;
  const deltaArrow = delta == null ? "" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaText = delta == null ? "" : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="hg-cv-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: t.positive, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>カレントビュー</span>
          <span style={{ fontSize: 10, color: t.textSub, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>月次・週次・日次統合 · 中長期視点</span>
          <span className="hg-cv-header-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
            <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em" }}>{report.title}</span>
          </span>
        </div>
        <Link href={`/reports/${report.slug}`} style={{ fontSize: 11, color: t.positive, textDecoration: "none", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
          詳細レポートを読む →
        </Link>
      </div>

      {keyMetrics && keyMetrics.length > 0 && (
        <KeyMetrics items={keyMetrics} asOf={report.date} metricsHistory={metricsHistory} t={t} />
      )}

      {regime && <RegimePanel regime={regime} t={t} />}

      <div className="hg-cv-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
        {/* スタンス */}
        {stance != null && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.positive, letterSpacing: "0.12em", marginBottom: 2, opacity: 0.85 }}>スタンス</div>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>中長期目線</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 18, letterSpacing: "-0.01em" }}>{stanceLabel ?? "—"}</div>
            <div style={{ position: "relative", height: 3, background: t.border, marginBottom: 8 }}>
              <div style={{ position: "absolute", left: 0, width: `${stance}%`, height: "100%", background: t.textSub }} />
              {stancePrev != null && (
                <div style={{ position: "absolute", left: `${stancePrev}%`, top: "50%", transform: "translate(-50%, -50%)", width: 7, height: 7, borderRadius: "50%", background: t.surface, border: `1.5px solid ${t.textMuted}`, boxSizing: "border-box" }} />
              )}
              <div style={{ position: "absolute", left: `${stance}%`, top: "50%", transform: "translate(-50%, -50%)", width: 7, height: 7, background: t.text, borderRadius: "50%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: delta != null ? 10 : 16 }}>
              <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.08em" }}>RISK-ON</span>
              <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.08em" }}>RISK-OFF</span>
            </div>
            {delta != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em" }}>前回比</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: deltaColor, letterSpacing: "0.02em" }}>{deltaArrow} {deltaText}</span>
                <span style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.04em", marginLeft: "auto", fontFamily: "monospace" }}>前回 {stancePrev}</span>
              </div>
            )}
            {stanceRationale && (
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: t.positive, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 7, opacity: 0.85 }}>判断根拠</div>
                <p style={{ fontSize: 11, color: t.textSub, lineHeight: 1.8, margin: 0, letterSpacing: "0.02em", borderLeft: `2px solid ${t.positive}66`, paddingLeft: 10 }}>
                  {stanceRationale}
                </p>
              </div>
            )}
            <div style={{ fontSize: 11, color: t.textSub, lineHeight: 1.7, borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
              AI（翡翠眼）による参考値。<br />投資助言ではありません。
            </div>
          </div>
        )}

        {/* テーマ */}
        {themes && themes.length > 0 && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.positive, letterSpacing: "0.12em", marginBottom: 14, opacity: 0.85 }}>市況概要</div>
            {report.marketOverview && (
              <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.85, margin: "0 0 16px", borderBottom: `1px solid ${t.border}`, paddingBottom: 14 }}>
                {report.marketOverview}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {themes.map((theme, i) => {
                const { color, text } = parseTheme(theme);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: t.textSub, lineHeight: 1.6, paddingBottom: 9, borderBottom: i < themes.length - 1 ? `1px solid ${t.border}` : "none" }}>
                    {color && <span style={{ width: 7, height: 7, background: color, flexShrink: 0, marginTop: 6 }} />}
                    <span style={{ flex: 1 }}>{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* シナリオ */}
        {scenarios && scenarios.length > 0 && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: t.positive, letterSpacing: "0.1em", marginBottom: 14, opacity: 0.85 }}>予測シナリオ（AI推定・参考値）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scenarios.map((s, i) => (
                <div key={i} style={{ paddingBottom: 12, borderBottom: i < scenarios.length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: directionColor(s.direction), fontWeight: 700 }}>{directionLabel(s.direction)}</span>
                      <span style={{ fontSize: 12, color: s.base ? t.text : t.textSub, fontWeight: s.base ? 600 : 400 }}>
                        {s.label}
                        {s.base && <span style={{ fontSize: 9, color: t.positive, marginLeft: 5, letterSpacing: "0.1em", fontWeight: 700 }}>BASE</span>}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: t.textSub, fontFamily: "monospace", fontWeight: 600 }}>{s.probability}%</span>
                  </div>
                  <div style={{ height: 3, background: t.border }}>
                    <div style={{ height: "100%", width: `${s.probability}%`, background: directionColor(s.direction), opacity: s.base ? 1 : 0.55 }} />
                  </div>
                  {s.rationale && (
                    <p style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.75, margin: "8px 0 0", letterSpacing: "0.02em" }}>
                      {s.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 参考資産配分モデル */}
      {allocation && allocation.length > 0 && (
        <div style={{ marginTop: 1, background: t.surface, borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
            <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>参考資産配分モデル（AI推定・参考値）</span>
            <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em", whiteSpace: "nowrap", flexShrink: 0 }}>投資助言ではありません</span>
          </div>
          {report.allocationNote && (
            <p style={{ fontSize: 12, color: t.textSub, margin: "0 0 20px", lineHeight: 1.85, letterSpacing: "0.02em", borderLeft: `2px solid ${t.positive}66`, paddingLeft: 12 }}>
              {report.allocationNote}
            </p>
          )}
          <AllocationDonut items={allocation} t={t} />
        </div>
      )}

      {/* 注目セクター */}
      {report.sectors && report.sectors.length > 0 && (
        <div style={{ marginTop: 1, background: t.surface, borderLeft: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, borderTop: allocation && allocation.length > 0 ? "none" : `1px solid ${t.border}`, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
            <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>注目セクター（AI推定・参考値）</span>
            <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em", whiteSpace: "nowrap", flexShrink: 0 }}>投資助言ではありません</span>
          </div>
          {report.sectorsNote && (
            <p style={{ fontSize: 12, color: t.textSub, margin: "0 0 20px", lineHeight: 1.85, letterSpacing: "0.02em", borderLeft: `2px solid ${t.positive}66`, paddingLeft: 12 }}>
              {report.sectorsNote}
            </p>
          )}
          <AllocationDonut items={report.sectors} t={t} colors={SECTOR_COLORS} />
        </div>
      )}
    </div>
  );
}
