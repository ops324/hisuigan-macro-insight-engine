// 特徴量ストア（純粋関数・fs 非依存＝クライアント／テストでも利用可）
// テスト：lib/__tests__/features.test.ts
//
// 設計メモ：
// - 予測レコード＋metrics.json を「行＝予測・列＝数値特徴／ラベル」の行列へ変換する。
// - 特徴（feature）は必ず【後方参照のみ】（date 以前の点）＝forward ラベルへのリークを防ぐ。
//   このため forward 用の forwardReturn（track-record.ts）とは別に trailingReturn/trailingVol を持つ。
// - 6M ラベルは約 2026-11 まで成熟しないため大半が null。行は常に生成し、欠損は null で表す。
// - predictions.json は【日次ログ】（1 weekSlug に複数日エントリ）。dedup は【date 単位】で行い、
//   週境界日（例 06-01 が前週末＋当週頭に重複）等の真の重複のみ落とす。同一 date は後勝ち。
//   6M 前方窓の重複独立性は別途 sampleNonOverlapping(step=126) が担うため、ここでは date 重複のみ排す。
// - Date.now()／乱数／fs を使わない（SSR/テスト決定論）。

import type { Direction, MetricPoint, MetricsHistory, PredictionRecord } from "./history";
import { ASSET_BANDS, HORIZONS, assetClassOf, directionFromChange, forwardReturn } from "./track-record";

// metrics.json の系列キー（keyMetrics.label と一致）
const SPX = "S&P 500";
const UST10 = "米10年債";
const USDJPY = "USD/JPY";

// 数値 structuralInputs のキー（push-reports Step 2 が生成する数値スキーマ）
export const STRUCTURAL_KEYS = [
  "valuation_erp",
  "real_rate_10y",
  "credit_spread_hy",
  "curve_2s10s",
  "policy_rate",
  "earnings_rev",
] as const;
export type StructuralKey = (typeof STRUCTURAL_KEYS)[number];

export interface FeatureRow {
  weekSlug: string;
  date: string;
  // 今日から導出できる特徴（全て数値 or 数値コード・後方参照のみ）
  stance: number;
  probUp: number;
  probDown: number;
  probNeutral: number;
  baseProb: number;
  baseDirCode: -1 | 0 | 1;
  scenarioDispersion: number; // 100 - max(probUp,probDown,probNeutral)（確信度の逆＝分散の代理）
  priorRet21_spx: number | null; // 直近21営業日の S&P % リターン（モメンタム）
  priorVol21_spx: number | null; // 直近21営業日の日次%変化の標準偏差（実現ボラ）
  priorRet21_ust: number | null; // 直近21営業日の米10年債 pt 変化
  usdjpyLevel: number | null;
  // 数値 structuralInputs（あれば）。無い列は null
  si_valuation_erp: number | null;
  si_real_rate_10y: number | null;
  si_credit_spread_hy: number | null;
  si_curve_2s10s: number | null;
  si_policy_rate: number | null;
  si_earnings_rev: number | null;
  hasLongTermViews: 0 | 1;
  // ラベル（成熟まで多くが null）
  label_stMatch: 0 | 1 | null; // 短期 outcome.match（near-random サニティ）
  label_spxDirCode: -1 | 0 | 1 | null; // 実績短期 spxDirection
  label_fwd6m_spx: number | null; // S&P の 6M 前方 %リターン
  label_fwd6m_by_asset: Record<string, number | null>; // longTermViews 資産別・クラス正のモード
  label_baseHit6m: 0 | 1 | null; // ベース方向が 6M 実績符号（バンド適用）と一致したか
}

export interface FeatureMatrix {
  rows: FeatureRow[];
  featureNames: string[];
  labelNames: string[];
  generatedFrom: { predictionCount: number; dedupedRows: number; metricsSeries: string[] };
}

// 方向 → 数値コード
export function dirCode(d: Direction): -1 | 0 | 1 {
  return d === "up" ? 1 : d === "down" ? -1 : 0;
}

// asOfDate 以前（含む）の最後の点の添字。無ければ -1。
function indexAtOrBefore(points: MetricPoint[], asOfDate: string): number {
  let idx = -1;
  for (let i = 0; i < points.length; i++) {
    if (points[i].date <= asOfDate) idx = i;
    else break;
  }
  return idx;
}

