// 表示用フォーマットの純粋関数（fs 非依存・クライアント安全）。

// "YYYY-MM-DD" → "YYYY年M月D日"。不正な日付文字列はそのまま返す。
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}
