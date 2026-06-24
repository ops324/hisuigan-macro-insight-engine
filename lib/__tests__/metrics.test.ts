import { describe, it, expect } from "vitest";
import { changeDisplay, metricGroup, directionLabel, directionColor } from "@/lib/metrics";

describe("changeDisplay", () => {
  it("appends pt to a bare signed number for yield values", () => {
    expect(changeDisplay("4.63%", "-0.04")).toBe("-0.04pt");
    expect(changeDisplay("2.64%", "+0.05")).toBe("+0.05pt");
  });

  it("leaves change verbatim when it already carries a unit", () => {
    expect(changeDisplay("4.63%", "-0.04pt")).toBe("-0.04pt");
    expect(changeDisplay("4.63%", "-2bp")).toBe("-2bp");
  });

  it("does not add pt for non-yield values", () => {
    expect(changeDisplay("7,408", "+1.2%")).toBe("+1.2%");
    expect(changeDisplay("¥15,427", "+120")).toBe("+120");
  });

  it("returns undefined when change is missing", () => {
    expect(changeDisplay("4.63%", undefined)).toBeUndefined();
  });
});

describe("metricGroup", () => {
  it("classifies yields before commodities so 金利 does not collide with 金", () => {
    expect(metricGroup("米10年債")).toBe("金利");
    expect(metricGroup("日本国債利回り")).toBe("金利");
  });

  it("classifies commodities including 金 (gold)", () => {
    expect(metricGroup("金")).toBe("コモディティ");
    expect(metricGroup("WTI原油")).toBe("コモディティ");
    expect(metricGroup("銅")).toBe("コモディティ");
  });

  it("classifies forex pairs", () => {
    expect(metricGroup("USD/JPY")).toBe("為替");
    expect(metricGroup("ドル円")).toBe("為替");
  });

  it("classifies equity indices", () => {
    expect(metricGroup("S&P 500")).toBe("株式");
    expect(metricGroup("日経225")).toBe("株式");
  });

  it("falls back to その他 for unknown labels", () => {
    expect(metricGroup("VIX指数")).toBe("株式"); // 指数 にマッチ
    expect(metricGroup("ビットコイン")).toBe("その他");
  });
});

describe("direction helpers", () => {
  it("maps direction to arrow glyphs", () => {
    expect(directionLabel("up")).toBe("▲");
    expect(directionLabel("down")).toBe("▼");
    expect(directionLabel("flat")).toBe("—");
  });

  it("maps direction to colors", () => {
    expect(directionColor("up")).toBe("#4e8d6f");
    expect(directionColor("down")).toBe("#c25f52");
    expect(directionColor("flat")).toBe("#8c8576");
  });
});