// 後方参照リターン：asOfDate 以前の点のみ使用（forward リークなし）。窓未到達は null。
export function trailingReturn(
  points: MetricPoint[],
  asOfDate: string,
  lookbackDays: number,
  mode: "pct" | "abs" = "pct",
): number | null {
  if (!points || points.length === 0) return null;
  const i = indexAtOrBefore(points, asOfDate);
  const j = i - lookbackDays;
  if (i < 0 || j < 0) return null;
  const a = points[j].numericValue;
  const b = points[i].numericValue;
  if (a == null || b == null) return null;
  if (mode === "abs") return b - a;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

// 後方参照ボラ：直近 lookbackDays の日次%変化の標準偏差（母標準偏差）。変化点2未満は null。
export function trailingVol(points: MetricPoint[], asOfDate: string, lookbackDays: number): number | null {
  if (!points || points.length === 0) return null;
  const i = indexAtOrBefore(points, asOfDate);
  const j = Math.max(0, i - lookbackDays);
  if (i < 0 || i - j < 2) return null;
  const rets: number[] = [];
  for (let k = j + 1; k <= i; k++) {
    const a = points[k - 1].numericValue;
    const b = points[k].numericValue;
    if (a == null || b == null || a === 0) continue;
    rets.push(((b - a) / a) * 100);
  }
  if (rets.length < 2) return null;
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
  const varr = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length;
  return Math.sqrt(varr);
}

// structuralInputs から数値を防御的に取り出す（number でも数字文字列でも可・自由文は null）
function numFromSI(si: Record<string, unknown> | undefined, key: string): number | null {
  if (!si || !(key in si)) return null;
  const v = si[key];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[,%$¥\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// scenarios の確率を direction 別に合算（up/down/neutral）
function probMass(p: PredictionRecord): { up: number; down: number; neutral: number } {
  const acc = { up: 0, down: 0, neutral: 0 };
  for (const s of p.scenarios ?? []) {
    if (s.direction === "up") acc.up += s.probability;
    else if (s.direction === "down") acc.down += s.probability;
    else acc.neutral += s.probability;
  }
  return acc;
}

// date 重複のみ dedup（日次ログの真の重複を排す・同一 date は後勝ち）。date 昇順で返す。
function dedupeByDate(predictions: PredictionRecord[]): PredictionRecord[] {
  const byDate = new Map<string, PredictionRecord>();
  for (const p of predictions) byDate.set(p.date, p); // 同一 date は後勝ち
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export const FEATURE_NAMES: string[] = [
  "stance",
  "probUp",
  "probDown",
  "probNeutral",
  "baseProb",
  "baseDirCode",
  "scenarioDispersion",
  "priorRet21_spx",
  "priorVol21_spx",
  "priorRet21_ust",
  "usdjpyLevel",
  "si_valuation_erp",
  "si_real_rate_10y",
  "si_credit_spread_hy",
  "si_curve_2s10s",
  "si_policy_rate",
  "si_earnings_rev",
  "hasLongTermViews",
];

export const LABEL_NAMES: string[] = [
  "label_stMatch",
  "label_spxDirCode",
  "label_fwd6m_spx",
  "label_fwd6m_by_asset",
  "label_baseHit6m",
];

export function buildFeatureMatrix(predictions: PredictionRecord[], metrics: MetricsHistory): FeatureMatrix {
  const deduped = dedupeByDate(predictions);
  const spxSeries = metrics[SPX] ?? [];
  const ustSeries = metrics[UST10] ?? [];
  const usdjpySeries = metrics[USDJPY] ?? [];
  const equityBand = ASSET_BANDS.equity.band;

  const rows: FeatureRow[] = deduped.map((p) => {
    const mass = probMass(p);
    const maxMass = Math.max(mass.up, mass.down, mass.neutral);

    // 資産別 6M ラベル（longTermViews があるものだけ・クラス正のモード）
    const byAsset: Record<string, number | null> = {};
    for (const v of p.longTermViews ?? []) {
      const cls = assetClassOf(v.asset);
      const mode = ASSET_BANDS[cls].mode;
      byAsset[v.asset] = forwardReturn(metrics[v.asset] ?? [], p.date, HORIZONS.m6, mode);
    }

    const fwd6mSpx = forwardReturn(spxSeries, p.date, HORIZONS.m6, "pct");
    const baseHit6m =
      fwd6mSpx == null ? null : directionFromChange(fwd6mSpx, equityBand) === p.baseScenario.direction ? 1 : 0;

    const si = p.structuralInputs as Record<string, unknown> | undefined;

    return {
      weekSlug: p.weekSlug,
      date: p.date,
      stance: p.stance,
      probUp: mass.up,
      probDown: mass.down,
      probNeutral: mass.neutral,
      baseProb: p.baseScenario.probability,
      baseDirCode: dirCode(p.baseScenario.direction),
      scenarioDispersion: 100 - maxMass,
      priorRet21_spx: trailingReturn(spxSeries, p.date, HORIZONS.m1, "pct"),
      priorVol21_spx: trailingVol(spxSeries, p.date, HORIZONS.m1),
      priorRet21_ust: trailingReturn(ustSeries, p.date, HORIZONS.m1, "abs"),
      usdjpyLevel: (() => {
        const i = indexAtOrBefore(usdjpySeries, p.date);
        return i < 0 ? null : usdjpySeries[i].numericValue;
      })(),
      si_valuation_erp: numFromSI(si, "valuation_erp"),
      si_real_rate_10y: numFromSI(si, "real_rate_10y"),
      si_credit_spread_hy: numFromSI(si, "credit_spread_hy"),
      si_curve_2s10s: numFromSI(si, "curve_2s10s"),
      si_policy_rate: numFromSI(si, "policy_rate"),
      si_earnings_rev: numFromSI(si, "earnings_rev"),
      hasLongTermViews: (p.longTermViews?.length ?? 0) > 0 ? 1 : 0,
      label_stMatch: p.outcome && p.outcome.spxDirection ? (p.outcome.match ? 1 : 0) : null,
      label_spxDirCode: p.outcome?.spxDirection ? dirCode(p.outcome.spxDirection) : null,
      label_fwd6m_spx: fwd6mSpx,
      label_fwd6m_by_asset: byAsset,
      label_baseHit6m: baseHit6m,
    };
  });

  return {
    rows,
    featureNames: FEATURE_NAMES,
    labelNames: LABEL_NAMES,
    generatedFrom: {
      predictionCount: predictions.length,
      dedupedRows: rows.length,
      metricsSeries: Object.keys(metrics),
    },
  };
}
