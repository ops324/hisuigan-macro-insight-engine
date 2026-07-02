// 市場データの取得・整形ロジック。
// API routes（薄いラッパ）と /market の Server Component の双方から呼ばれる単一の正。
// 純粋関数（parse*/convert*）はユニットテスト対象。

export interface StockItem {
  name: string;
  symbol: string;
  note: string | null;
  value: string | null;
  change: string | null;
  pct: string | null;
}

export interface ForexItem {
  pair: string;
  value: string | null;
  change: string | null;
  pct: string | null;
}

export interface TreasuryItem {
  term: string;
  value: string | null;
  change: string | null;
  trend: "up" | "down" | null;
}

export interface CommodityItem {
  name: string;
  unit: string;
  value: string | null;
  change: string | null;
  pct: string | null;
}

export interface FredObservation {
  value: string;
}

// ───────────────────────── 純粋関数（テスト対象） ─────────────────────────

// Stooq CSV（s,d,t,o,h,l,c,v）の data 行から始値・終値を取り出す。
// 列順崩れ・欠損は throw する（無言で誤値を返さない）。
export function parseStooqCsv(csv: string): { open: number; close: number } {
  const lines = csv.trim().split("\n");
  const row = lines[1]?.split(",");
  if (!row || row.length < 7) throw new Error("Invalid Stooq CSV: insufficient columns");
  const open = parseFloat(row[3]);
  const close = parseFloat(row[6]);
  if (isNaN(open) || isNaN(close)) throw new Error("Invalid Stooq CSV: non-numeric OHLC");
  return { open, close };
}

// コモディティの USD（または cents）建て価格を JPY 換算した数値群を返す。
// 銅は cents/lb なので rate を 1/100 する。
export function commodityJpyValues(
  open: number,
  close: number,
  usdJpy: number,
  isCents: boolean
): { closeJpy: number; openJpy: number; change: number; pct: number } {
  const rate = isCents ? usdJpy / 100 : usdJpy;
  const closeJpy = close * rate;
  const openJpy = open * rate;
  const change = closeJpy - openJpy;
  const pct = openJpy !== 0 ? (change / openJpy) * 100 : 0;
  return { closeJpy, openJpy, change, pct };
}

// FRED observations（降順）から "." 欠損を除いた直近2件を返す。
export function pickLatestTwoValidFred(
  observations: FredObservation[]
): { current: number; previous: number | null } {
  const valid = (observations ?? []).filter((o) => o.value !== ".");
  if (valid.length === 0) throw new Error("No valid FRED observations");
  return {
    current: parseFloat(valid[0].value),
    previous: valid.length > 1 ? parseFloat(valid[1].value) : null,
  };
}

// 財務省 JGB CSV をパースし、対象年限ごとに直近・前営業日の利回りを返す。
// 末尾の注記行を避けるため「R」（令和）始まりの行のみをデータ行とみなす。
export function parseJgbCsv(
  text: string,
  targets: { label: string; col: string }[]
): { term: string; current: number; previous: number | null }[] {
  const lines = text.trim().split("\n");
  const headerLine = lines.find((l) => l.includes("基準日"));
  if (!headerLine) throw new Error("JGB header row not found");
  const headers = headerLine.split(",");

  const dataLines = lines.filter((l) => l.trim().match(/^R\d/));
  if (dataLines.length < 1) throw new Error("JGB: insufficient data rows");

  const latestCols = dataLines[dataLines.length - 1].split(",");
  const prevCols = dataLines.length >= 2 ? dataLines[dataLines.length - 2].split(",") : null;

  return targets.map(({ label, col }) => {
    const idx = headers.indexOf(col);
    if (idx === -1) throw new Error(`JGB column "${col}" not found`);
    const current = parseFloat(latestCols[idx]);
    if (isNaN(current)) throw new Error(`JGB invalid value for ${col}`);
    const previous = prevCols ? parseFloat(prevCols[idx]) : NaN;
    return { term: label, current, previous: isNaN(previous) ? null : previous };
  });
}

