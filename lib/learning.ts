// 学習シグナル：軽量・誠実な推定器（純粋関数・fs 非依存）
// テスト：lib/__tests__/learning.test.ts
//
// 方針（三職種レビュー反映）：
// - 小標本レジーム（N≈数件・6M ラベル未成熟）。過学習を避け、縮約＋標本ゲート＋成熟フラグで
//   「まだ動かさない」を既定にする。
// - 確率系は適正スコアリング則（Brier ＋ Murphy 分解）。hit-rate/ECE は補助。
// - directionBias は多重検定のため【記述専用】（方向補正の根拠にしない）。
// - stance は滑らかさ単独を報酬にすると定数化で最大化できるため、応答性カウンタで condition する。
// - Date.now()／乱数／fs は使わない（決定論）。generatedAt は fs ラッパが注入する。

import type { Direction, MetricPoint, MetricsHistory, PredictionRecord } from "./history";
import {
  HORIZONS,
  assetClassOf,
  ASSET_BANDS,
  directionFromChange,
  forwardReturn,
  informationCoefficient,
  sampleNonOverlapping,
  stanceForwardPairs,
  stanceSmoothness,
} from "./track-record";
import { buildFeatureMatrix, dirCode } from "./features";

// ── 定数（規律・ゲートのしきい値） ──
const MIN_RESOLVED_FOR_BIAS = 8; // これ未満は INSUFFICIENT_SAMPLE
const SHIFT_MOMENTUM = 3.0; // |Δ 21日モメンタム| がこの pt 以上 → レジームシフト週
const SHIFT_STRUCTURAL = 0.3; // |Δ 構造変数| がこの幅以上 → シフト週
const COLLAPSE_MAXSTEP = 1.0; // stance がほぼ不動（最大変化がこの pt 以下）
const RESPONSIVE_MIN = 2.0; // シフト週での平均 |Δstance| がこの pt 未満 → 無反応

const SI_KEYS = [
  "si_valuation_erp",
  "si_real_rate_10y",
  "si_credit_spread_hy",
  "si_curve_2s10s",
  "si_policy_rate",
  "si_earnings_rev",
] as const;

const SPX = "S&P 500";

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// ── スタンス規律：滑らかさ＋応答性（定数化警告） ──
export interface StanceDiscipline {
  meanStep: number | null;
  maxStep: number | null;
  responsiveness: number | null; // レジームシフト週での平均 |Δstance|
  collapsedFlag: boolean; // 滑らかだが無反応（stance が事実上の定数）
}

export function stanceDiscipline(predictions: PredictionRecord[], metrics: MetricsHistory): StanceDiscipline {
  const rows = buildFeatureMatrix(predictions, metrics).rows; // date 昇順・dedup 済み
  const stances = rows.map((r) => r.stance);
  const { meanStep, maxStep } = stanceSmoothness(stances);

  const shiftSteps: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1].priorRet21_spx;
    const b = rows[i].priorRet21_spx;
    const momentumShift = a != null && b != null ? Math.abs(b - a) : 0;
    let structuralShift = 0;
    for (const k of SI_KEYS) {
      const pa = rows[i - 1][k] as number | null;
      const pb = rows[i][k] as number | null;
      if (pa != null && pb != null) structuralShift = Math.max(structuralShift, Math.abs(pb - pa));
    }
    if (momentumShift >= SHIFT_MOMENTUM || structuralShift >= SHIFT_STRUCTURAL) {
      shiftSteps.push(Math.abs(stances[i] - stances[i - 1]));
    }
  }
  const responsiveness = shiftSteps.length ? mean(shiftSteps) : null;
  const collapsedFlag =
    maxStep != null && maxStep <= COLLAPSE_MAXSTEP && responsiveness != null && responsiveness < RESPONSIVE_MIN;
  return { meanStep, maxStep, responsiveness, collapsedFlag };
}

// ── 方向バイアス（記述専用・多重検定のため動かさない） ──
export interface DirectionBias {
  n: number;
  upCalls: number;
  downCalls: number;
  realizedUp: number;
  realizedDown: number;
  bias: "bullish" | "bearish" | "none";
  pApprox: number | null;
  flags: string[];
}

// 標準正規 CDF（Abramowitz-Stegun erf 近似・決定論）
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

