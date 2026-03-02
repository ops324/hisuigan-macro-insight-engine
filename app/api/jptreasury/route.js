export const revalidate = 3600; // 1時間キャッシュ（財務省CSVは営業日ベース更新）

// 財務省 国債金利情報CSV
// 日銀APIは機械読み取り形式が不安定なため財務省公開CSVを使用（キー不要）
// エンコード：Shift-JIS → TextDecoder で変換
const CSV_URL = "https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv";

const TARGETS = [
  { label: "2年債",  col: "2年"  },
  { label: "5年債",  col: "5年"  },
  { label: "10年債", col: "10年" },
  { label: "30年債", col: "30年" },
];

export async function GET() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

    // Shift-JIS → UTF-8
    const buf = await res.arrayBuffer();
    const text = new TextDecoder("shift-jis").decode(buf);
    const lines = text.trim().split("\n");

    // ヘッダー行（基準日,1年,2年,...）を特定
    const headerLine = lines.find((l) => l.includes("基準日"));
    if (!headerLine) throw new Error("Header row not found");
    const headers = headerLine.split(",");

    // 令和（R）で始まるデータ行のみ抽出
    const dataLines = lines.filter((l) => l.trim().match(/^R\d/));
    if (dataLines.length < 2) throw new Error("Insufficient data rows");

    const latestCols = dataLines[dataLines.length - 1].split(",");
    const prevCols   = dataLines[dataLines.length - 2].split(",");

    const jptreasury = TARGETS.map(({ label, col }) => {
      const idx = headers.indexOf(col);
      if (idx === -1) throw new Error(`Column "${col}" not found`);

      const current  = parseFloat(latestCols[idx]);
      const previous = parseFloat(prevCols[idx]);

      if (isNaN(current)) throw new Error(`Invalid value for ${col}`);

      const change = !isNaN(previous) ? current - previous : null;

      return {
        term:   label,
        value:  `${current.toFixed(3)}%`,
        change: change !== null
          ? `${change >= 0 ? "+" : ""}${change.toFixed(3)}`
          : null,
        trend:  change !== null ? (change >= 0 ? "up" : "down") : null,
      };
    });

    return Response.json({ jptreasury, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
