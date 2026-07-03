"use client";
import { RegimeInfo } from "@/lib/reports";
import { Theme } from "@/lib/theme";
import { PanelText } from "./PanelText";

export function RegimePanel({ regime, t }: { regime: RegimeInfo; t: Theme }) {
  const cells = [
    { label: "景気局面", value: regime.cycle },
    { label: "インフレ局面", value: regime.inflation },
    { label: "金融政策局面", value: regime.policy },
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: t.positive, letterSpacing: "0.12em", fontWeight: 700, opacity: 0.85, whiteSpace: "nowrap" }}>現在のレジーム</span>
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
        <PanelText text={regime.summary} style={{ fontSize: 12, color: t.textSub, margin: "10px 0 0", lineHeight: 1.8, letterSpacing: "0.02em", borderLeft: `2px solid ${t.positive}66`, paddingLeft: 12 }} />
      )}
    </div>
  );
}