export function directionBias(predictions: PredictionRecord[]): DirectionBias {
  const resolved = predictions.filter((p) => p.outcome && p.outcome.spxDirection);
  const n = resolved.length;
  const flags = ["DESCRIPTIVE_ONLY"];
  if (n < MIN_RESOLVED_FOR_BIAS) flags.push("INSUFFICIENT_SAMPLE");
  if (!n) return { n: 0, upCalls: 0, downCalls: 0, realizedUp: 0, realizedDown: 0, bias: "none", pApprox: null, flags };

  let upCalls = 0;
  let downCalls = 0;
  let realizedUp = 0;
  let realizedDown = 0;
  const diffs: number[] = []; // realizedCode - baseCode（＋＝実績が予想より強気＝弱気バイアス）
  let disagreeUpward = 0; // realC > baseC の件数
  let disagreements = 0;
  for (const p of resolved) {
    const baseC = dirCode(p.baseScenario.direction);
    const realC = dirCode(p.outcome!.spxDirection as Direction);
    if (p.baseScenario.direction === "up") upCalls++;
    if (p.baseScenario.direction === "down") downCalls++;
    if (p.outcome!.spxDirection === "up") realizedUp++;
    if (p.outcome!.spxDirection === "down") realizedDown++;
    diffs.push(realC - baseC);
    if (realC !== baseC) {
      disagreements++;
      if (realC > baseC) disagreeUpward++;
    }
  }
  const meanDiff = mean(diffs) ?? 0;
  const bias = meanDiff > 0.4 ? "bearish" : meanDiff < -0.4 ? "bullish" : "none";

  // 符号の偏りに対する両側 p 値（正規近似）。記述専用。
  let pApprox: number | null = null;
  if (disagreements >= 2) {
    const z = (disagreeUpward - disagreements / 2) / Math.sqrt(disagreements / 4);
    pApprox = 2 * (1 - normalCdf(Math.abs(z)));
  }
  return { n, upCalls, downCalls, realizedUp, realizedDown, bias, pApprox, flags };
}

// ── 適正スコアリング：Brier ＋ Murphy 分解 ──
export interface BrierScore {
  brier: number | null;
  reliability: number | null;
  resolution: number | null;
  uncertainty: number | null;
  n: number;
}

type ProbHit = { p: number; hit: 0 | 1 };

// 予測値でグルーピング（binEdges 省略時は一意値ごと＝BS = REL - RES + UNC の恒等式が厳密に成立）
function groupProbHit(pairs: ProbHit[], binEdges?: number[]): ProbHit[][] {
  if (!binEdges) {
    const byVal = new Map<number, ProbHit[]>();
    for (const x of pairs) {
      const g = byVal.get(x.p) ?? [];
      g.push(x);
      byVal.set(x.p, g);
    }
    return [...byVal.values()];
  }
  const groups: ProbHit[][] = binEdges.slice(0, -1).map(() => []);
  for (const x of pairs) {
    let b = 0;
    for (let e = 1; e < binEdges.length; e++) {
      if (x.p <= binEdges[e]) {
        b = e - 1;
        break;
      }
      b = binEdges.length - 2;
    }
    groups[b].push(x);
  }
  return groups.filter((g) => g.length > 0);
}

export function brierDecomposition(pairs: ProbHit[], binEdges?: number[]): BrierScore {
  const n = pairs.length;
  if (!n) return { brier: null, reliability: null, resolution: null, uncertainty: null, n: 0 };
  const obar = pairs.reduce((s, x) => s + x.hit, 0) / n;
  const uncertainty = obar * (1 - obar);
  const groups = groupProbHit(pairs, binEdges);
  let reliability = 0;
  let resolution = 0;
  for (const g of groups) {
    const nb = g.length;
    const pbar = g.reduce((s, x) => s + x.p, 0) / nb;
    const obarB = g.reduce((s, x) => s + x.hit, 0) / nb;
    reliability += (nb * (pbar - obarB) ** 2) / n;
    resolution += (nb * (obarB - obar) ** 2) / n;
  }
  const brier = reliability - resolution + uncertainty;
  return { brier, reliability, resolution, uncertainty, n };
}

// ── 信頼度曲線（reliability curve）＋ 校正誤差（補助指標） ──
export interface ReliabilityBin {
  pLow: number;
  pHigh: number;
  n: number;
  predMean: number | null;
  obsFreq: number | null;
}

function defaultEdges(n: number): number[] {
  // 小N は 3 粗ビン、十分なら 5 ビン
  return n < 15 ? [0, 1 / 3, 2 / 3, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1];
}

