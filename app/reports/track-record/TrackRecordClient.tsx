"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { PredictionRecord } from "@/lib/history";
import { themeMap, ThemeMode } from "@/lib/theme";

const JADE = "#2d8c6e";

function dirLabel(d: string) {
  return d === "up" ? "↑ 上昇" : d === "down" ? "↓ 下落" : "→ 横ばい";
}
function dirColor(d: string) {
  return d === "up" ? "#3aaf8a" : d === "down" ? "#e05252" : "#888";
}

interface Props {
  predictions: PredictionRecord[];
}

export default function TrackRecordClient({ predictions }: Props) {
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

  const sorted = [...predictions].sort((a, b) => b.date.localeCompare(a.date));
  const resolved = sorted.filter((p) => p.outcome !== null);
  const hitCount = resolved.filter((p) => p.outcome!.match).length;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 2, height: 22, background: JADE, flexShrink: 0 }} />
          <Link href="/reports" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>翡翠眼</Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <Link href="/reports" style={{ fontSize: 14, color: t.textSub, letterSpacing: "0.05em", textDecoration: "none" }}>レポート</Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: t.textSub, letterSpacing: "0.05em" }}>予測ログ</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/market" className="hg-nav-link" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.05em" }}>マーケット</Link>
            <button onClick={toggleTheme} style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 11, letterSpacing: "0.06em", borderRadius: 2 }}>
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* ページタイトル */}
      <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface, padding: "28px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 2, height: 22, background: JADE, flexShrink: 0 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.06em", margin: 0, color: t.text }}>予測ログ</h1>
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
        {/* サマリーバー */}
        {resolved.length > 0 && (
          <div style={{ display: "flex", gap: 1, background: t.border, border: `1px solid ${t.border}`, marginBottom: 32 }}>
            {[
              { label: "評価済み予測", value: `${resolved.length} 件` },
              { label: "方向一致", value: `${hitCount} 件` },
              { label: "方向不一致", value: `${resolved.length - hitCount} 件` },
              { label: "一致率", value: `${Math.round((hitCount / resolved.length) * 100)}%` },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, background: t.surface, padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.06em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: i === 3 ? JADE : t.text }}>{item.value}</div>
              </div>
            ))}
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

            {sorted.map((p, idx) => {
              const oc = p.outcome;
              return (
                <div key={p.weekSlug} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 160px", gap: 1, background: t.border }}>
                  {/* 週 */}
                  <div style={{ background: t.surface, padding: "16px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text, fontFamily: "monospace", marginBottom: 4 }}>{p.weekSlug}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{p.date}</div>
                    <div style={{ marginTop: 8, fontSize: 10, color: t.textMuted }}>スタンス</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: JADE }}>{p.stance}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{p.stanceLabel}</div>
                  </div>

                  {/* 予測 */}
                  <div style={{ background: t.surface, padding: "16px 16px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: dirColor(p.baseScenario.direction) }}>{dirLabel(p.baseScenario.direction)}</span>
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
                          <span style={{ fontSize: 11, fontWeight: 700, color: dirColor(oc.spxDirection ?? "neutral") }}>{dirLabel(oc.spxDirection ?? "neutral")}</span>
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
                          border: `1px solid ${oc.match ? JADE : "#e05252"}`,
                          color: oc.match ? JADE : "#e05252",
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
          「方向一致」はベースシナリオの方向性（↑上昇 / → 横ばい / ↓下落）とS&amp;P 500週次変動の方向が一致した場合。
          確率・幅の精度は評価対象外。AI（翡翠眼）の参考記録であり、将来の運用成果を保証するものではありません。
        </p>

        <div style={{ marginTop: 24 }}>
          <Link href="/reports" style={{ fontSize: 13, color: JADE, textDecoration: "none", letterSpacing: "0.04em" }}>
            ← レポート一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
