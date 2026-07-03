"use client";
import { CSSProperties } from "react";
import { splitPanelLines } from "@/lib/format";

// 散文パネル本文を「。」「丸数字」区切りで一文一行に描画する。
// 外側 <p> のスタイルは呼び出し側から注入（パネルごとに異なるため）。
export function PanelText({ text, style }: { text: string; style?: CSSProperties }) {
  const lines = splitPanelLines(text);
  return (
    <p style={style}>
      {lines.map((line, i) => (
        <span
          key={i}
          style={{ display: "block", marginBottom: i < lines.length - 1 ? 4 : 0 }}
        >
          {line}
        </span>
      ))}
    </p>
  );
}
