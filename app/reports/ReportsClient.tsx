"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ReportMeta, ReportType, ScenarioItem, AllocationItem, KeyMetricItem, RegimeInfo } from "@/lib/reports";
import { MetricsHistory, MetricPoint } from "@/lib/history";
import { themeMap } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";
import { directionColor, directionLabel, changeDisplay, metricGroup } from "@/lib/metrics";
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

// 翡翠・琥珀・鋼青・菫・浅翡翠・銀 — 上品で運気を高める配色
const ALLOC_COLORS = ["#2d8c6e", "#c4963a", "#6b96b8", "#a87db5", "#74c4ad", "#a0a0a0"];
// 群青・黄金・翠・朱・藤紫・銀 — セクター用配色
const SECTOR_COLORS = ["#3a7bd5", "#d4a843", "#5ba88c", "#c75b5b", "#8b6baf", "#a0a0a0"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, endDeg);
  const i2 = polarToCartesian(cx, cy, innerR, endDeg);
  const i1 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y} Z`;
}

function AllocationDonut({ items, t, colors = ALLOC_COLORS }: { items: AllocationItem[]; t: typeof themeMap["dark"] | typeof themeMap["light"]; colors?: string[] }) {
  // SSR/ハイドレーション時は false、クライアントマウント後に true（Math.cos/sin 由来の浮動小数ミスマッチ回避）
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const size = 168;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.30; // リング幅16%：より存在感のある太さ
  const gap = 2.5;
  const offsets = items.reduce<number[]>((acc, item) => {
    acc.push((acc[acc.length - 1] ?? 0) + item.percent);
    return acc;
  }, []);
  const segments = items.map((item, i) => {
    const cumStart = offsets[i] - item.percent;
    const start = (cumStart / 100) * 360 + gap / 2;
    const end = (offsets[i] / 100) * 360 - gap / 2;
    return { item, start, end, color: colors[i % colors.length] };
  });
  const donutSvg = mounted ? (
    <svg
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0, filter: "drop-shadow(0 6px 22px rgba(45,140,110,0.34))" }}
    >
      <circle
        cx={cx} cy={cy}
        r={(outerR + innerR) / 2}
        fill="none"
        stroke={t.borderStrong}
        strokeWidth={outerR - innerR}
        opacity={0.45}
      />
      {segments.map((seg, i) => (
        <path key={i} d={donutSegmentPath(cx, cy, outerR, innerR, seg.start, seg.end)} fill={seg.color} />
      ))}
      <circle cx={cx} cy={cy} r={innerR + 0.5} fill="none" stroke="white" strokeWidth={1.5} opacity={0.1} />
      <circle cx={cx} cy={cy} r={12} fill={JADE} opacity={0.07} />
      <circle cx={cx} cy={cy} r={7}  fill={JADE} opacity={0.14} />
      <circle cx={cx} cy={cy} r={3}  fill={JADE} opacity={0.45} />
    </svg>
  ) : (
    <div style={{ width: size, height: size, flexShrink: 0 }} />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36, flexWrap: "wrap" }}>
      {donutSvg}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 200 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 0",
            borderBottom: i < items.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{
              width: 9, height: 9,
              borderRadius: "50%",
              background: colors[i % colors.length],
              flexShrink: 0,
              boxShadow: `0 0 8px ${colors[i % colors.length]}cc`,
            }} />
            <span style={{ fontSize: 13, color: t.text, flex: 1, letterSpacing: "0.02em", fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 13, color: t.textSub, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.04em" }}>{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SPARK_VW = 200; // SVG viewBox 論理幅（preserveAspectRatio="none" で実幅にストレッチ）

function Sparkline({ points, color, idSeed, height = 52 }: {
  points: MetricPoint[];
  color: string;
  idSeed: number | string;
  height?: number;
}) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.numericValue);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const padX = 4, padY = 8;
  const innerW = SPARK_VW - padX * 2;
  const innerH = height - padY * 2;
  const xStep = innerW / (points.length - 1);
  const toX = (i: number) => Math.round((padX + i * xStep) * 10) / 10;
  const toY = (v: number) => Math.round((((max - v) / range) * innerH + padY) * 10) / 10;
  const linePts = points.map((p, i) => `${toX(i)},${toY(p.numericValue)}`);
  const lastIdx = points.length - 1;
  const lx = toX(lastIdx), ly = toY(vals[lastIdx]);
  const trend = vals[lastIdx] >= vals[vals.length - 2] ? color : "#e05252";
  const gradId = `hg-spark-${idSeed}`;
  const areaPath = `M ${linePts.join(" L ")} L ${lx},${height} L ${toX(0)},${height} Z`;
  // 水平グリッドライン（25%・50%・75%）
  const gridLevels = [0.25, 0.5, 0.75];
  // 最大・最小点に中空マーカー（終点と重なる場合は省く）
  const minIdx = vals.indexOf(min);
  const maxIdx = vals.indexOf(max);
  const ghosts = [minIdx, maxIdx].filter((idx, k, arr) => idx !== lastIdx && arr.indexOf(idx) === k);
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${SPARK_VW} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`直近${points.length}期間の推移（${vals[lastIdx] >= vals[vals.length - 2] ? "上昇" : "下落"}傾向）`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trend} stopOpacity={0.38} />
          <stop offset="70%" stopColor={trend} stopOpacity={0.08} />
          <stop offset="100%" stopColor={trend} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* グリッドライン */}
      {gridLevels.map((f) => {
        const gy = toY(min + range * f);
        return (
          <line key={f}
            x1={padX} y1={gy} x2={SPARK_VW - padX} y2={gy}
            stroke={trend}
            strokeOpacity={f === 0.5 ? 0.22 : 0.1}
            strokeWidth={0.6}
            strokeDasharray={f === 0.5 ? "4 4" : undefined}
          />
        );
      })}
      {/* エリア塗り */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* 折れ線 */}
      <polyline
        points={linePts.join(" ")} fill="none"
        stroke={trend} strokeWidth={1.7}
        strokeLinejoin="round" strokeLinecap="round"
      />
      {/* 最高値・最安値マーカー */}
      {ghosts.map((idx) => (
        <circle key={idx}
          cx={toX(idx)} cy={toY(vals[idx])}
          r={2.4} fill="none" stroke={trend} strokeWidth={1.2} opacity={0.55}
        />
      ))}
      {/* 終点：外周ハロー + 本体 + 白ハイライト */}
      <circle cx={lx} cy={ly} r={5.5} fill={trend} opacity={0.18} />
      <circle cx={lx} cy={ly} r={3} fill={trend} />
      <circle cx={lx} cy={ly} r={1.3} fill="#fff" opacity={0.9} />
    </svg>
  );
}

function KeyMetrics({ items, asOf, metricsHistory, t }: {
  items: KeyMetricItem[];
  asOf: string;
  metricsHistory?: MetricsHistory;
  t: typeof themeMap["dark"] | typeof themeMap["light"];
}) {
  const groups = items.map((m) => metricGroup(m.label));
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
        <span style={{ fontSize: 11, color: JADE, letterSpacing: "0.12em", fontWeight: 700, opacity: 0.85, whiteSpace: "nowrap" }}>主要指標</span>
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
              {/* 資産クラス eyebrow */}
              <div style={{ minHeight: 13, marginBottom: 5 }}>
                {isGroupStart && (
                  <span style={{ fontSize: 9, color: JADE, letterSpacing: "0.14em", fontWeight: 700, opacity: 0.7, textTransform: "uppercase" }}>{groups[i]}</span>
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
                  <Sparkline points={hist!} color={JADE} idSeed={i} />
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
                  boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
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

function RegimePanel({ regime, t }: { regime: RegimeInfo; t: typeof themeMap["dark"] | typeof themeMap["light"] }) {
  const cells = [
    { label: "景気局面", value: regime.cycle },
    { label: "インフレ局面", value: regime.inflation },
    { label: "金融政策局面", value: regime.policy },
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: JADE, letterSpacing: "0.12em", fontWeight: 700, opacity: 0.85, whiteSpace: "nowrap" }}>現在のレジーム</span>
      </div>
      <div
        className="hg-cv-regime"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: t.border, border: `1px solid ${t.border}` }}
      >
        {cells.map((c, i) => (
          <div key={i} style={{ background: t.surface, padding: "13px 16px" }}>
            <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.05em", marginBottom: 7 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: "0.01em", lineHeight: 1.35 }}>{c.value}</div>
          </div>
        ))}
      </div>
      {regime.summary && (
        <p style={{ fontSize: 12, color: t.textSub, margin: "10px 0 0", lineHeight: 1.8, letterSpacing: "0.02em", borderLeft: `2px solid ${JADE}66`, paddingLeft: 12 }}>
          {regime.summary}
        </p>
      )}
    </div>
  );
}

function CurrentView({ report, metricsHistory, t }: { report: ReportMeta; metricsHistory?: MetricsHistory; t: typeof themeMap["dark"] | typeof themeMap["light"] }) {
  const { stance, stancePrev, stanceLabel, stanceRationale, themes, scenarios, allocation, keyMetrics, regime } = report;
  if (stance == null && !themes && !scenarios) return null;

  const delta = stance != null && stancePrev != null ? stance - stancePrev : null;
  const deltaColor = delta == null ? t.textMuted : delta > 0 ? "#bf8a3e" : delta < 0 ? JADE : t.textMuted;
  const deltaArrow = delta == null ? "" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const deltaText = delta == null ? "" : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0";

  return (
    <div style={{ marginBottom: 48 }}>
      <div className="hg-cv-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: JADE, fontWeight: 700, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>カレントビュー</span>
          <span style={{ fontSize: 10, color: t.textSub, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>月次・週次・日次統合 · 中長期視点</span>
          <span className="hg-cv-header-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
            <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.04em" }}>{report.title}</span>
          </span>
        </div>
        <Link href={`/reports/${report.slug}`} style={{ fontSize: 11, color: JADE, textDecoration: "none", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
          詳細レポートを読む →
        </Link>
      </div>

      {keyMetrics && keyMetrics.length > 0 && (
        <KeyMetrics items={keyMetrics as KeyMetricItem[]} asOf={report.date} metricsHistory={metricsHistory} t={t} />
      )}

      {regime && <RegimePanel regime={regime} t={t} />}

      <div className="hg-cv-grid" style={{ display: "grid", gridTemplateColumns: "200px 1fr 260px", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
        {/* スタンス */}
        {stance != null && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: JADE, letterSpacing: "0.12em", marginBottom: 2, opacity: 0.85 }}>スタンス</div>
            <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>中長期目線</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 18, letterSpacing: "-0.01em" }}>{stanceLabel ?? "—"}</div>
            <div style={{ position: "relative", height: 3, background: t.borderStrong, marginBottom: 8 }}>
              <div style={{ position: "absolute", left: 0, width: `${stance}%`, height: "100%", background: `linear-gradient(to right, ${JADE}, #e05252)` }} />
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
                <div style={{ fontSize: 9, color: JADE, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 7, opacity: 0.85 }}>判断根拠</div>
                <p style={{ fontSize: 11, color: t.textSub, lineHeight: 1.8, margin: 0, letterSpacing: "0.02em", borderLeft: `2px solid ${JADE}66`, paddingLeft: 10 }}>
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
            <div style={{ fontSize: 10, color: JADE, letterSpacing: "0.12em", marginBottom: 14, opacity: 0.85 }}>市況概要</div>
            {report.marketOverview && (
              <p style={{ fontSize: 13, color: t.textSub, lineHeight: 1.85, margin: "0 0 16px", borderBottom: `1px solid ${t.border}`, paddingBottom: 14 }}>
                {report.marketOverview}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {themes.map((theme, i) => (
                <div key={i} style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6, paddingBottom: 9, borderBottom: i < themes.length - 1 ? `1px solid ${t.border}` : "none" }}>{theme}</div>
              ))}
            </div>
          </div>
        )}

        {/* シナリオ */}
        {scenarios && scenarios.length > 0 && (
          <div style={{ background: t.surface, padding: "20px" }}>
            <div style={{ fontSize: 10, color: JADE, letterSpacing: "0.1em", marginBottom: 14, opacity: 0.85 }}>予測シナリオ（AI推定・参考値）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(scenarios as ScenarioItem[]).map((s, i) => (
                <div key={i} style={{ paddingBottom: 12, borderBottom: i < (scenarios as ScenarioItem[]).length - 1 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: directionColor(s.direction), fontWeight: 700 }}>{directionLabel(s.direction)}</span>
                      <span style={{ fontSize: 12, color: s.base ? t.text : t.textSub, fontWeight: s.base ? 600 : 400 }}>
                        {s.label}
                        {s.base && <span style={{ fontSize: 9, color: JADE, marginLeft: 5, letterSpacing: "0.1em", fontWeight: 700 }}>BASE</span>}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: t.textSub, fontFamily: "monospace", fontWeight: 600 }}>{s.probability}%</span>
                  </div>
                  <div style={{ height: 3, background: t.borderStrong, borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${s.probability}%`, background: directionColor(s.direction), opacity: s.base ? 1 : 0.55, borderRadius: 2 }} />
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
            <p style={{ fontSize: 12, color: t.textSub, margin: "0 0 20px", lineHeight: 1.85, letterSpacing: "0.02em", borderLeft: `2px solid ${JADE}66`, paddingLeft: 12 }}>
              {report.allocationNote}
            </p>
          )}
          <AllocationDonut items={allocation as AllocationItem[]} t={t} />
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
            <p style={{ fontSize: 12, color: t.textSub, margin: "0 0 20px", lineHeight: 1.85, letterSpacing: "0.02em", borderLeft: `2px solid ${JADE}66`, paddingLeft: 12 }}>
              {report.sectorsNote}
            </p>
          )}
          <AllocationDonut items={report.sectors as AllocationItem[]} t={t} colors={SECTOR_COLORS} />
        </div>
      )}
    </div>
  );
}

interface Props {
  latestWeekly?: ReportMeta;
  latestDaily?: ReportMeta;
  reportsByType: Record<ReportType, ReportMeta[]>;
  metricsHistory?: MetricsHistory;
}

export default function ReportsClient({ latestWeekly, latestDaily, reportsByType, metricsHistory }: Props) {
  const { mode, t, toggleTheme } = useTheme();

  const types: ReportType[] = ["monthly", "weekly", "daily"];

  // 翡翠グリーンの微細な光彩を重ねた背景（フラットな単色に深みを与える）
  const pageBg = mode === "dark"
    ? `radial-gradient(125% 70% at 50% -8%, rgba(58,175,138,0.10), rgba(58,175,138,0.03) 32%, transparent 60%), radial-gradient(90% 55% at 92% 2%, rgba(45,140,110,0.06), transparent 55%)`
    : `radial-gradient(125% 70% at 50% -10%, rgba(45,140,110,0.07), transparent 58%), radial-gradient(90% 50% at 92% 0%, rgba(45,140,110,0.035), transparent 55%)`;
  const mastheadBg = mode === "dark"
    ? `radial-gradient(120% 220% at 0% 0%, rgba(58,175,138,0.09), transparent 46%), ${t.surface}`
    : `radial-gradient(120% 220% at 0% 0%, rgba(45,140,110,0.05), transparent 46%), ${t.surface}`;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.bg, backgroundImage: pageBg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, height: 56 }}>
          <div style={{ width: 3, height: 22, background: `linear-gradient(${t.positive}, ${JADE})`, boxShadow: `0 0 10px ${JADE}55`, flexShrink: 0 }} />
          <Link href="/reports" style={{ fontFamily: "var(--font-serif-jp)", fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", color: t.text, textDecoration: "none" }}>
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
      <div style={{ borderBottom: `1px solid ${t.border}`, background: mastheadBg, padding: "48px 0 40px" }}>
        <div className="hg-reveal" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <div style={{ width: 4, height: 46, background: `linear-gradient(${t.positive}, ${JADE})`, boxShadow: `0 0 18px ${JADE}55`, flexShrink: 0 }} />
            <h1 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 44, fontWeight: 700, letterSpacing: "0.1em", margin: 0, color: t.text, lineHeight: 1 }}>
              レポート
            </h1>
          </div>
          <p style={{ fontSize: 13, color: t.textSub, margin: 0, letterSpacing: "0.1em", paddingLeft: 20 }}>
            月次・週次・日次のマクロ市場分析レポート
          </p>
        </div>
      </div>

      {/* Quote Banner — エディトリアルなプルクオート */}
      {latestWeekly?.quote && (
        <div style={{ borderBottom: `1px solid ${t.border}`, background: t.bg }}>
          <div className="hg-reveal" style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 24px", display: "flex", alignItems: "flex-start", gap: 18, animationDelay: "0.08s" }}>
            <span className="hg-quote-mark" aria-hidden style={{ fontSize: 56, color: JADE, opacity: 0.28, marginTop: -6, flexShrink: 0 }}>&ldquo;</span>
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
          <div style={{ marginBottom: 48, borderLeft: `2px solid ${JADE}44`, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: JADE, letterSpacing: "0.1em", fontWeight: 700 }}>DAILY BRIEF</span>
              <span style={{ fontSize: 10, color: t.textMuted }}>·</span>
              <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.04em" }}>{latestDaily.date}</span>
            </div>
            <p style={{ fontSize: 13, color: t.textSub, margin: 0, lineHeight: 1.85 }}>
              {latestDaily.description}
            </p>
            <Link href={`/reports/${latestDaily.slug}`} style={{ fontSize: 11, color: JADE, textDecoration: "none", letterSpacing: "0.04em", display: "inline-block", marginTop: 8 }}>
              詳細を読む →
            </Link>
          </div>
        )}

        {/* 予測ログリンク */}
        <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 1, background: t.border }} />
          <Link href="/reports/track-record" style={{ fontSize: 12, color: JADE, textDecoration: "none", letterSpacing: "0.06em", whiteSpace: "nowrap", border: `1px solid ${JADE}55`, padding: "6px 14px" }}>
            予測ログ（ベースシナリオ vs 実績）→
          </Link>
          <div style={{ flex: 1, height: 1, background: t.border }} />
        </div>

        {types.map((type) => {
          const reports = reportsByType[type] ?? [];
          return (
            <section key={type} style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 10, borderBottom: `1px solid ${t.border}` }}>
                <div style={{ width: 3, height: 18, background: `linear-gradient(${t.positive}, ${JADE})`, flexShrink: 0 }} />
                <h2 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 19, fontWeight: 700, margin: 0, color: t.text, letterSpacing: "0.08em" }}>
                  {TYPE_LABELS[type]}
                </h2>
                <span style={{ fontSize: 10, color: JADE, letterSpacing: "0.12em", opacity: 0.75 }}>
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
