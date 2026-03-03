"use client";
import Link from "next/link";
import { useState } from "react";
import { ReportMeta } from "@/lib/reports";
import { Theme } from "@/lib/theme";

const JADE = "#2d8c6e";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export function ReportCard({ report, t }: { report: ReportMeta; t: Theme }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/reports/${report.slug}`}
      style={{
        display: "block",
        padding: "16px 20px",
        background: t.surface,
        textDecoration: "none",
        borderLeft: `3px solid ${hovered ? JADE : "transparent"}`,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="hg-card-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{report.title}</span>
        <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0, fontFamily: "var(--font-geist-mono)" }}>
          {formatDate(report.date)}
        </span>
      </div>
      {report.description && (
        <p style={{ fontSize: 13, color: t.textSub, margin: "4px 0 0", lineHeight: 1.5 }}>
          {report.description}
        </p>
      )}
    </Link>
  );
}
