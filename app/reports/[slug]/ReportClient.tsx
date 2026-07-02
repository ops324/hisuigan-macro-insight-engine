"use client";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Report, ReportType } from "@/lib/reports";
import { useTheme } from "@/lib/useTheme";
import { formatDate } from "@/lib/format";

const TYPE_LABELS: Record<ReportType, string> = {
  monthly: "月次",
  weekly:  "週次",
  daily:   "日次",
};

const TYPE_SUBTITLES: Record<ReportType, string> = {
  monthly: "中長期の俯瞰",
  weekly:  "市場環境の記録",
  daily:   "日々の動向",
};

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
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (!match) return null;
      const level = match[1].length;
      const text = match[2].trim();
      return { level, text, id: slugify(text) };
    })
    .filter((h): h is Heading => h !== null);
}

export default function ReportClient({ report }: { report: Report }) {
  const { mode, t, toggleTheme } = useTheme();

  const headings = extractHeadings(report.content);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: `${t.headerBg}f2`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 14, height: 56 }}>
          <div style={{ width: 3, height: 22, background: t.positive, flexShrink: 0 }} />
          <Link href="/reports" style={{ fontFamily: "var(--font-serif-jp)", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>
            翡翠眼
          </Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <Link href="/reports" style={{ fontSize: 13, color: t.textSub, textDecoration: "none", letterSpacing: "0.05em" }}>
            レポート
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/market" className="hg-nav-link" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.05em" }}>
              マーケット
            </Link>
            <button
              onClick={toggleTheme}
              aria-label={`テーマ切替（現在: ${mode === "dark" ? "ダーク" : "ライト"}）`}
              aria-pressed={mode === "dark"}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 11, letterSpacing: "0.06em", borderRadius: 2, transition: "border-color 0.15s, color 0.15s" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* 記事ヘッダー */}
      <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface, padding: "40px 0 32px" }}>
        <div className="hg-reveal" style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              background: `${t.positive}18`,
              border: `1px solid ${t.positive}44`,
              color: t.positive,
              fontSize: 10,
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}>
              {TYPE_LABELS[report.type]}
            </span>
            <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", opacity: 0.8 }}>
              {TYPE_SUBTITLES[report.type]}
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 30, fontWeight: 700, margin: "0 0 14px", color: t.text, lineHeight: 1.4, letterSpacing: "0.04em" }}>
            {report.title}
          </h1>
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0, fontFamily: "var(--font-geist-mono)", letterSpacing: "0.04em" }}>
            {formatDate(report.date)}
          </p>
        </div>
      </div>

      {/* 本文 */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* 格言 */}
        {report.quote && (
          <div style={{
            borderLeft: `2px solid ${t.positive}66`,
            paddingLeft: 20,
            marginBottom: 48,
            opacity: 0.75,
          }}>
            <p style={{ fontFamily: "var(--font-serif-jp)", fontSize: 17, fontWeight: 600, color: t.text, margin: "0 0 8px", lineHeight: 1.85, letterSpacing: "0.03em" }}>
              {report.quote}
            </p>
            {report.quoteAuthor && (
              <p style={{ fontSize: 11, color: t.textMuted, margin: 0, letterSpacing: "0.06em" }}>
                — {report.quoteAuthor}
              </p>
            )}
          </div>
        )}

        {/* 目次 */}
        {headings.length > 0 && (
          <div style={{
            border: `1px solid ${t.border}`,
            background: t.surface,
            padding: "20px 24px",
            marginBottom: 48,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 2, height: 12, background: t.positive, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: t.positive, letterSpacing: "0.14em", fontWeight: 700, opacity: 0.85 }}>目次</span>
            </div>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {headings.map((h, i) => (
                <li key={i} className={h.level === 2 ? "hg-toc-h2" : h.level === 3 ? "hg-toc-h3" : ""} style={{
                  marginBottom: 8,
                  paddingLeft: h.level === 2 ? 16 : h.level === 3 ? 32 : 0,
                  borderLeft: h.level >= 2 ? `1px solid ${t.borderStrong}` : "none",
                }}>
                  <a
                    href={`#${h.id}`}
                    className="hg-toc-link"
                    style={{
                      fontSize: h.level === 1 ? 14 : h.level === 2 ? 13 : 12,
                      color: h.level === 1 ? t.text : h.level === 2 ? t.textSub : t.textMuted,
                      textDecoration: "none",
                      letterSpacing: "0.02em",
                      lineHeight: 1.6,
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
        <div style={{ lineHeight: 1.9, fontSize: 15, color: t.textSub }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h1 id={id} style={{ fontFamily: "var(--font-serif-jp)", fontSize: 26, fontWeight: 700, letterSpacing: "0.03em", color: t.text, margin: "44px 0 18px", borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h2 id={id} style={{ fontFamily: "var(--font-serif-jp)", fontSize: 21, fontWeight: 700, letterSpacing: "0.02em", color: t.text, margin: "38px 0 14px", borderBottom: `1px solid ${t.borderStrong}`, paddingBottom: 9 }}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h3 id={id} style={{ fontSize: 15, fontWeight: 700, color: t.textSub, margin: "28px 0 10px" }}>{children}</h3>
                );
              },
              p: ({ children }) => (
                <p style={{ margin: "0 0 18px", color: t.textSub }}>{children}</p>
              ),
              ul: ({ children }) => (
                <ul style={{ margin: "0 0 18px", paddingLeft: 24, color: t.textSub }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ margin: "0 0 18px", paddingLeft: 24, color: t.textSub }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 6 }}>{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: `3px solid ${t.positive}`,
                  paddingLeft: 16,
                  margin: "24px 0",
                  color: t.textMuted,
                  fontStyle: "italic",
                }}>{children}</blockquote>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.startsWith("language-");
                return isBlock ? (
                  <code style={{
                    display: "block",
                    background: t.surfaceAlt,
                    border: `1px solid ${t.borderStrong}`,
                    padding: "16px",
                    borderRadius: 0,
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono)",
                    color: t.textSub,
                    overflowX: "auto",
                    margin: "18px 0",
                  }}>{children}</code>
                ) : (
                  <code style={{
                    background: t.surfaceAlt,
                    padding: "2px 6px",
                    fontSize: 13,
                    fontFamily: "var(--font-geist-mono)",
                    color: t.textSub,
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
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: `1px solid ${t.borderStrong}`, color: t.textMuted, fontSize: 12, letterSpacing: "0.06em", fontWeight: 600 }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ padding: "8px 12px", borderBottom: `1px solid ${t.borderStrong}`, color: t.textSub }}>{children}</td>
              ),
              hr: () => <hr style={{ border: "none", borderTop: `1px solid ${t.border}`, margin: "32px 0" }} />,
              strong: ({ children }) => <strong style={{ color: t.text, fontWeight: 700 }}>{children}</strong>,
            }}
          >
            {report.content}
          </ReactMarkdown>
        </div>

        {/* 免責事項 */}
        <div style={{
          marginTop: 60,
          padding: "20px 24px",
          border: `1px solid ${t.borderStrong}`,
          background: t.surface,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13 }}>⚠️</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: "0.1em" }}>本レポートについて</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {[
              "本レポートはAI（Hisuigan）によるマクロ経済・市場環境の情報提供を目的としています。",
              "投資助言・売買推奨ではありません。",
              "投資判断・売買の最終決定はご自身の責任で行ってください。",
              "過去の市場動向は将来の結果を保証しません。",
              "投資判断の際は、必ずご自身で最新の一次情報および公式データをご確認ください。",
            ].map((text, i) => (
              <li key={i} style={{ fontSize: 12, color: t.textSub, lineHeight: 1.8, paddingLeft: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: t.textSub }}>–</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* フッター戻りリンク */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
          <Link href="/reports" style={{ fontSize: 13, color: t.positive, textDecoration: "none", letterSpacing: "0.04em" }}>
            ← レポート一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
