import { describe, it, expect } from "vitest";
import { buildFeatureMatrix, trailingReturn, trailingVol, dirCode } from "@/lib/features";
import type { MetricPoint, MetricsHistory, PredictionRecord, PredictionScenario, LongTermView } from "@/lib/history";

// 合成系列ヘルパ（history.test.ts と同じ作法）
function pts(values: number[], start = 0): MetricPoint[] {
  return values.map((v, i) => ({
    date: `2026-01-${String(start + i + 1).padStart(2, "0")}`,
    weekSlug: "2026-W01",
    numericValue: v,
    displayValue: String(v),
  }));
}

function mkPred(overrides: Partial<PredictionRecord> = {}): PredictionRecord {
  const scenarios: PredictionScenario[] = overrides.scenarios ?? [
    { label: "base", probability: 45, direction: "neutral", base: true },
    { label: "up", probability: 35, direction: "up" },
    { label: "down", probability: 20, direction: "down" },
  ];
  return {
    weekSlug: "2026-W01",
    date: "2026-01-01",
    stance: 60,
    stanceLabel: "中立",
    baseScenario: { label: "base", probability: 45, direction: "neutral" },
    scenarios,
    keyMetrics: [],
    outcome: null,
    ...overrides,
  };
}

describe("dirCode", () => {
  it("maps direction to numeric code", () => {
    expect(dirCode("up")).toBe(1);
    expect(dirCode("down")).toBe(-1);
    expect(dirCode("neutral")).toBe(0);
  });
});

describe("trailingReturn / trailingVol — 後方参照でリークしない", () => {
  // 前半は平坦、後半に急騰。asOf を平坦域に置けば trailing は 0 近辺、
  // 一方 forward（未来）は急騰＝両者が食い違う系列でリーク無しを断言する。
  const series = pts([100, 100, 100, 100, 130, 160]); // 01..06

  it("uses only points at/before asOfDate", () => {
    // 01-04 時点・lookback 2 → 01-02..01-04 は全て 100 → 0%
    expect(trailingReturn(series, "2026-01-04", 2, "pct")).toBeCloseTo(0, 5);
    // forward（track-record.forwardReturn）は 01-04→01-06 で +60% になるはず＝trailing とは別物
    // ここでは trailing が未来の急騰を一切拾っていないことが要点
  });

  it("returns null when the trailing window is not reachable", () => {
    expect(trailingReturn(series, "2026-01-01", 2, "pct")).toBeNull(); // 起点しかない
    expect(trailingReturn([], "2026-01-04", 2, "pct")).toBeNull();
  });

  it("computes abs (pt) mode for yields", () => {
    const y = pts([4.0, 4.1, 4.3, 4.35]);
    expect(trailingReturn(y, "2026-01-03", 2, "abs")).toBeCloseTo(0.3, 5); // 4.0→4.3
  });

  it("computes trailing vol as stdev of daily % changes", () => {
    // 変化なし → ボラ 0
    expect(trailingVol(pts([100, 100, 100, 100]), "2026-01-04", 3)).toBeCloseTo(0, 5);
    // 変化点2未満 → null
    expect(trailingVol(pts([100, 101]), "2026-01-02", 3)).toBeNull();
  });
});

describe("buildFeatureMatrix — 確率質量・分散・方向コード", () => {
  const metrics: MetricsHistory = {
    "S&P 500": pts([7000, 7010, 7020, 7030]),
    "米10年債": pts([4.0, 4.02, 4.05, 4.08]),
    "USD/JPY": pts([150, 150.5, 151, 151.5]),
  };

  it("partitions scenario probability mass to 100 and codes base direction", () => {
    const m = buildFeatureMatrix([mkPred()], metrics);
    const r = m.rows[0];
    expect(r.probUp + r.probDown + r.probNeutral).toBe(100);
    expect(r.probUp).toBe(35);
    expect(r.probDown).toBe(20);
    expect(r.probNeutral).toBe(45);
    expect(r.baseDirCode).toBe(0); // base = neutral
    expect(r.scenarioDispersion).toBe(100 - 45); // 1 - max mass
  });

  it("emits null 6M labels before the window matures", () => {
    const m = buildFeatureMatrix([mkPred()], metrics); // 4 pts « 126
    expect(m.rows[0].label_fwd6m_spx).toBeNull();
    expect(m.rows[0].label_baseHit6m).toBeNull();
  });

  it("fills short-term labels from outcome", () => {
    const p = mkPred({
      outcome: {
        assessedDate: "2026-01-08",
        spxDirection: "up",
        baseScenarioDirection: "neutral",
        match: false,
        note: "",
      },
    });
    const r = buildFeatureMatrix([p], metrics).rows[0];
    expect(r.label_stMatch).toBe(0);
    expect(r.label_spxDirCode).toBe(1);
  });
});

describe("buildFeatureMatrix — date dedup（日次ログ・同一 date のみ後勝ち）", () => {
  it("keeps distinct dates within a weekSlug and dedups only true same-date duplicates", () => {
    const preds = [
      mkPred({ weekSlug: "2026-W20", date: "2026-05-18", stance: 72 }),
      mkPred({ weekSlug: "2026-W20", date: "2026-05-20", stance: 75 }), // 別 date → 保持
      mkPred({ weekSlug: "2026-W21", date: "2026-06-01", stance: 70 }), // 週境界日
      mkPred({ weekSlug: "2026-W22", date: "2026-06-01", stance: 68 }), // 同一 date → 後勝ち
    ];
    const m = buildFeatureMatrix(preds, {});
    expect(m.generatedFrom.predictionCount).toBe(4);
    expect(m.generatedFrom.dedupedRows).toBe(3); // 05-18, 05-20, 06-01(後勝ち)
    expect(m.rows.map((r) => r.date)).toEqual(["2026-05-18", "2026-05-20", "2026-06-01"]);
    expect(m.rows[2].stance).toBe(68); // 06-01 は後勝ち（W22）
  });
});

describe("buildFeatureMatrix — longTermViews / 数値 structuralInputs", () => {
  const views: LongTermView[] = [
    { asset: "S&P 500", bias: "up" },
    { asset: "米10年債", bias: "down" },
  ];

  it("maps numeric structuralInputs and long-term-view presence", () => {
    const p = mkPred({
      longTermViews: views,
      structuralInputs: {
        valuation_erp: "1.8",
        real_rate_10y: 1.2,
        credit_spread_hy: "3.4",
        earnings_notes: "自由文は無視", // 非対応キーは拾わない
      } as unknown as Record<string, string>,
    });
    const r = buildFeatureMatrix([p], {}).rows[0];
    expect(r.hasLongTermViews).toBe(1);
    expect(r.si_valuation_erp).toBeCloseTo(1.8, 5);
    expect(r.si_real_rate_10y).toBeCloseTo(1.2, 5);
    expect(r.si_credit_spread_hy).toBeCloseTo(3.4, 5);
    expect(r.si_policy_rate).toBeNull(); // 未指定
  });

  it("has empty per-asset 6M label map when longTermViews absent", () => {
    const r = buildFeatureMatrix([mkPred()], {}).rows[0];
    expect(r.hasLongTermViews).toBe(0);
    expect(r.label_fwd6m_by_asset).toEqual({});
  });
});