// 符号付き文字列（+1.23 / -1.23）。
function signed(n: number, decimals: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}`;
}

// ───────────────────────── 取得関数（Server / route 共用） ─────────────────────────

const STOCK_SYMBOLS = [
  { symbol: "^SPX", name: "S&P 500", label: "SPX", note: null as string | null },
  { symbol: "^NDX", name: "NASDAQ", label: "NDX", note: null as string | null },
  { symbol: "^DJI", name: "DOW", label: "DJI", note: null as string | null },
  { symbol: "EWJ.US", name: "日経225", label: "N225", note: "EWJ" as string | null },
];

const COMMODITY_SYMBOLS = [
  { symbol: "cl.f", name: "WTI原油", unit: "円/bbl", isCents: false },
  { symbol: "gc.f", name: "金", unit: "円/oz", isCents: false },
  { symbol: "si.f", name: "銀", unit: "円/oz", isCents: false },
  { symbol: "hg.f", name: "銅", unit: "円/lb", isCents: true },
];

const FRED_SERIES = [
  { id: "DGS2", term: "2年債" },
  { id: "DGS5", term: "5年債" },
  { id: "DGS10", term: "10年債" },
  { id: "DGS30", term: "30年債" },
];

const JGB_TARGETS = [
  { label: "2年債", col: "2年" },
  { label: "5年債", col: "5年" },
  { label: "10年債", col: "10年" },
  { label: "30年債", col: "30年" },
];

const JGB_CSV_URL = "https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv";

async function fetchStooq(symbol: string, revalidate: number): Promise<{ open: number; close: number }> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Stooq fetch failed for ${symbol}: ${res.status}`);
  return parseStooqCsv(await res.text());
}

async function fetchUsdJpy(revalidate: number): Promise<number> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate } });
  if (!res.ok) throw new Error("Failed to fetch USD/JPY rate");
  const data = await res.json();
  return data.rates["JPY"];
}

function fmt(num: number, decimals: number): string {
  return num.toLocaleString("ja-JP", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// 株式指数。1銘柄失敗しても他は表示（allSettled）。change は当日始値比（日中変動）。
export async function getStocks(): Promise<{ stocks: StockItem[]; updatedAt: string }> {
  const results = await Promise.allSettled(STOCK_SYMBOLS.map(({ symbol }) => fetchStooq(symbol, 300)));
  const stocks = STOCK_SYMBOLS.map(({ name, label, note }, i): StockItem => {
    const r = results[i];
    if (r.status !== "fulfilled") return { name, symbol: label, note, value: null, change: null, pct: null };
    const { open, close } = r.value;
    const change = close - open;
    const pct = (change / open) * 100;
    return {
      name,
      symbol: label,
      note,
      value: close.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: signed(change, 2),
      pct: `${signed(pct, 2)}%`,
    };
  });
  return { stocks, updatedAt: new Date().toISOString() };
}

// コモディティ。JPY 換算。1銘柄失敗しても他は表示。USD/JPY 取得失敗時は全 null。
export async function getCommodities(): Promise<{ commodities: CommodityItem[]; updatedAt: string }> {
  const [quoteResults, usdJpyResult] = await Promise.all([
    Promise.allSettled(COMMODITY_SYMBOLS.map(({ symbol }) => fetchStooq(symbol, 900))),
    Promise.allSettled([fetchUsdJpy(900)]),
  ]);
  const usdJpy = usdJpyResult[0].status === "fulfilled" ? usdJpyResult[0].value : null;
  const commodities = COMMODITY_SYMBOLS.map(({ name, unit, isCents }, i): CommodityItem => {
    const r = quoteResults[i];
    if (usdJpy == null || r.status !== "fulfilled") return { name, unit, value: null, change: null, pct: null };
    const { open, close } = r.value;
    const { closeJpy, change, pct } = commodityJpyValues(open, close, usdJpy, isCents);
    return {
      name,
      unit,
      value: `¥${fmt(closeJpy, 0)}`,
      change: `${change >= 0 ? "+" : "-"}¥${fmt(Math.abs(change), 0)}`,
      pct: `${signed(pct, 2)}%`,
    };
  });
  return { commodities, updatedAt: new Date().toISOString() };
}

// 為替。USD・EUR の2エンドポイント。取得できたペアだけ表示。前日比は無料版で取得不可。
export async function getForex(): Promise<{ forex: ForexItem[]; updatedAt: string }> {
  const [usdR, eurR] = await Promise.allSettled([
    fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 60 } }).then((r) => {
      if (!r.ok) throw new Error(`USD ${r.status}`);
      return r.json();
    }),
    fetch("https://open.er-api.com/v6/latest/EUR", { next: { revalidate: 60 } }).then((r) => {
      if (!r.ok) throw new Error(`EUR ${r.status}`);
      return r.json();
    }),
  ]);
  const usd = usdR.status === "fulfilled" ? usdR.value : null;
  const eur = eurR.status === "fulfilled" ? eurR.value : null;

  const usdJpy = usd?.rates?.["JPY"] ?? null;
  const eurJpy = eur?.rates?.["JPY"] ?? null;
  const eurUsd = usd?.rates?.["EUR"] ? 1 / usd.rates["EUR"] : eur?.rates?.["USD"] ? 1 / eur.rates["USD"] : null;
  const gbpJpy = eur?.rates?.["JPY"] && eur?.rates?.["GBP"] ? eur.rates["JPY"] / eur.rates["GBP"] : null;

  const mk = (pair: string, value: number | null, decimals: number): ForexItem => ({
    pair,
    value: value != null ? value.toFixed(decimals) : null,
    change: null,
    pct: null,
  });

  const forex: ForexItem[] = [
    mk("USD/JPY", usdJpy, 2),
    mk("EUR/JPY", eurJpy, 2),
    mk("EUR/USD", eurUsd, 4),
    mk("GBP/JPY", gbpJpy, 2),
  ];
  return { forex, updatedAt: new Date().toISOString() };
}

