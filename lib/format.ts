// 表示用フォーマットの純粋関数（fs 非依存・クライアント安全）。

// "YYYY-MM-DD" → "YYYY年M月D日"。不正な日付文字列はそのまま返す。
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

// 密な散文パネル本文を表示用の行に分割する。
// - 句点「。」の直後で改行
// - 丸数字 ①..⑳（列挙見出し）の直前で改行
// 複合語の「・」は割らない。空行はトリムして除去。
export function splitPanelLines(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/。/g, "。\n")
    .replace(/(?=[①-⑳])/g, "\n") // ①..⑳ の直前
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