export function reliabilityCurve(pairs: ProbHit[], binEdges?: number[]): ReliabilityBin[] {
  const edges = binEdges ?? defaultEdges(pairs.length);
  const bins: ReliabilityBin[] = [];
  for (let e = 1; e < edges.length; e++) {
    const lo = edges[e - 1];
    const hi = edges[e];
    const inBin = pairs.filter((x) => (e === 1 ? x.p >= lo : x.p > lo) && x.p <= hi);
    bins.push({
      pLow: lo,
      pHigh: hi,
      n: inBin.length,
      predMean: inBin.length ? inBin.reduce((s, x) => s + x.p, 0) / inBin.length : null,
      obsFreq: inBin.length ? inBin.reduce((s, x) => s + x.hit, 0) / inBin.length : null,
    });
  }
  return bins;
}

export function calibrationError(bins: ReliabilityBin[]): { ece: number | null; mce: number | null; n: number } {
  const filled = bins.filter((b) => b.n > 0 && b.predMean != null && b.obsFreq != null);
  const total = filled.reduce((s, b) => s + b.n, 0);
  if (!total) return { ece: null, mce: null, n: 0 };
  let ece = 0;
  let mce = 0;
  for (const b of filled) {
    const gap = Math.abs((b.obsFreq as number) - (b.predMean as number));
    ece += (b.n / total) * gap;
    mce = Math.max(mce, gap);
  }
  return { ece, mce, n: total };
}

// ── 北極星（長期・成熟後に点灯）：資産別6M・経済的P&L・対ボラ・stance IC ──
export interface AssetSixMonth {
  n: number;
  hitRate: number | null;
  baseRateUp: number | null;
  edge: number | null;
}
export interface LongTermScorecard {
  active: boolean;
  perAsset: Record<string, AssetSixMonth>;
  viewsForwardPnl: number | null;
  stanceVsForwardVol: number | null;
  stanceIc6m: number | null;
  effN: number;
}

// 前方 N 営業日の実現ボラ（日次%変化の母標準偏差）。窓未到達は null。
function forwardVol(points: MetricPoint[], fromDate: string, horizonDays: number): number | null {
  if (!points || points.length === 0) return null;
  let i = points.findIndex((p) => p.date === fromDate);
  if (i < 0) i = points.findIndex((p) => p.date >= fromDate);
  if (i < 0) return null;
  const j = i + horizonDays;
  if (j >= points.length) return null;
  const rets: number[] = [];
  for (let k = i + 1; k <= j; k++) {
    const a = points[k - 1].numericValue;
    const b = points[k].numericValue;
    if (a == null || b == null || a === 0) continue;
    rets.push(((b - a) / a) * 100);
  }
  if (rets.length < 2) return null;
  const m = rets.reduce((s, x) => s + x, 0) / rets.length;
  return Math.sqrt(rets.reduce((s, x) => s + (x - m) ** 2, 0) / rets.length);
}

export function longTermScorecard(
  predictions: PredictionRecord[],
  metrics: MetricsHistory,
  horizonDays: number = HORIZONS.m6,
): LongTermScorecard {
  const spx = metrics[SPX] ?? [];
  const perAsset: Record<string, { hits: number; matched: number; up: number; total: number; pnl: number[] }> = {};

  for (const p of predictions) {
    for (const v of p.longTermViews ?? []) {
      const cls = assetClassOf(v.asset);
      const { band, mode } = ASSET_BANDS[cls];
      const change = forwardReturn(metrics[v.asset] ?? [], p.date, horizonDays, mode);
      if (change == null) continue;
      const realized = directionFromChange(change, band);
      const a = (perAsset[v.asset] ??= { hits: 0, matched: 0, up: 0, total: 0, pnl: [] });
      a.total++;
      if (realized === "up") a.up++;
      a.matched++;
      if (v.bias === realized) a.hits++;
      const sign = v.bias === "up" ? 1 : v.bias === "down" ? -1 : 0;
      a.pnl.push(sign * change);
    }
  }

  const perAssetOut: Record<string, AssetSixMonth> = {};
  const allPnl: number[] = [];
  let anyMatured = false;
  for (const [asset, a] of Object.entries(perAsset)) {
    if (a.total > 0) anyMatured = true;
    const hitRate = a.matched ? a.hits / a.matched : null;
    const baseRateUp = a.total ? a.up / a.total : null;
    perAssetOut[asset] = {
      n: a.total,
      hitRate,
      baseRateUp,
      edge: hitRate != null && baseRateUp != null ? hitRate - baseRateUp : null,
    };
    allPnl.push(...a.pnl);
  }

  // stance IC（6M・非重複化）＋ stance 対 前方ボラ
  const pairs = stanceForwardPairs(predictions, spx, horizonDays);
  const independent = sampleNonOverlapping(pairs, horizonDays);
  const ic = informationCoefficient(independent.map((x) => [x.stance, x.forwardReturn] as [number, number]));
  const volPairs: Array<[number, number]> = [];
  for (const p of predictions) {
    const fv = forwardVol(spx, p.date, horizonDays);
    if (fv != null) volPairs.push([p.stance, fv]);
  }
  const volIc = informationCoefficient(sampleNonOverlapping(volPairs, horizonDays));

  return {
    active: anyMatured,
    perAsset: perAssetOut,
    viewsForwardPnl: mean(allPnl),
    stanceVsForwardVol: volIc.ic,
    stanceIc6m: ic.ic,
    effN: independent.length,
  };
}

