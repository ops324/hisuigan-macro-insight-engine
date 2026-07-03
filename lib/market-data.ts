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

// gold-api.com のレスポンス（{ price: number, ... }）から USD 建て価格を取り出す。
// 欠損・非数値は throw する（無言で誤値を返さない）。
export function parseGoldApiPrice(json: unknown): number {
  const price = (json as { price?: unknown } | null)?.price;
  if (typeof price !== "number" || isNaN(price)) {
    throw new Error("Invalid gold-api response: missing or non-numeric price");
  }
  return price;
}

// Swissquote 公開フィード（配列・各要素に spreadProfilePrices[].bid/ask）から
// mid 価格（(bid+ask)/2）を取り出す。数値の bid/ask を持つ最初のプロファイルを採用。
export function parseSwissquotePrice(json: unknown): number {
  const entries = Array.isArray(json) ? json : [];
  for (const entry of entries) {
    const profiles = (entry as { spreadProfilePrices?: unknown })?.spreadProfilePrices;
    if (!Array.isArray(profiles)) continue;
    for (const p of profiles) {
      const bid = (p as { bid?: unknown })?.bid;
      const ask = (p as { ask?: unknown })?.ask;
      if (typeof bid === "number" && typeof ask === "number" && !isNaN(bid) && !isNaN(ask)) {
        return (bid + ask) / 2;
      }
    }
  }
  throw new Error("Invalid Swissquote response: no numeric bid/ask");
}

// Yahoo Finance chart API（{ chart: { result: [{ meta: { regularMarketPrice } }] } }）から
// 直近価格を取り出す。chart.error や欠損・非数値は throw する。
export function parseYahooChartPrice(json: unknown): number {
  const chart = (json as { chart?: { error?: unknown; result?: unknown } } | null)?.chart;
  if (chart?.error) throw new Error(`Yahoo chart error: ${JSON.stringify(chart.error)}`);
  const meta = (Array.isArray(chart?.result) ? chart!.result[0] : undefined) as
    | { meta?: { regularMarketPrice?: unknown } }
    | undefined;
  const price = meta?.meta?.regularMarketPrice;
  if (typeof price !== "number" || isNaN(price)) {
    throw new Error("Invalid Yahoo response: missing or non-numeric regularMarketPrice");
  }
  return price;
}

// FRED の銅系列（PCOPPUSDM＝USD/メトリックトン）を USD/lb へ換算する。
// 1 メトリックトン = 2204.6226 lb。gold-api の銅（USD/lb）と単位を揃えるための最終手段。
export function usdPerTonneToLb(usdPerTonne: number): number {
  return usdPerTonne / 2204.6226;
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

// FRED の株価指数系列（Stooq API 廃止に伴い 2026-07-04 移行）。日次終値・約1営業日遅れ。
const STOCK_SYMBOLS = [
  { seriesId: "SP500", name: "S&P 500", label: "SPX", note: null as string | null },
  { seriesId: "NASDAQ100", name: "NASDAQ", label: "NDX", note: null as string | null },
  { seriesId: "DJIA", name: "DOW", label: "DJI", note: null as string | null },
  { seriesId: "NIKKEI225", name: "日経225", label: "N225", note: null as string | null },
];

// 金・銀・銅は USD 建てスポット（リアルタイム・前日比なし）を JPY 換算して表示。
// 単一ソース障害で「---」になるのを避けるため、無料・キー不要のソースを多段フォールバック
// （主 gold-api.com → 予備 Swissquote 公開フィード → Yahoo Finance）。
// 銅は Swissquote 非対応のため gold-api → Yahoo → FRED 月次（最終手段・単位換算あり）。
// 単位：金銀＝USD/oz、銅＝USD/lb で各ソースを揃える。
const METAL_SYMBOLS = [
  {
    name: "金",
    unit: "円/oz",
    sources: (rev: number): (() => Promise<number>)[] => [
      () => fetchGoldApiPrice("XAU", rev),
      () => fetchSwissquotePrice("XAU", rev),
      () => fetchYahooPrice("GC=F", rev),
    ],
  },
  {
    name: "銀",
    unit: "円/oz",
    sources: (rev: number): (() => Promise<number>)[] => [
      () => fetchGoldApiPrice("XAG", rev),
      () => fetchSwissquotePrice("XAG", rev),
      () => fetchYahooPrice("SI=F", rev),
    ],
  },
  {
    name: "銅",
    unit: "円/lb",
    sources: (rev: number): (() => Promise<number>)[] => [
      () => fetchGoldApiPrice("HG", rev),
      () => fetchYahooPrice("HG=F", rev),
      () => fetchFredCopperPerLb(rev),
    ],
  },
];

// WTI 原油は FRED のスポット系列（EIA 由来・数営業日遅れ・前日比あり）。
const WTI = { seriesId: "DCOILWTICO", name: "WTI原油", unit: "円/bbl" };

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

// FRED_API_KEY を取得する。未設定は throw（呼び出し側の allSettled で吸収され UI は「---」表示。
// 原因が無言にならないよう警告を残す）。
function requireFredApiKey(): string {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn("[market-data] FRED_API_KEY 未設定のため FRED 系列は取得できません（.env.example 参照）");
    throw new Error("FRED_API_KEY not configured");
  }
  return apiKey;
}