// 米国債。FRED。系列ごと allSettled。
export async function getUsTreasury(): Promise<{ ustreasury: TreasuryItem[]; updatedAt: string }> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    // throw は呼び出し側の allSettled で吸収され UI は「---」表示になる。原因が無言にならないよう警告を残す
    console.warn("[market-data] FRED_API_KEY 未設定のため米国債利回りは取得できません（.env.example 参照）");
    throw new Error("FRED_API_KEY not configured");
  }

  const results = await Promise.allSettled(
    FRED_SERIES.map(async ({ id }) => {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=${id}&api_key=${apiKey}&sort_order=desc&limit=10&file_type=json`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) throw new Error(`FRED fetch failed for ${id}: ${res.status}`);
      const data = await res.json();
      if (data.error_message) throw new Error(data.error_message);
      return pickLatestTwoValidFred(data.observations);
    })
  );

  const ustreasury = FRED_SERIES.map(({ term }, i): TreasuryItem => {
    const r = results[i];
    if (r.status !== "fulfilled") return { term, value: null, change: null, trend: null };
    const { current, previous } = r.value;
    const change = previous !== null ? current - previous : null;
    return {
      term,
      value: `${current.toFixed(3)}%`,
      change: change !== null ? signed(change, 3) : null,
      trend: change !== null ? (change >= 0 ? "up" : "down") : null,
    };
  });
  return { ustreasury, updatedAt: new Date().toISOString() };
}

// 日本国債。財務省 CSV（Shift-JIS）。単一ソースのため取得失敗は全体エラー。
export async function getJpTreasury(): Promise<{ jptreasury: TreasuryItem[]; updatedAt: string }> {
  const res = await fetch(JGB_CSV_URL, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`JGB CSV fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("shift-jis").decode(buf);

  const parsed = parseJgbCsv(text, JGB_TARGETS);
  const jptreasury = parsed.map(({ term, current, previous }): TreasuryItem => {
    const change = previous !== null ? current - previous : null;
    return {
      term,
      value: `${current.toFixed(3)}%`,
      change: change !== null ? signed(change, 3) : null,
      trend: change !== null ? (change >= 0 ? "up" : "down") : null,
    };
  });
  return { jptreasury, updatedAt: new Date().toISOString() };
}
