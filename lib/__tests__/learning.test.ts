import { describe, it, expect } from "vitest";
import {
  stanceDiscipline,
  directionBias,
  brierDecomposition,
  reliabilityCurve,
  calibrationError,
  longTermScorecard,
  computeLearningSignal,
  validateLearningSignal,
} from "@/lib/learning";
import type { MetricPoint, MetricsHistory, PredictionRecord, Direction, LongTermView } from "@/lib/history";

function pts(values: number[], start = 0): MetricPoint[] {
  return values.map((v, i) => ({
    date: `2026-01-${String(start + i + 1).padStart(2, "0")}`,
    weekSlug: "2026-W01",
    numericValue: v,
    displayValue: String(v),
  }));
}

function mkPred(overrides: Partial<PredictionRecord> = {}): PredictionRecord {
  return {
    weekSlug: "2026-W01",
    date: "2026-01-01",
    stance: 60,
    stanceLabel: "中立",
    baseScenario: { label: "base", probability: 45, direction: "neutral" },
    scenarios: [
      { label: "base", probability: 45, direction: "neutral", base: true },
      { label: "up", probability: 35, direction: "up" },
      { label: "down", probability: 20, direction: "down" },
    ],
    keyMetrics: [],
    outcome: null,
    ...overrides,
  };
}

function mkResolved(base: Direction, actual: Direction, week: string, date: string): PredictionRecord {
  return mkPred({
    weekSlug: week,
    date,
    baseScenario: { label: "b", probability: 45, direction: base },
    outcome: { assessedDate: date, spxDirection: actual, baseScenarioDirection: base, match: base === actual, note: "" },
  });
}

describe("directionBias — 記述専用・弱気バイアス検出", () => {
  it("flags DESCRIPTIVE_ONLY always and detects bearish bias", () => {
    // base=neutral を出し続けたが実績は up 連発 → 弱気バイアス
    const preds = Array.from({ length: 9 }, (_, i) =>
      mkResolved("neutral", "up", `2026-W${20 + i}`, `2026-05-${String(10 + i).padStart(2, "0")}`),
    );
    const b = directionBias(preds);
    expect(b.flags).toContain("DESCRIPTIVE_ONLY");
    expect(b.flags).not.toContain("INSUFFICIENT_SAMPLE"); // 9 >= 8
    expect(b.bias).toBe("bearish");
    expect(b.n).toBe(9);
  });
  it("marks INSUFFICIENT_SAMPLE below threshold", () => {
    const b = directionBias([mkResolved("neutral", "up", "2026-W20", "2026-05-10")]);
    expect(b.flags).toContain("INSUFFICIENT_SAMPLE");
  });
});

describe("brierDecomposition — Murphy 分解の恒等式", () => {
  it("satisfies brier = reliability - resolution + uncertainty (unique-p grouping)", () => {
    const pairs = [
      { p: 0.5, hit: 1 as const },
      { p: 0.5, hit: 0 as const },
      { p: 0.2, hit: 0 as const },
      { p: 0.8, hit: 1 as const },
    ];
    const raw = pairs.reduce((s, x) => s + (x.p - x.hit) ** 2, 0) / pairs.length; // 0.145
    const d = brierDecomposition(pairs);
    expect(d.brier).toBeCloseTo(raw, 6);
    expect(d.brier).toBeCloseTo((d.reliability as number) - (d.resolution as number) + (d.uncertainty as number), 6);
  });
  it("returns nulls for empty input", () => {
    expect(brierDecomposition([]).brier).toBeNull();
  });
});

describe("reliabilityCurve + calibrationError", () => {
  it("computes ECE/MCE from a known gap", () => {
    // p=0.8 の 4 件のうち実現 2 件 → predMean .8 / obsFreq .5 / gap .3
    const pairs = [
      { p: 0.8, hit: 1 as const },
      { p: 0.8, hit: 1 as const },
      { p: 0.8, hit: 0 as const },
      { p: 0.8, hit: 0 as const },
    ];
    const bins = reliabilityCurve(pairs, [0, 1]);
    const { ece, mce } = calibrationError(bins);
    expect(ece).toBeCloseTo(0.3, 6);
    expect(mce).toBeCloseTo(0.3, 6);
  });
});

