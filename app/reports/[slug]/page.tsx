import { notFound } from "next/navigation";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getReportBySlug, getAllSlugs, ReportType } from "@/lib/reports";

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function slugify(text: string): string {
  return text.trim().replace(/\s+/g, "-");
}

function nodeToText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node)) {
    return nodeToText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

interface Heading {
  level: number;
  text: string;
  id: string;
}

function extractHeadings(content: string): Heading[] {
  return content
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{1,2})\s+(.+)$/);
      if (!match) return null;
      const level = match[1].length;
      const text = match[2].trim();
      return { level, text, id: slugify(text) };
    })
    .filter((h): h is Heading => h !== null);
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) notFound();

  const headings = extractHeadings(report.content);

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#e5e5e5", fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#111", borderBottom: "1px solid #222" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 3, height: 20, background: JADE, flexShrink: 0 }} />
          <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#e5e5e5", textDecoration: "none" }}>
            翡翠眼
          </Link>
          <span style={{ color: "#444", fontSize: 14 }}>/</span>
          <Link href="/reports" style={{ fontSize: 14, color: "#888", textDecoration: "none", letterSpacing: "0.05em" }}>
            REPORTS
          </Link>
        </div>
      </header>

      {/* 記事ヘッダー */}
      <div style={{ borderBottom: `1px solid #222`, background: "#141414", padding: "32px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              background: `${JADE}22`,
              border: `1px solid ${JADE}66`,
              color: JADE,
              fontSize: 11,
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}>
              {TYPE_LABELS[report.type]}
            </span>
            <span style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em" }}>
              {TYPE_SUBTITLES[report.type]}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px", color: "#e5e5e5", lineHeight: 1.4, letterSpacing: "0.02em" }}>
            {report.title}
          </h1>
          <p style={{ fontSize: 13, color: "#555", margin: 0, fontFamily: "var(--font-geist-mono)" }}>
            {formatDate(report.date)}
          </p>
        </div>
      </div>

      {/* 本文 */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* 目次 */}
        {headings.length > 0 && (
          <div style={{
            border: "1px solid #222",
            background: "#141414",
            padding: "20px 24px",
            marginBottom: 48,
          }}>
            <div style={{ fontSize: 11, color: JADE, letterSpacing: "0.12em", fontWeight: 600, marginBottom: 14 }}>
              目次
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {headings.map((h, i) => (
                <li key={i} style={{
                  marginBottom: 8,
                  paddingLeft: h.level === 2 ? 16 : 0,
                  borderLeft: h.level === 2 ? "1px solid #2a2a2a" : "none",
                }}>
                  <a
                    href={`#${h.id}`}
                    style={{
                      fontSize: h.level === 1 ? 14 : 13,
                      color: h.level === 1 ? "#bbb" : "#777",
                      textDecoration: "none",
                      letterSpacing: "0.02em",
                      lineHeight: 1.5,
                    }}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Markdown本文 */}
        <div style={{ lineHeight: 1.9, fontSize: 15, color: "#ccc" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h1 id={id} style={{ fontSize: 22, fontWeight: 700, color: "#e5e5e5", margin: "40px 0 16px", borderBottom: "1px solid #222", paddingBottom: 10 }}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h2 id={id} style={{ fontSize: 18, fontWeight: 700, color: "#e5e5e5", margin: "36px 0 14px", borderBottom: "1px solid #1e1e1e", paddingBottom: 8 }}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => (
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ddd", margin: "28px 0 10px" }}>{children}</h3>
              ),
              p: ({ children }) => (
                <p style={{ margin: "0 0 18px", color: "#ccc" }}>{children}</p>
              ),
              ul: ({ children }) => (
                <ul style={{ margin: "0 0 18px", paddingLeft: 24, color: "#ccc" }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ margin: "0 0 18px", paddingLeft: 24, color: "#ccc" }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 6 }}>{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: `3px solid ${JADE}`,
                  paddingLeft: 16,
                  margin: "24px 0",
                  color: "#888",
                  fontStyle: "italic",
                }}>{children}</blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.startsWith("language-");
                return isBlock ? (
                  <code style={{
                    display: "block",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    padding: "16px",
                    borderRadius: 0,
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono)",
                    color: "#aaa",
                    overflowX: "auto",
                    margin: "18px 0",
                  }}>{children}</code>
                ) : (
                  <code style={{
                    background: "#1e1e1e",
                    padding: "2px 6px",
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono)",
                    color: "#aaa",
                  }}>{children}</code>
                );
              },
              table: ({ children }) => (
                <div style={{ overflowX: "auto", margin: "18px 0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead>{children}</thead>,
              th: ({ children }) => (
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #333", color: "#888", fontSize: 12, letterSpacing: "0.06em", fontWeight: 600 }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ padding: "8px 12px", borderBottom: "1px solid #1e1e1e", color: "#ccc" }}>{children}</td>
              ),
              hr: () => <hr style={{ border: "none", borderTop: "1px solid #222", margin: "32px 0" }} />,
              strong: ({ children }) => <strong style={{ color: "#e5e5e5", fontWeight: 700 }}>{children}</strong>,
            }}
          >
            {report.content}
          </ReactMarkdown>
        </div>

        {/* 免責事項 */}
        <div style={{
          marginTop: 60,
          padding: "20px 24px",
          border: "1px solid #2a2a2a",
          background: "#141414",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "0.1em" }}>本レポートについて</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {[
              "本レポートはAI（Hisuigan）によるマクロ経済・市場環境の情報提供を目的としています。",
              "投資助言・売買推奨ではありません。",
              "投資判断・売買の最終決定はご自身の責任で行ってください。",
              "過去の市場動向は将来の結果を保証しません。",
              "投資判断の際は、必ずご自身で最新の一次情報および公式データをご確認ください。",
            ].map((text, i) => (
              <li key={i} style={{ fontSize: 12, color: "#555", lineHeight: 1.8, paddingLeft: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "#444" }}>–</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* フッター戻りリンク */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #222" }}>
          <Link href="/reports" style={{ fontSize: 13, color: JADE, textDecoration: "none", letterSpacing: "0.04em" }}>
            ← REPORTS 一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