// FRED 系列の直近有効値2件（"." 欠損スキップ）を返す。株式指数・WTI・米国債で共用。
async function fetchFredLatestTwo(
  seriesId: string,
  apiKey: string,
  revalidate: number
): Promise<{ current: number; previous: number | null }> {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&sort_order=desc&limit=10&file_type=json`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`FRED fetch failed for ${seriesId}: ${res.status}`);
  const data = await res.json();
  if (data.error_message) throw new Error(data.error_message);
  return pickLatestTwoValidFred(data.observations);
}

// gold-api.com から USD 建てスポット価格を取得する。
async function fetchGoldApiPrice(symbol: string, revalidate: number): Promise<number> {
  const url = `https://api.gold-api.com/price/${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`gold-api fetch failed for ${symbol}: ${res.status}`);
  return parseGoldApiPrice(await res.json());
}

// Swissquote 公開フィードから USD 建てスポット価格（mid）を取得する（金銀のみ・キー不要）。
async function fetchSwissquotePrice(base: string, revalidate: number): Promise<number> {
  const url = `https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/${encodeURIComponent(base)}/USD`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`Swissquote fetch failed for ${base}: ${res.status}`);
  return parseSwissquotePrice(await res.json());
}

// Yahoo Finance chart API から直近価格を取得する（レート制限あり・フォールバック専用）。
async function fetchYahooPrice(ticker: string, revalidate: number): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    next: { revalidate },
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo fetch failed for ${ticker}: ${res.status}`);
  return parseYahooChartPrice(await res.json());
}

// FRED の銅系列（PCOPPUSDM＝USD/トン・月次）を USD/lb に換算して取得する（銅の最終手段）。
async function fetchFredCopperPerLb(revalidate: number): Promise<number> {
  const { current } = await fetchFredLatestTwo("PCOPPUSDM", requireFredApiKey(), revalidate);
  return usdPerTonneToLb(current);
}

// フォールバックチェーン。先頭から順に試し、最初に成功した値を返す。全滅時は最後の例外を投げる。
export async function firstOk<T>(sources: (() => Promise<T>)[]): Promise<T> {
  let lastErr: unknown;
  for (const source of sources) {
    try {
      return await source();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("all sources failed");
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

// 株式指数。FRED の日次終値。1銘柄失敗しても他は表示（allSettled）。change は前日終値比。
export async function getStocks(): Promise<{ stocks: StockItem[]; updatedAt: string }> {
  const apiKey = requireFredApiKey();
  const results = await Promise.allSettled(
    STOCK_SYMBOLS.map(({ seriesId }) => fetchFredLatestTwo(seriesId, apiKey, 3600))
  );
  const stocks = STOCK_SYMBOLS.map(({ name, label, note }, i): StockItem => {
    const r = results[i];
    if (r.status !== "fulfilled") return { name, symbol: label, note, value: null, change: null, pct: null };
    const { current, previous } = r.value;
    const change = previous !== null ? current - previous : null;
    const pct = change !== null && previous !== 0 ? (change / previous!) * 100 : null;
    return {
      name,
      symbol: label,
      note,
      value: current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: change !== null ? signed(change, 2) : null,
      pct: pct !== null ? `${signed(pct, 2)}%` : null,
    };
  });
  return { stocks, updatedAt: new Date().toISOString() };
}

// コモディティ。JPY 換算。金・銀・銅は多段フォールバック（リアルタイム・前日比なし）、
// WTI は FRED（数営業日遅れ・前日比あり）。1銘柄失敗しても他は表示。USD/JPY 取得失敗時は全 null。
export async function getCommodities(): Promise<{ commodities: CommodityItem[]; updatedAt: string }> {
  // WTI はキー未設定でも金・銀・銅を巻き込まないよう async ラッパで throw を吸収する
  const [wtiResult, metalResults, usdJpyResult] = await Promise.all([
    Promise.allSettled([(async () => fetchFredLatestTwo(WTI.seriesId, requireFredApiKey(), 3600))()]),
    Promise.allSettled(METAL_SYMBOLS.map(({ sources }) => firstOk(sources(900)))),
    Promise.allSettled([fetchUsdJpy(900)]),
  ]);
  const usdJpy = usdJpyResult[0].status === "fulfilled" ? usdJpyResult[0].value : null;

  const wti = ((): CommodityItem => {
    const r = wtiResult[0];
    if (usdJpy == null || r.status !== "fulfilled") {
      return { name: WTI.name, unit: WTI.unit, value: null, change: null, pct: null };
    }
    const { current, previous } = r.value;
    const { closeJpy, change, pct } = commodityJpyValues(previous ?? current, current, usdJpy, false);
    return {
      name: WTI.name,
      unit: WTI.unit,
      value: `¥${fmt(closeJpy, 0)}`,
      change: previous !== null ? `${change >= 0 ? "+" : "-"}¥${fmt(Math.abs(change), 0)}` : null,
      pct: previous !== null ? `${signed(pct, 2)}%` : null,
    };
  })();

  const metals = METAL_SYMBOLS.map(({ name, unit }, i): CommodityItem => {
    const r = metalResults[i];
    if (usdJpy == null || r.status !== "fulfilled") return { name, unit, value: null, change: null, pct: null };
    return { name, unit, value: `¥${fmt(r.value * usdJpy, 0)}`, change: null, pct: null };
  });

  return { commodities: [wti, ...metals], updatedAt: new Date().toISOString() };
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
  const apiKey = requireFredApiKey();
  const results = await Promise.allSettled(
    FRED_SERIES.map(({ id }) => fetchFredLatestTwo(id, apiKey, 3600))
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
