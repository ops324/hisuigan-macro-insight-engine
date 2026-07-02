"use client";
import Link from "next/link";
import type { PredictionRecord, MetricsHistory } from "@/lib/history";
import {
  HORIZONS,
  stanceSmoothness,
  stanceForwardPairs,
  sampleNonOverlapping,
  informationCoefficient,
} from "@/lib/track-record";
import { useTheme } from "@/lib/useTheme";
import { directionColor } from "@/lib/metrics";

function dirLabel(d: string) {
  return d === "up" ? "↑ 上昇" : d === "down" ? "↓ 下落" : "→ 横ばい";
}

interface Props {
  predictions: PredictionRecord[];
  metricsHistory: MetricsHistory;
}

const fmt1 = (n: number | null) => (n == null ? "—" : n.toFixed(1));

export default function TrackRecordClient({ predictions, metricsHistory }: Props) {
  const { mode, t, toggleTheme } = useTheme();

  const sorted = [...predictions].sort((a, b) => b.date.localeCompare(a.date));

  // ── 長期検証（全資産・6M+）：即時に意味を持つのは「見立ての滑らかさ」。6M IC は蓄積中 ──
  const ascending = [...predictions].sort((a, b) => a.date.localeCompare(b.date));
  const smooth = stanceSmoothness(ascending.map((p) => p.stance));

  // 暫定 4週IC（重複窓・参考値）と非重複の有効N
  const spxSeries = metricsHistory["S&P 500"] ?? [];
  const ovPairs = stanceForwardPairs(ascending, spxSeries, HORIZONS.m1);
  const ic4w = informationCoefficient(ovPairs.map((p) => [p.stance, p.forwardReturn] as [number, number]));
  const effN = sampleNonOverlapping(
    ascending.filter((p) => stanceForwardPairs([p], spxSeries, HORIZONS.m1).length > 0),
    HORIZONS.m1,
  ).length;
  // 6M 窓に到達した観測があるか（無ければペンディング）
  const has6m = ascending.some((p) => stanceForwardPairs([p], spxSeries, HORIZONS.m6).length > 0);

  const longCells = [
    { label: "見立て滑らかさ（週次変化 平均）", value: `${fmt1(smooth.meanStep)}pt`, note: "長期ゲージの安定" },
    { label: "見立て滑らかさ（最大）", value: smooth.maxStep == null ? "—" : `${smooth.maxStep}pt`, note: "急変の有無" },
    {
      label: "6M IC（本評価）",
      value: has6m ? (ic4w.ic == null ? "—" : ic4w.ic.toFixed(2)) : "蓄積中",
      note: has6m ? "" : "最初の評価 ≈ 2026-11",
    },
    {
      label: "暫定 4週IC（参考）",
      value: ic4w.ic == null ? "—" : ic4w.ic.toFixed(2),
      note: `重複窓・有効N≈${effN}`,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, height: 56 }}>
          <div style={{ width: 3, height: 22, background: t.positive, flexShrink: 0 }} />
          <Link href="/reports" style={{ fontFamily: "var(--font-serif-jp)", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>翡翠眼</Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <Link href="/reports" style={{ fontSize: 14, color: t.textSub, letterSpacing: "0.05em", textDecoration: "none" }}>レポート</Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: t.textSub, letterSpacing: "0.05em" }}>予測ログ</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/market" className="hg-nav-link" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.05em" }}>マーケット</Link>
            <button onClick={toggleTheme} aria-label={`テーマ切替（現在: ${mode === "dark" ? "ダーク" : "ライト"}）`} style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 11, letterSpacing: "0.06em", borderRadius: 2 }}>
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* ページタイトル */}
      <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface, padding: "28px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ width: 3, height: 34, background: t.positive, flexShrink: 0 }} />
            <h1 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 32, fontWeight: 700, letterSpacing: "0.05em", margin: 0, color: t.text, lineHeight: 1 }}>予測ログ</h1>
          </div>
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0, letterSpacing: "0.04em", paddingLeft: 12 }}>
            週次レポートのベースシナリオ予測と実績の事実並置
          </p>
          <p style={{ fontSize: 11, color: t.textMuted, margin: "8px 0 0", letterSpacing: "0.03em", paddingLeft: 12 }}>
            ⚠ AI（翡翠眼）による参考記録です。投資助言ではありません。
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── 長期検証（全資産・6M+）＝主指標 ── */}
        <div style={{ marginBottom: 12, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.positive, letterSpacing: "0.08em" }}>長期検証（全資産・6M+）</span>
          <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.03em" }}>
            中長期（stance・資産別の長期方向）の予測精度。6M前方リターンで採点。本評価は約2026-11／統計的有意には年単位。
          </span>
        </div>
        <div style={{ display: "flex", gap: 1, background: t.border, border: `1px solid ${t.border}`, marginBottom: 16 }} className="hg-grid-4">
          {longCells.map((item, i) => (
            <div key={i} style={{ flex: 1, background: t.surface, padding: "16px 20px" }}>
              <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.05em", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: t.text }}>{item.value}</div>
              {item.note && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>{item.note}</div>}
            </div>
          ))}
        </div>
        {/* 資産別 6M スコアカード（蓄積中） */}
        <div style={{ border: `1px solid ${t.border}`, background: t.surface, padding: "14px 18px", marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: t.textSub, letterSpacing: "0.04em" }}>
            資産別 6M スコアカード（株・債券・為替・コモディティ）：
            <span style={{ color: t.textMuted }}> 蓄積中。各資産の長期方向（frontmatter <code>longTermViews</code>）と前方リターンの一致を約2026-11以降に資産別表示。</span>
          </div>
        </div>

        {/* ── 予測記録（参考・短期方向は near-random のため事実の並置のみ） ── */}
        {sorted.length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.textSub, letterSpacing: "0.08em" }}>予測記録（参考）</span>
            <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.03em" }}>
              週次ベースシナリオと翌週S&amp;Pの事実並置。短期方向は near-random で評価対象外（本サイトの主軸は上段の長期検証）。
            </span>
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: t.textMuted, fontSize: 14 }}>
            予測記録がまだありません。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: t.border, border: `1px solid ${t.border}` }}>
            {/* ヘッダー行 */}
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 160px", gap: 1, background: t.border }}>
              {["週", "予測（ベースシナリオ）", "実績", "評価"].map((h, i) => (
                <div key={i} style={{ background: t.surface, padding: "10px 16px", fontSize: 10, color: t.textMuted, letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>

            {sorted.map((p) => {
              const oc = p.outcome;
              return (
                <div key={`${p.weekSlug}-${p.date}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 160px", gap: 1, background: t.border }}>
                  {/* 週 */}
                  <div style={{ background: t.surface, padding: "16px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: "monospace", marginBottom: 4 }}>{p.weekSlug}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{p.date}</div>
                    <div style={{ marginTop: 8, fontSize: 10, color: t.textMuted }}>スタンス</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: t.positive }}>{p.stance}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{p.stanceLabel}</div>
                  </div>

                  {/* 予測 */}
                  <div style={{ background: t.surface, padding: "16px 16px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: directionColor(p.baseScenario.direction) }}>{dirLabel(p.baseScenario.direction)}</span>
                      <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "monospace" }}>{p.baseScenario.probability}%</span>
                    </div>
                    <p style={{ fontSize: 12, color: t.textSub, margin: 0, lineHeight: 1.7 }}>{p.baseScenario.label}</p>
                    {/* 主要指標スナップショット */}
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {p.keyMetrics.slice(0, 3).map((m, i) => (
                        <div key={i} style={{ fontSize: 10, color: t.textMuted }}>
                          <span style={{ marginRight: 4 }}>{m.label}</span>
                          <span style={{ fontFamily: "monospace", color: t.textSub, fontWeight: 600 }}>{m.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 実績 */}
                  <div style={{ background: t.surface, padding: "16px 16px" }}>
                    {oc ? (
                      <>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: directionColor(oc.spxDirection ?? "neutral") }}>{dirLabel(oc.spxDirection ?? "neutral")}</span>
                          {oc.spxActualChange && (
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: t.textMuted }}>S&P {oc.spxActualChange}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: t.textSub, margin: 0, lineHeight: 1.7 }}>{oc.note}</p>
                        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 8 }}>評価日: {oc.assessedDate}</div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", height: "100%", minHeight: 60 }}>
                        <span style={{ fontSize: 12, color: t.textMuted, fontStyle: "italic" }}>評価待ち</span>
                      </div>
                    )}
                  </div>

                  {/* 評価タグ */}
                  <div style={{ background: t.surface, padding: "16px 16px", display: "flex", alignItems: "flex-start" }}>
                    {oc ? (
                      <div>
                        <div style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          border: `1px solid ${oc.match ? t.positive : t.negative}`,
                          color: oc.match ? t.positive : t.negative,
                          marginBottom: 8,
                        }}>
                          {oc.match ? "方向一致" : "方向不一致"}
                        </div>
                        <p style={{ fontSize: 10, color: t.textMuted, margin: 0, lineHeight: 1.6 }}>
                          予測: {dirLabel(oc.baseScenarioDirection)}<br />
                          実績: {dirLabel(oc.spxDirection ?? "neutral")}
                        </p>
                      </div>
                    ) : (
                      <div style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        border: `1px solid ${t.border}`,
                        color: t.textMuted,
                      }}>
                        PENDING
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 注記 */}
        <p style={{ fontSize: 11, color: t.textMuted, marginTop: 24, lineHeight: 1.7, borderLeft: `2px solid ${t.border}`, paddingLeft: 12 }}>
          <strong style={{ color: t.textSub }}>主指標は長期（全資産・6M+）。</strong>
          中長期の見立て（stance・資産別の長期方向）を 6M 前方リターンで採点する。6M ホライズンは独立観測が年に数個しか得られないため、統計的に意味のある精度（IC）が出るには年単位の蓄積を要する。
          それまでの即時指標は「見立ての滑らかさ」（長期ゲージが日次ニュースで乱高下していないか）。暫定 4週IC は<strong>重複窓・有効N僅少の参考値</strong>で、過信しないこと。<br />
          下段の<strong style={{ color: t.textSub }}>予測記録は参考</strong>。週次ベースシナリオと翌週 S&amp;P 変動を事実として並置したもの（「方向一致」は方向が一致した場合・変化率 ±1.0% 未満は横ばい・判定基準 ±1.0% は 2026-05-24 確定）。短期方向は near-random のため<strong>評価対象外</strong>で、的中率の集計は表示しない。
          AI（翡翠眼）の参考記録であり、将来の運用成果を保証するものではありません。
        </p>

        <div style={{ marginTop: 24 }}>
          <Link href="/reports" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.04em" }}>
            ← レポート一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
