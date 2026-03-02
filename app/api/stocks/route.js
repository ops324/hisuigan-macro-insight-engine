export const revalidate = 300; // 5分キャッシュ

// Alpha Vantage は25回/日制限に抵触したため Stooq に移行（2026-03-03）
// 米国3指数は実指数データ（^SPX, ^NDX, ^DJI）を使用
// 日経225は Stooq 非対応のため EWJ.US（iShares MSCI Japan ETF）で代替
const SYMBOLS = [
  { symbol: "^SPX",   name: "S&P 500", label: "SPX",  note: null  },
  { symbol: "^NDX",   name: "NASDAQ",  label: "NDX",  note: null  },
  { symbol: "^DJI",   name: "DOW",     label: "DJI",  note: null  },
  { symbol: "EWJ.US", name: "日経225", label: "N225", note: "EWJ" },
];

async function fetchQuote(symbol) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Stooq fetch failed for ${symbol}: ${res.status}`);

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  const row = lines[1]?.split(",");
  if (!row || row.length < 7) throw new Error(`Invalid CSV for ${symbol}`);

  const open  = parseFloat(row[3]);
  const close = parseFloat(row[6]);
  if (isNaN(open) || isNaN(close)) throw new Error(`No data for ${symbol}`);

  return { open, close };
}

export async function GET() {
  try {
    const results = await Promise.all(SYMBOLS.map(({ symbol }) => fetchQuote(symbol)));

    const stocks = SYMBOLS.map(({ name, label, note }, i) => {
      const { open, close } = results[i];
      const change = close - open;
      const pct    = (change / open) * 100;
      const sign   = change >= 0 ? "+" : "";

      return {
        name,
        symbol: label,
        note,
        value:  close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: `${sign}${change.toFixed(2)}`,
        pct:    `${sign}${pct.toFixed(2)}%`,
      };
    });

    return Response.json({ stocks, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