// ── トップレベル成果物（純粋・generatedAt は空文字。fs ラッパが注入） ──
export interface LearningSignal {
  schemaVersion: number;
  generatedAt: string;
  sourceCounts: { predictions: number; dedupedRows: number; resolvedOutcomes: number; metricsSeries: number };
  maturity: { sixMonthWindowsMatured: boolean; firstMaturityEstimate: string };
  northStar: { primary: string; disciplineOnly: string; note: string };
  stance: {
    discipline: StanceDiscipline;
    suggestedStanceDelta: number;
    confidence: number;
    flags: string[];
    advice: string;
  };
  directionBias: {
    horizon: "short";
    n: number;
    bias: "bullish" | "bearish" | "none";
    pApprox: number | null;
    flags: string[];
    advice: string;
  };
  scenarioCalibration: {
    horizon: "short";
    resolvedScenarios: number;
    brier: BrierScore;
    reliability: ReliabilityBin[];
    ece: number | null;
    mce: number | null;
    flags: string[];
    advice: string;
  };
  assetSixMonth: {
    active: boolean;
    perAsset: Record<string, AssetSixMonth>;
    viewsForwardPnl: number | null;
    stanceVsForwardVol: number | null;
    stanceIc6m: number | null;
    effN: number;
    advice: string;
  };
  recommendations: {
    stanceDelta: number;
    probabilityAdjustment: "none" | "slight-recenter";
    directionalBias: "none";
    overallConfidence: "low" | "medium" | "high";
  };
}

