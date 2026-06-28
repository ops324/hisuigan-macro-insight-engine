import { describe, it, expect } from "vitest";
import {
  forwardReturn,
  sampleNonOverlapping,
  directionFromChange,
  assetClassOf,
  assetLongViewScore,
  informationCoefficient,
  stanceForwardPairs,
  bucketedForwardReturns,
  stanceSmoothness,
  shortTermSummary,
} from "@/lib/track-record";
import type { MetricPoint, MetricsHistory, LongTermView, PredictionRecord } from "@/lib/history";

// 合成系列ヘルパ
function pts(values: number[], start = 0): MetricPoint[] {
  return values.map((v, i) => ({
    date: `2026-01-${String(start + i + 1).padStart(2, "0")}`,
    weekSlug: "2026-W01",
    numericValue: v,
    displayValue: String(v),
  }));
}

describe("forwardReturn", () => {
  const series = pts([100, 101, 102, 110]); // dates 01..04

  it("computes percent change N points ahead", () => {
    expect(forwardReturn(series, "2026-01-01", 3, "pct")).toBeCloseTo(10, 5); // 100→110
    expect(forwardReturn(series, "2026-01-01", 1, "pct")).toBeCloseTo(1, 5); // 100→101
  });

  it("computes absolute (pt) change for yields", () => {
    const yields = pts([4.0, 4.1, 4.6]);
    expect(forwardReturn(yields, "2026-01-01", 2, "abs")).toBeCloseTo(0.6, 5);
    expect(forwardReturn(yields, "2026-01-01", 1, "abs")).toBeCloseTo(0.1, 5);
  });

  it("returns null when the window is not yet reached", () => {
    expect(forwardReturn(series, "2026-01-03", 3, "pct")).toBeNull();
    expect(forwardReturn(series, "2026-01-04", 1, "pct")).toBeNull();
  });

  it("falls back to the first point on/after fromDate", () => {
    // 2026-01-02 exists; ask from a gap date before it
    expect(forwardReturn(series, "2025-12-31", 1, "pct")).toBeCloseTo(1, 5); // starts at 01-01
  });

  it("handles empty series and zero base", () => {
    expect(forwardReturn([], "2026-01-01", 1)).toBeNull();
    expect(forwardReturn(pts([0, 5]), "2026-01-01", 1, "pct")).toBeNull();
  });
});

describe("sampleNonOverlapping", () => {
  it("keeps one observation per window length (independence)", () => {
    const items = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(sampleNonOverlapping(items, 3)).toEqual([0, 3, 6]);
    // 8 daily points, 20-day window → effectively 1 independent obs
    expect(sampleNonOverlapping([0, 1, 2, 3, 4, 5, 6, 7], 20)).toEqual([0]);
  });
  it("returns a copy when step < 1", () => {
    expect(sampleNonOverlapping([1, 2], 0)).toEqual([1, 2]);
  });
});

describe("directionFromChange / assetClassOf", () => {
  it("applies the neutral band", () => {
    expect(directionFromChange(1.2, 1.0)).toBe("up");
    expect(directionFromChange(-1.2, 1.0)).toBe("down");
    expect(directionFromChange(0.5, 1.0)).toBe("neutral");
    expect(directionFromChange(1.0, 1.0)).toBe("neutral"); // 境界は中立（> のみ up）
  });
  it("classifies assets, yield before commodity to avoid 金/金利 collision", () => {
    expect(assetClassOf("米10年債")).toBe("yield");
    expect(assetClassOf("日本10年債")).toBe("yield");
    expect(assetClassOf("金")).toBe("commodity");
    expect(assetClassOf("WTI原油")).toBe("commodity");
    expect(assetClassOf("USD/JPY")).toBe("fx");
    expect(assetClassOf("S&P 500")).toBe("equity");
    expect(assetClassOf("日経225")).toBe("equity");
  });
});

