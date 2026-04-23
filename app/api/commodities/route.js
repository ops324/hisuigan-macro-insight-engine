export const revalidate = 900; // 15分キャッシュ

// Yahoo Finance は認証必須化のため Stooq を使用（無料・キー不要）
// 変動はStooqから前日終値を取得できないため当日始値比（日中変動）で代用
const SYMBOLS = [
  { symbol: "cl.f", name: "WTI原油", unit: "円/bbl",  isCents: false },
  { symbol: "gc.f", name: "金",      unit: "円/oz",   isCents: false },
  { symbol: "si.f", name: "銀",      unit: "円/oz",   isCents: false },
  { symbol: "hg.f", name: "銅",      unit: "円/lb",   isCents: true  },
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

async function fetchUsdJpy() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error("Failed to fetch USD/JPY rate");
  const data = await res.json();
  return data.rates["JPY"];
}

function fmt(num, decimals) {
  return num.toLocaleString("ja-JP", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export async function GET() {
  try {
    const [results, usdJpy] = await Promise.all([
      Promise.all(SYMBOLS.map(({ symbol }) => fetchQuote(symbol))),
      fetchUsdJpy(),
    ]);

    const commodities = SYMBOLS.map(({ name, unit, isCents }, i) => {
      const { open, close } = results[i];
      // 銅はcents/lb → USD/lb に変換してからJPY換算
      const rate = isCents ? usdJpy / 100 : usdJpy;
      const closeJpy = close * rate;
      const openJpy  = open  * rate;
      const change   = closeJpy - openJpy;
      const pct      = (change / openJpy) * 100;
      const sign     = change >= 0 ? "+" : "";

      return {
        name,
        unit,
        value:  `¥${fmt(closeJpy, 0)}`,
        change: `${sign}¥${fmt(change, 0)}`,
        pct:    `${sign}${pct.toFixed(2)}%`,
      };
    });

    return Response.json({ commodities, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
