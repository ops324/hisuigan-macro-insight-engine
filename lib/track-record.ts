// 長期（6M+）予測精度の測定インフラ（純粋関数・fs 非依存＝クライアントでも利用可）
// テスト：lib/__tests__/history.test.ts
//
// 設計メモ：
// - metrics.json は営業日粒度のため、horizonDays は「系列上で何点先か」（営業日数）で扱う。
// - 債券（利回り）は変化を pt（差分）で、株・為替・コモディティは % で測る。
// - 6M ホライズンの独立観測は年に数個しか得られない（重複窓を間引くと激減）。
//   IC は必ず sampleNonOverlapping を通し、有効 N を併記して読むこと。

import type { Direction, LongTermView, MetricPoint, MetricsHistory, PredictionRecord } from "./history";

export type AssetClass = "equity" | "yield" | "fx" | "commodity";

// 主要ホライズン（営業日）。6M=主・12M=副・1M/3M=暫定（標本僅少・重複窓）
export const HORIZONS = { m1: 21, m3: 63, m6: 126, m12: 252 } as const;

// 資産クラス別の中立バンドと測定モード（pt 差分 or % 変化）
export const ASSET_BANDS: Record<AssetClass, { band: number; mode: "pct" | "abs" }> = {
  equity: { band: 1.0, mode: "pct" }, // ±1.0%
  yield: { band: 0.15, mode: "abs" }, // ±0.15pt
  fx: { band: 0.5, mode: "pct" }, // ±0.5%
  commodity: { band: 1.5, mode: "pct" }, // ±1.5%
};

// ラベルから資産クラスを推定。利回りを先に判定（「金」とコモディティの衝突回避）
export function assetClassOf(label: string): AssetClass {
  if (/債|利回り|金利|イールド|treasury|jgb|\d+年/i.test(label)) return "yield";
  if (/原油|wti|ブレント|天然ガス|金|銀|銅|プラチナ|gold|silver|oil/i.test(label)) return "commodity";
  if (/\/|円|ドル|ユーロ|ポンド|usd|jpy|eur|gbp/i.test(label)) return "fx";
  return "equity";
}

// 前方 N 営業日の変化。mode="pct" は % 変化、"abs" は差分（利回り pt 用）。
// fromDate に一致点がなければ fromDate 以降の最初の点を起点にする。窓未到達は null。
export function forwardReturn(
  points: MetricPoint[],
  fromDate: string,
  horizonDays: number,
  mode: "pct" | "abs" = "pct",
): number | null {
  if (!points || points.length === 0) return null;
  let i = points.findIndex((p) => p.date === fromDate);
  if (i < 0) i = points.findIndex((p) => p.date >= fromDate);
  if (i < 0) return null;
  const j = i + horizonDays;
  if (j >= points.length) return null;
  const a = points[i].numericValue;
  const b = points[j].numericValue;
  if (a == null || b == null) return null;
  if (mode === "abs") return b - a;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

// 重複窓を排した観測列を返す（窓長間隔で間引く＝独立性確保）。IC は必ずこれを通す。
export function sampleNonOverlapping<T>(items: T[], step: number): T[] {
  if (step < 1) return items.slice();
  const out: T[] = [];
  for (let i = 0; i < items.length; i += step) out.push(items[i]);
  return out;
}

// 変化量と中立バンドから方向を判定
export function directionFromChange(change: number, band: number): Direction {
  if (change > band) return "up";
  if (change < -band) return "down";
  return "neutral";
}

export interface AssetScore {
  asset: string;
  bias: Direction;
  forwardChange: number | null;
  realized: Direction | null;
  match: boolean | null;
}

// 各資産の長期方向バイアスを、その資産の前方変化で採点（資産別バンド・モード）
export function assetLongViewScore(
  views: LongTermView[],
  metricsHistory: MetricsHistory,
  fromDate: string,
  horizonDays: number,
  bandOverrides?: Partial<Record<AssetClass, number>>,
): AssetScore[] {
  return views.map((v) => {
    const points = metricsHistory[v.asset] ?? [];
    const cls = assetClassOf(v.asset);
    const { band: defBand, mode } = ASSET_BANDS[cls];
    const band = bandOverrides?.[cls] ?? defBand;
    const change = forwardReturn(points, fromDate, horizonDays, mode);
    if (change == null) {
      return { asset: v.asset, bias: v.bias, forwardChange: null, realized: null, match: null };
    }
    const realized = directionFromChange(change, band);
    return { asset: v.asset, bias: v.bias, forwardChange: change, realized, match: v.bias === realized };
  });
}

// スピアマン順位相関（IC）と有効 N。タイは単純順位（小標本用途のため平均順位化はしない）。
// 期待符号は負：stance（守り）が高いほど先安。
export function informationCoefficient(pairs: Array<[number, number]>): { ic: number | null; n: number } {
  const n = pairs.length;
  if (n < 2) return { ic: null, n };
  const rank = (vals: number[]): number[] => {
    const order = vals.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(n).fill(0);
    order.forEach(([, idx], k) => {
      r[idx] = k + 1;
    });
    return r;
  };
  const rx = rank(pairs.map((p) => p[0]));
  const ry = rank(pairs.map((p) => p[1]));
  const mean = (n + 1) / 2;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (rx[i] - mean) * (ry[i] - mean);
    vx += (rx[i] - mean) ** 2;
    vy += (ry[i] - mean) ** 2;
  }
  if (vx === 0 || vy === 0) return { ic: null, n };
  return { ic: cov / Math.sqrt(vx * vy), n };
}

