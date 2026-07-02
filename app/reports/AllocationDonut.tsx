"use client";
import { AllocationItem } from "@/lib/reports";
import { Theme } from "@/lib/theme";

// 翡翠を起点とした序列のある土系トーナル（虹色を廃しエディトリアルに）
export const ALLOC_COLORS = ["#2f6f55", "#7d9a6f", "#b9a35f", "#c0894d", "#9a8579", "#bcb4a4"];
// セクター用トーナル（鋼青起点）
export const SECTOR_COLORS = ["#3c5e74", "#6f8a86", "#b9a35f", "#b06a55", "#8a7d8f", "#bcb4a4"];

// フラットな水平100%積み上げバー＋序列付き凡例（旧ドーナツの drop-shadow / グロー円 / ハロー凡例を全廃）
export function AllocationDonut({ items, t, colors = ALLOC_COLORS }: { items: AllocationItem[]; t: Theme; colors?: string[] }) {
  const total = items.reduce((sum, it) => sum + it.percent, 0) || 100;
  return (
    <div>
      {/* 比率バー（角丸無し・グロー無し・トーナル）。スクリーンリーダー向けに内訳をテキスト化 */}
      <div
        role="img"
        aria-label={`配分比率: ${items.map((it) => `${it.label} ${it.percent}%`).join("、")}`}
        style={{ display: "flex", width: "100%", height: 10, border: `1px solid ${t.border}`, overflow: "hidden", marginBottom: 18 }}
      >
        {items.map((item, i) => (
          <div key={i} style={{
            width: `${(item.percent / total) * 100}%`,
            background: colors[i % colors.length],
            borderRight: i < items.length - 1 ? `1px solid ${t.surface}` : "none",
          }} />
        ))}
      </div>
      {/* 序列付き凡例 */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "8px 0",
            borderBottom: i < items.length - 1 ? `1px solid ${t.border}` : "none",
          }}>
            {/* 無発光の小矩形スウォッチ */}
            <div style={{ width: 10, height: 10, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: t.text, flex: 1, letterSpacing: "0.01em", fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 13, color: t.textSub, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.02em" }}>{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