// 最初の予測日 + 6 ヶ月（YYYY-MM）。Date 非使用の文字列演算。
function addSixMonths(ymd: string): string {
  const [y, m] = ymd.split("-").map((s) => parseInt(s, 10));
  if (!y || !m) return "未定";
  const total = (y * 12 + (m - 1)) + 6;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

export function computeLearningSignal(predictions: PredictionRecord[], metrics: MetricsHistory): LearningSignal {
  const matrix = buildFeatureMatrix(predictions, metrics);
  const resolved = predictions.filter((p) => p.outcome && p.outcome.spxDirection);
  const discipline = stanceDiscipline(predictions, metrics);
  const bias = directionBias(predictions);
  const scorecard = longTermScorecard(predictions, metrics);

  // シナリオ確率×実績（各シナリオ方向 vs 実績短期方向）。短期ラベル。
  const scenarioPairs: ProbHit[] = [];
  for (const p of resolved) {
    for (const s of p.scenarios ?? []) {
      scenarioPairs.push({ p: s.probability / 100, hit: s.direction === p.outcome!.spxDirection ? 1 : 0 });
    }
  }
  const brier = brierDecomposition(scenarioPairs);
  const reliability = reliabilityCurve(scenarioPairs);
  const { ece, mce } = calibrationError(reliability);

  const earliest = matrix.rows.length ? matrix.rows[0].date : "";
  const insufficientStance = resolved.length < MIN_RESOLVED_FOR_BIAS || !scorecard.active;

  const stanceFlags: string[] = [];
  if (insufficientStance) stanceFlags.push("INSUFFICIENT_SAMPLE");
  if (discipline.collapsedFlag) stanceFlags.push("STANCE_COLLAPSED");

  const scenarioFlags = ["SHORT_HORIZON_ONLY"];
  if (scenarioPairs.length < 15) scenarioFlags.push("SMALL_N_COARSE_BINS");

  return {
    schemaVersion: 1,
    generatedAt: "",
    sourceCounts: {
      predictions: predictions.length,
      dedupedRows: matrix.generatedFrom.dedupedRows,
      resolvedOutcomes: resolved.length,
      metricsSeries: Object.keys(metrics).length,
    },
    maturity: {
      sixMonthWindowsMatured: scorecard.active,
      firstMaturityEstimate: earliest ? addSixMonths(earliest) : "未定",
    },
    northStar: {
      primary: "asset6mViewsForwardPnl",
      disciplineOnly: "stanceIc6m_vs_zero",
      note: "長期スキルは経済的P&Lで判定。6M IC は年単位で有意化せず【規律指標】扱い。短期±1%は評価対象外。",
    },
    stance: {
      discipline,
      suggestedStanceDelta: 0, // 小N・未成熟は結果ベースで動かさない（縮約）
      confidence: insufficientStance ? 0.05 : 0.2,
      flags: stanceFlags,
      advice: discipline.collapsedFlag
        ? "滑らかさを追い過ぎて stance が無反応化。真のレジームシフトに反応しているか確認。"
        : insufficientStance
          ? "サンプル不足。stance を結果ベースで動かさない。"
          : "構造変数の変化に基づき微修正のみ。",
    },
    directionBias: {
      horizon: "short",
      n: bias.n,
      bias: bias.bias,
      pApprox: bias.pApprox,
      flags: bias.flags,
      advice:
        bias.bias === "none"
          ? "記述専用（多重検定）。系統的な方向バイアスは認められない。"
          : `記述専用（多重検定）。${bias.bias === "bearish" ? "弱気" : "強気"}寄りの傾向は参考のみ・方向補正の根拠にしない。`,
    },
    scenarioCalibration: {
      horizon: "short",
      resolvedScenarios: resolved.length,
      brier,
      reliability,
      ece,
      mce,
      flags: scenarioFlags,
      advice: "参考：短期は near-random のため確率は動かさない（Brier/reliability は品質モニタのみ）。",
    },
    assetSixMonth: {
      active: scorecard.active,
      perAsset: scorecard.perAsset,
      viewsForwardPnl: scorecard.viewsForwardPnl,
      stanceVsForwardVol: scorecard.stanceVsForwardVol,
      stanceIc6m: scorecard.stanceIc6m,
      effN: scorecard.effN,
      advice: scorecard.active ? "6M窓成熟。経済的P&Lで長期スキルを評価。" : "6M窓未成熟。長期評価は蓄積待ち。",
    },
    recommendations: {
      stanceDelta: 0,
      probabilityAdjustment: "none", // 適用マップ・OOS ゲートは Phase 2
      directionalBias: "none",
      overallConfidence: "low",
    },
  };
}

// ── 成果物の形状検証（自動化パスの最後の砦・CI 非経由でも壊れを弾く） ──
export function validateLearningSignal(obj: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const s = obj as Record<string, unknown>;
  const req = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };
  req(!!s && typeof s === "object", "not an object");
  if (s && typeof s === "object") {
    req(s.schemaVersion === 1, "schemaVersion must be 1");
    req(typeof s.generatedAt === "string" && (s.generatedAt as string).length > 0, "generatedAt missing");
    const m = s.maturity as Record<string, unknown> | undefined;
    req(!!m && typeof m.sixMonthWindowsMatured === "boolean", "maturity.sixMonthWindowsMatured missing");
    const st = s.stance as Record<string, unknown> | undefined;
    req(!!st && typeof st.suggestedStanceDelta === "number", "stance.suggestedStanceDelta missing");
    req(Array.isArray((st?.flags as unknown[]) ?? null), "stance.flags must be array");
    const rec = s.recommendations as Record<string, unknown> | undefined;
    req(!!rec && typeof rec.stanceDelta === "number", "recommendations.stanceDelta missing");
    req(
      rec != null && ["none", "slight-recenter"].includes(rec.probabilityAdjustment as string),
      "recommendations.probabilityAdjustment invalid",
    );
    const sc = s.scenarioCalibration as Record<string, unknown> | undefined;
    req(!!sc && Array.isArray(sc.reliability as unknown[]), "scenarioCalibration.reliability must be array");
  }
  return { ok: errors.length === 0, errors };
}
