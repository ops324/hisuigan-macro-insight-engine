"use client";
import Link from "next/link";
import { ReportMeta } from "@/lib/reports";
import { Theme } from "@/lib/theme";
import { formatDate } from "@/lib/format";

export function ReportCard({ report, t }: { report: ReportMeta; t: Theme }) {
  // ホバーの翡翠左ボーダーは globals.css の .hg-report-card:hover（CSS のみ・状態管理不要）
  return (
    <Link
      href={`/reports/${report.slug}`}
      className="hg-report-card"
      style={{
        display: "block",
        padding: "20px 24px",
        background: t.surface,
        textDecoration: "none",
        borderLeft: "2px solid transparent",
      }}
    >
      <div className="hg-card-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: report.description ? 8 : 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: t.text, letterSpacing: "0.02em" }}>{report.title}</span>
        <span style={{ fontSize: 11, color: t.textMuted, flexShrink: 0, fontFamily: "var(--font-geist-mono)", letterSpacing: "0.02em" }}>
          {formatDate(report.date)}
        </span>
      </div>
      {report.description && (
        <p style={{ fontSize: 13, color: t.textSub, margin: 0, lineHeight: 1.8, letterSpacing: "0.02em" }}>
          {report.description}
        </p>
      )}
    </Link>
  );
}
