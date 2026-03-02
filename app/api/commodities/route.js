export const revalidate = 900; // 15分キャッシュ

// Yahoo Finance は認証必須化のため Stooq を使用（無料・キー不要）
// 変動はStooqから前日終値を取得できないため当日始値比（日中変動）で代用
const SYMBOLS = [
  { symbol: "cl.f", name: "WTI原油", unit: "USD/bbl" },
  { symbol: "gc.f", name: "金",      unit: "USD/oz"  },
  { symbol: "si.f", name: "銀",      unit: "USD/oz"  },
  { symbol: "hg.f", name: "銅",      unit: "cents/lb" },
];

async function fetchQuote(symbol) {
  const url = `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stooq fetch failed for ${symbol}: ${res.status}`);

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  // lines[0] = header, lines[1] = data
  const row = lines[1]?.split(",");
  if (!row || row.length < 7) throw new Error(`Invalid CSV for ${symbol}`);

  const open  = parseFloat(row[3]);
  const close = parseFloat(row[6]);
  if (isNaN(open) || isNaN(close)) throw new Error(`No data for ${symbol}`);

  return { open, close };
}

function fmt(num, decimals) {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export async function GET() {
  try {
    const results = await Promise.all(SYMBOLS.map(({ symbol }) => fetchQuote(symbol)));

    const commodities = SYMBOLS.map(({ name, unit }, i) => {
      const { open, close } = results[i];
      const change = close - open;
      const pct    = (change / open) * 100;

      // 銅はcents/lb のためそのまま表示（単位に明記）
      const decimals = name === "銅" ? 2 : name === "銀" ? 2 : 2;
      const sign = change >= 0 ? "+" : "";

      return {
        name,
        unit,
        value:  fmt(close, decimals),
        change: `${sign}${fmt(change, decimals)}`,
        pct:    `${sign}${pct.toFixed(2)}%`,
      };
    });

    return Response.json({ commodities, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