export interface StanceReturnPair {
  stance: number;
  forwardReturn: number;
}

// predictions の各 stance に、指定資産系列の前方リターンを対応付け（窓到達分のみ）
export function stanceForwardPairs(
  predictions: PredictionRecord[],
  series: MetricPoint[],
  horizonDays: number,
): StanceReturnPair[] {
  const out: StanceReturnPair[] = [];
  for (const p of predictions) {
    const fr = forwardReturn(series, p.date, horizonDays, "pct");
    if (fr != null) out.push({ stance: p.stance, forwardReturn: fr });
  }
  return out;
}

// リスクオフ(≥65)/中立/リスクオン(≤45)群別の平均前方リターン
export function bucketedForwardReturns(pairs: StanceReturnPair[]): {
  riskOff: { n: number; mean: number | null };
  neutral: { n: number; mean: number | null };
  riskOn: { n: number; mean: number | null };
} {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const off = pairs.filter((p) => p.stance >= 65).map((p) => p.forwardReturn);
  const on = pairs.filter((p) => p.stance <= 45).map((p) => p.forwardReturn);
  const neu = pairs.filter((p) => p.stance > 45 && p.stance < 65).map((p) => p.forwardReturn);
  return {
    riskOff: { n: off.length, mean: mean(off) },
    neutral: { n: neu.length, mean: mean(neu) },
    riskOn: { n: on.length, mean: mean(on) },
  };
}

// 見立て滑らかさ：隣接エントリ間の stance 変化の平均/最大（長期ゲージの安定度）
export function stanceSmoothness(stances: number[]): { meanStep: number | null; maxStep: number | null } {
  if (stances.length < 2) return { meanStep: null, maxStep: null };
  const steps: number[] = [];
  for (let i = 1; i < stances.length; i++) steps.push(Math.abs(stances[i] - stances[i - 1]));
  return {
    meanStep: steps.reduce((a, b) => a + b, 0) / steps.length,
    maxStep: Math.max(...steps),
  };
}

// 短期サニティ層：日次±1%S&P方向採点の的中率と「常に中立」素朴ベースライン比
export function shortTermSummary(predictions: PredictionRecord[]): {
  resolved: number;
  hitRate: number | null;
  naiveHitRate: number | null;
  edge: number | null;
} {
  const resolved = predictions.filter((p) => p.outcome && p.outcome.spxDirection);
  const n = resolved.length;
  if (!n) return { resolved: 0, hitRate: null, naiveHitRate: null, edge: null };
  const hits = resolved.filter((p) => p.outcome!.match).length;
  const naive = resolved.filter((p) => p.outcome!.spxDirection === "neutral").length;
  const hitRate = (hits / n) * 100;
  const naiveHitRate = (naive / n) * 100;
  return { resolved: n, hitRate, naiveHitRate, edge: hitRate - naiveHitRate };
}