describe("stanceDiscipline — 定数化警告", () => {
  it("flags collapsed when stance is frozen through regime shifts", () => {
    // stance 一定 60、構造変数が大きく動く（=シフト週）→ 無反応＝collapsedFlag
    const preds = [
      mkPred({ weekSlug: "2026-W20", date: "2026-05-04", stance: 60, structuralInputs: { real_rate_10y: "1.0" } }),
      mkPred({ weekSlug: "2026-W21", date: "2026-05-11", stance: 60, structuralInputs: { real_rate_10y: "1.8" } }),
      mkPred({ weekSlug: "2026-W22", date: "2026-05-18", stance: 60, structuralInputs: { real_rate_10y: "2.6" } }),
    ];
    const d = stanceDiscipline(preds, {});
    expect(d.maxStep).toBe(0);
    expect(d.responsiveness).toBeCloseTo(0, 6);
    expect(d.collapsedFlag).toBe(true);
  });
  it("does not flag when stance responds to shifts", () => {
    const preds = [
      mkPred({ weekSlug: "2026-W20", date: "2026-05-04", stance: 55, structuralInputs: { real_rate_10y: "1.0" } }),
      mkPred({ weekSlug: "2026-W21", date: "2026-05-11", stance: 63, structuralInputs: { real_rate_10y: "1.8" } }),
    ];
    const d = stanceDiscipline(preds, {});
    expect(d.collapsedFlag).toBe(false);
  });
});

describe("longTermScorecard", () => {
  it("is inactive when no 6M window has matured", () => {
    const preds = [mkPred({ longTermViews: [{ asset: "S&P 500", bias: "up" }] })];
    const sc = longTermScorecard(preds, { "S&P 500": pts([7000, 7010]) }); // « 126 pts
    expect(sc.active).toBe(false);
    expect(sc.viewsForwardPnl).toBeNull();
  });
  it("scores per-asset hit / base-rate / P&L on matured (small horizon) windows", () => {
    const views: LongTermView[] = [{ asset: "S&P 500", bias: "up" }];
    const metrics: MetricsHistory = { "S&P 500": pts([7000, 7050, 7200, 7300, 7400]) }; // 上昇基調
    const preds = [
      mkPred({ weekSlug: "2026-W01", date: "2026-01-01", stance: 60, longTermViews: views }),
      mkPred({ weekSlug: "2026-W02", date: "2026-01-02", stance: 55, longTermViews: views }),
    ];
    const sc = longTermScorecard(preds, metrics, 2); // 2 点先を「6M」とみなす
    expect(sc.active).toBe(true);
    const spx = sc.perAsset["S&P 500"];
    expect(spx.n).toBeGreaterThan(0);
    expect(spx.hitRate).toBe(1); // up bias, 上昇実績 → 一致
    expect(spx.baseRateUp).toBe(1);
    expect(sc.viewsForwardPnl).toBeGreaterThan(0); // 符号×リターン > 0
  });
});

describe("computeLearningSignal", () => {
  const metrics: MetricsHistory = { "S&P 500": pts([7000, 7010, 7020, 7030]) };
  const preds = [
    mkResolved("neutral", "down", "2026-W20", "2026-05-18"),
    mkResolved("neutral", "up", "2026-W21", "2026-05-25"),
  ];

  it("is deterministic (same input twice → deep equal) and has no internal timestamp", () => {
    const a = computeLearningSignal(preds, metrics);
    const b = computeLearningSignal(preds, metrics);
    expect(a).toEqual(b);
    expect(a.generatedAt).toBe("");
  });
  it("reports immature 6M and short-horizon scenario calibration on current-style fixtures", () => {
    const s = computeLearningSignal(preds, metrics);
    expect(s.maturity.sixMonthWindowsMatured).toBe(false);
    expect(s.stance.flags).toContain("INSUFFICIENT_SAMPLE");
    expect(s.scenarioCalibration.horizon).toBe("short");
    expect(s.recommendations.stanceDelta).toBe(0);
  });
});

describe("validateLearningSignal", () => {
  it("accepts a well-formed signal and rejects a broken one", () => {
    const good = computeLearningSignal([mkResolved("neutral", "up", "2026-W20", "2026-05-18")], {});
    good.generatedAt = "2026-07-03";
    expect(validateLearningSignal(good).ok).toBe(true);
    const bad = validateLearningSignal({ schemaVersion: 2 });
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
