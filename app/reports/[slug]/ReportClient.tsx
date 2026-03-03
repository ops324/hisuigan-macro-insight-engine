"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Report, ReportType } from "@/lib/reports";
import { themeMap, ThemeMode } from "@/lib/theme";

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
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (!match) return null;
      const level = match[1].length;
      const text = match[2].trim();
      return { level, text, id: slugify(text) };
    })
    .filter((h): h is Heading => h !== null);
}

export default function ReportClient({ report }: { report: Report }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
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

  const headings = extractHeadings(report.content);

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "var(--font-geist-sans)" }}>
      {/* ヘッダー */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: t.headerBg, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 16, height: 56 }}>
          <div style={{ width: 3, height: 20, background: JADE, flexShrink: 0 }} />
          <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: t.text, textDecoration: "none" }}>
            翡翠眼
          </Link>
          <span style={{ color: t.textMuted, fontSize: 14 }}>/</span>
          <Link href="/reports" style={{ fontSize: 14, color: t.textSub, textDecoration: "none", letterSpacing: "0.05em" }}>
            レポート
          </Link>
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={toggleTheme}
              style={{ background: "none", border: `1px solid ${t.border}`, color: t.textSub, cursor: "pointer", padding: "4px 10px", fontSize: 12, letterSpacing: "0.04em" }}
            >
              {mode === "dark" ? "LIGHT" : "DARK"}
            </button>
          </div>
        </div>
      </header>

      {/* 記事ヘッダー */}
      <div style={{ borderBottom: `1px solid ${t.border}`, background: t.surface, padding: "32px 0" }}>
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
            <span style={{ fontSize: 11, color: t.textMuted, letterSpacing: "0.08em" }}>
              {TYPE_SUBTITLES[report.type]}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px", color: t.text, lineHeight: 1.4, letterSpacing: "0.02em" }}>
            {report.title}
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0, fontFamily: "var(--font-geist-mono)" }}>
            {formatDate(report.date)}
          </p>
        </div>
      </div>

      {/* 本文 */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* 格言 */}
        {report.quote && (
          <div style={{
            borderLeft: `2px solid ${JADE}66`,
            paddingLeft: 20,
            marginBottom: 48,
            opacity: 0.75,
          }}>
            <p style={{ fontSize: 13, color: t.textSub, fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.8 }}>
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
            <div style={{ fontSize: 11, color: JADE, letterSpacing: "0.12em", fontWeight: 600, marginBottom: 14 }}>
              目次
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
                      color: h.level === 1 ? t.textSub : t.textMuted,
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
        <div style={{ lineHeight: 1.9, fontSize: 15, color: t.textSub }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h1 id={id} style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: "40px 0 16px", borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
                    {children}
                  </h1>
                );
              },
              h2: ({ children }) => {
                const id = slugify(nodeToText(children));
                return (
                  <h2 id={id} style={{ fontSize: 18, fontWeight: 700, color: t.text, margin: "36px 0 14px", borderBottom: `1px solid ${t.borderStrong}`, paddingBottom: 8 }}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => (
                <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textSub, margin: "28px 0 10px" }}>{children}</h3>
              ),
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
                  borderLeft: `3px solid ${JADE}`,
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
              <li key={i} style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.8, paddingLeft: 12, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: t.textMuted }}>–</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* フッター戻りリンク */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
          <Link href="/reports" style={{ fontSize: 13, color: JADE, textDecoration: "none", letterSpacing: "0.04em" }}>
            ← レポート一覧に戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
