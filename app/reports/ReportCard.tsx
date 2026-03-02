"use client";
import Link from "next/link";
import { useState } from "react";
import { ReportMeta } from "@/lib/reports";

const JADE = "#2d8c6e";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

export function ReportCard({ report }: { report: ReportMeta }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={`/reports/${report.slug}`}
      style={{
        display: "block",
        padding: "16px 20px",
        background: "#111",
        textDecoration: "none",
        borderLeft: `3px solid ${hovered ? JADE : "transparent"}`,
        transition: "border-color 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#e5e5e5" }}>{report.title}</span>
        <span style={{ fontSize: 12, color: "#555", flexShrink: 0, fontFamily: "var(--font-geist-mono)" }}>
          {formatDate(report.date)}
        </span>
      </div>
      {report.description && (
        <p style={{ fontSize: 13, color: "#777", margin: "4px 0 0", lineHeight: 1.5 }}>
          {report.description}
        </p>
      )}
    </Link>
  );
}
