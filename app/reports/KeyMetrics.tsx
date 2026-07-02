"use client";
import { KeyMetricItem } from "@/lib/reports";
import { MetricsHistory } from "@/lib/history";
import { Theme } from "@/lib/theme";
import { directionColor, directionLabel, changeDisplay, metricGroup } from "@/lib/metrics";
import { Sparkline } from "./Sparkline";

export function KeyMetrics({ items, asOf, metricsHistory, t }: {
  items: KeyMetricItem[];
  asOf: string;
  metricsHistory?: MetricsHistory;
  t: Theme;
}) {
  const groups = items.map((m) => metricGroup(m.label));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
        <span style={{ fontSize: 11, color: t.positive, letterSpacing: "0.12em", fontWeight: 700, opacity: 0.85, whiteSpace: "nowrap" }}>主要指標</span>
        <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>前週比 · {asOf} 時点</span>
      </div>
      <div
        className="hg-cv-metrics"
        style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 1, background: t.border, border: `1px solid ${t.border}` }}
      >
        {items.map((m, i) => {
          const dir = m.direction ?? "flat";
          const dc = directionColor(dir);
          const cd = changeDisplay(m.value, m.change);
          const isGroupStart = i === 0 || groups[i] !== groups[i - 1];
          const hist = metricsHistory?.[m.label]?.slice(-16);
          const tipRight = i >= items.length - 2;
          let tipPrimary = `${m.value}（${asOf} 時点）`;
          let tipRange = "";
          if (hist && hist.length) {
            const lastPt = hist[hist.length - 1];
            tipPrimary = `${lastPt.displayValue}（${lastPt.date}）`;
            if (hist.length >= 2) {
              const hv = hist.map((p) => p.numericValue);
              const lo = hist[hv.indexOf(Math.min(...hv))].displayValue;
              const hi = hist[hv.indexOf(Math.max(...hv))].displayValue;
              tipRange = `直近${hist.length}週: ${lo} 〜 ${hi}`;
            }
          }
          const hasChart = hist && hist.length >= 2;
          return (
            <div key={i} className="hg-metric-cell" style={{ position: "relative", background: t.surface, padding: hasChart ? "12px 15px 0 15px" : "12px 15px" }}>
              {/* 資産クラス eyebrow（高さ・行間を固定し、有無でセル中身がズレないようにする） */}
              <div style={{ height: 13, lineHeight: "13px", marginBottom: 5 }}>
                {isGroupStart && (
                  <span style={{ fontSize: 9, color: t.positive, letterSpacing: "0.14em", fontWeight: 700, opacity: 0.7, textTransform: "uppercase", lineHeight: "13px", display: "inline-block", verticalAlign: "top" }}>{groups[i]}</span>
                )}
              </div>
              {/* 指標名（左）＋ 価格・変化（右） */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: hasChart ? 10 : 0 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: t.textMuted, letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>
                  {m.label}
                </span>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: "monospace", letterSpacing: "-0.01em", lineHeight: 1 }}>
                    {m.value}
                  </div>
                  <div style={{ minHeight: 21, marginTop: 5, display: "flex", justifyContent: "flex-end" }}>
                    {cd && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 6px", background: `${dc}1a`, color: dc,
                        fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.3,
                      }}>
                        <span style={{ fontSize: 8 }}>{directionLabel(dir)}</span>{cd}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* スパークライン — セル全幅・下部フラッシュ */}
              {hasChart && (
                <div style={{ marginLeft: -15, marginRight: -15 }}>
                  <Sparkline points={hist!} color={t.positive} downColor={t.negative} />
                </div>
              )}
              {/* ホバーツールチップ */}
              <div
                className="hg-metric-tip"
                style={{
                  position: "absolute", top: "calc(100% + 6px)", zIndex: 30,
                  ...(tipRight ? { right: 0 } : { left: 0 }),
                  background: t.headerBg, border: `1px solid ${t.borderStrong}`,
                  padding: "8px 10px", minWidth: 150, whiteSpace: "nowrap",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                }}
              >
                <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em", marginBottom: 3 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: t.text, fontFamily: "monospace", fontWeight: 700 }}>{tipPrimary}</div>
                {tipRange && <div style={{ fontSize: 10, color: t.textMuted, fontFamily: "monospace", marginTop: 4 }}>{tipRange}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
