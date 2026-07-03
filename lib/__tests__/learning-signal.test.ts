import { describe, it, expect } from "vitest";
import { getLearningSignal } from "@/lib/learning-signal";
import { getPredictions } from "@/lib/history";
import { validateLearningSignal } from "@/lib/learning";

// 実 content/history の【形状不変条件】のみ検証（値は bot が毎週書き換えるため非依存）。
// CI は PR 限定で bot の main 直 push は無検証のため、この不変条件テストが安全網になる。

describe("実 learning-signal.json の不変条件", () => {
  const signal = getLearningSignal();

  it("成果物が存在し commit されている", () => {
    expect(signal, "content/history/learning-signal.json が無い。npm run gen:learning で生成すること").not.toBeNull();
  });

  it("スキーマ検証を通る", () => {
    if (!signal) return;
    const { ok, errors } = validateLearningSignal(signal);
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it("主要フィールドの型・列挙が正しい（値非依存）", () => {
    if (!signal) return;
    expect(signal.schemaVersion).toBe(1);
    expect(typeof signal.generatedAt).toBe("string");
    expect(signal.generatedAt.length).toBeGreaterThan(0);
    expect(typeof signal.maturity.sixMonthWindowsMatured).toBe("boolean");
    expect(Array.isArray(signal.scenarioCalibration.reliability)).toBe(true);
    expect(Array.isArray(signal.stance.flags)).toBe(true);
    expect(["none", "slight-recenter"]).toContain(signal.recommendations.probabilityAdjustment);
    expect(["low", "medium", "high"]).toContain(signal.recommendations.overallConfidence);
    expect(signal.directionBias.flags).toContain("DESCRIPTIVE_ONLY");
    expect(signal.scenarioCalibration.horizon).toBe("short");
  });
});

describe("実 predictions.json の不変条件", () => {
  const preds = getPredictions();

  it("配列であり各エントリが必須キーを持つ", () => {
    expect(Array.isArray(preds)).toBe(true);
    for (const p of preds) {
      expect(typeof p.weekSlug).toBe("string");
      expect(typeof p.date).toBe("string");
      expect(typeof p.stance).toBe("number");
      expect(p.baseScenario && typeof p.baseScenario).toBe("object");
      expect(Array.isArray(p.scenarios)).toBe(true);
      expect("outcome" in p).toBe(true); // null 可
    }
  });
});