describe("assetLongViewScore", () => {
  const history: MetricsHistory = {
    "S&P 500": pts([7000, 7100, 7200, 7400]), // +5.7% over 3 pts
    "米10年債": pts([4.0, 4.05, 4.1, 4.3]), // +0.30pt over 3 pts
    "USD/JPY": pts([160, 160.2, 160.4, 160.6]), // +0.375% over 3 pts (< 0.5% band → neutral)
  };
  const views: LongTermView[] = [
    { asset: "S&P 500", bias: "up" },
    { asset: "米10年債", bias: "up" },
    { asset: "USD/JPY", bias: "up" },
  ];

  it("scores each asset by its own class band/mode", () => {
    const out = assetLongViewScore(views, history, "2026-01-01", 3);
    const spx = out.find((o) => o.asset === "S&P 500")!;
    expect(spx.realized).toBe("up"); // +5.7% > 1%
    expect(spx.match).toBe(true);

    const ust = out.find((o) => o.asset === "米10年債")!;
    expect(ust.forwardChange).toBeCloseTo(0.3, 5); // pt diff
    expect(ust.realized).toBe("up"); // +0.30 > 0.15pt
    expect(ust.match).toBe(true);

    const fx = out.find((o) => o.asset === "USD/JPY")!;
    expect(fx.realized).toBe("neutral"); // +0.375% < 0.5% band
    expect(fx.match).toBe(false); // bias up vs neutral
  });

  it("returns null score when the window is not reached", () => {
    const out = assetLongViewScore(views, history, "2026-01-03", 3);
    expect(out[0].forwardChange).toBeNull();
    expect(out[0].match).toBeNull();
  });
});

describe("informationCoefficient", () => {
  it("returns +1 for perfectly increasing pairs and -1 for inverse", () => {
    expect(informationCoefficient([[1, 1], [2, 2], [3, 3]]).ic).toBeCloseTo(1, 5);
    expect(informationCoefficient([[1, 3], [2, 2], [3, 1]]).ic).toBeCloseTo(-1, 5);
  });
  it("reports effective N and guards tiny samples", () => {
    expect(informationCoefficient([[1, 1]]).n).toBe(1);
    expect(informationCoefficient([[1, 1]]).ic).toBeNull();
    expect(informationCoefficient([]).ic).toBeNull();
  });
});

describe("stanceForwardPairs + bucketedForwardReturns", () => {
  const series = pts([100, 102, 99, 101, 100, 100]); // dates 01..06
  const preds: PredictionRecord[] = [
    mkPred("2026-01-01", 70),
    mkPred("2026-01-02", 60),
    mkPred("2026-01-03", 40),
  ];

  it("pairs stance with forward return where window is reached", () => {
    const pairs = stanceForwardPairs(preds, series, 2);
    // 01-01→01-03: (99/100-1)*100 = -1; 01-02→01-04: (101/102-1)≈-0.98; 01-03→01-05: (100/99-1)≈1.01
    expect(pairs.length).toBe(3);
    expect(pairs[0].forwardReturn).toBeCloseTo(-1, 5);
  });

  it("buckets by risk-off / neutral / risk-on", () => {
    const pairs = stanceForwardPairs(preds, series, 2);
    const b = bucketedForwardReturns(pairs);
    expect(b.riskOff.n).toBe(1); // stance 70
    expect(b.neutral.n).toBe(1); // stance 60
    expect(b.riskOn.n).toBe(1); // stance 40
  });
});

describe("stanceSmoothness", () => {
  it("computes mean and max adjacent step", () => {
    const s = stanceSmoothness([70, 67, 65, 75]); // steps 3,2,10
    expect(s.meanStep).toBeCloseTo(5, 5);
    expect(s.maxStep).toBe(10);
  });
  it("returns null for <2 points", () => {
    expect(stanceSmoothness([70]).meanStep).toBeNull();
  });
});

describe("shortTermSummary", () => {
  it("computes hit rate, naive baseline and edge", () => {
    const preds: PredictionRecord[] = [
      mkResolved("up", "up", true),
      mkResolved("up", "neutral", false),
      mkResolved("neutral", "neutral", true),
      mkResolved("neutral", "down", false),
    ];
    const s = shortTermSummary(preds);
    expect(s.resolved).toBe(4);
    expect(s.hitRate).toBeCloseTo(50, 5); // 2/4 match
    expect(s.naiveHitRate).toBeCloseTo(50, 5); // 2/4 actual neutral
    expect(s.edge).toBeCloseTo(0, 5);
  });
});

// ── helpers ──
function mkPred(date: string, stance: number): PredictionRecord {
  return {
    weekSlug: "2026-W01",
    date,
    stance,
    stanceLabel: "x",
    baseScenario: { label: "b", probability: 45, direction: "neutral" },
    scenarios: [],
    keyMetrics: [],
    outcome: null,
  };
}

function mkResolved(base: "up" | "down" | "neutral", actual: "up" | "down" | "neutral", match: boolean): PredictionRecord {
  return {
    weekSlug: "2026-W01",
    date: "2026-01-01",
    stance: 50,
    stanceLabel: "x",
    baseScenario: { label: "b", probability: 45, direction: base },
    scenarios: [],
    keyMetrics: [],
    outcome: {
      assessedDate: "2026-01-02",
      spxDirection: actual,
      baseScenarioDirection: base,
      match,
      note: "",
    },
  };
}
