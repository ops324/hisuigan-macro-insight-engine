import { describe, it, expect } from "vitest";
import {
  parseGoldApiPrice,
  parseSwissquotePrice,
  parseYahooChartPrice,
  usdPerTonneToLb,
  firstOk,
  commodityJpyValues,
  pickLatestTwoValidFred,
  parseJgbCsv,
} from "@/lib/market-data";

describe("parseGoldApiPrice", () => {
  it("extracts the numeric price from a valid response", () => {
    const json = { currency: "USD", name: "Gold", price: 4168.799805, symbol: "XAU" };
    expect(parseGoldApiPrice(json)).toBe(4168.799805);
  });

  it("throws when price is missing", () => {
    expect(() => parseGoldApiPrice({ currency: "USD" })).toThrow(/missing or non-numeric/);
  });

  it("throws when price is a string", () => {
    expect(() => parseGoldApiPrice({ price: "4168.8" })).toThrow(/missing or non-numeric/);
  });

  it("throws when price is NaN", () => {
    expect(() => parseGoldApiPrice({ price: NaN })).toThrow(/missing or non-numeric/);
  });

  it("throws on null / non-object responses", () => {
    expect(() => parseGoldApiPrice(null)).toThrow(/missing or non-numeric/);
    expect(() => parseGoldApiPrice("error")).toThrow(/missing or non-numeric/);
  });
});

describe("parseSwissquotePrice", () => {
  const feed = [
    {
      topo: { platform: "SwissquoteLtd", server: "Live5" },
      spreadProfilePrices: [
        { spreadProfile: "premium", bid: 4164.469, ask: 4165.131 },
        { spreadProfile: "prime", bid: 4164.483, ask: 4165.117 },
      ],
      ts: 1783095563355,
    },
  ];

  it("returns the mid price of the first numeric bid/ask profile", () => {
    expect(parseSwissquotePrice(feed)).toBeCloseTo(4164.8, 1);
  });

  it("skips profiles with non-numeric bid/ask and falls through to the next", () => {
    const partial = [
      { spreadProfilePrices: [{ spreadProfile: "x", bid: "n/a", ask: null }] },
      { spreadProfilePrices: [{ spreadProfile: "y", bid: 62.2, ask: 62.6 }] },
    ];
    expect(parseSwissquotePrice(partial)).toBeCloseTo(62.4, 1);
  });

  it("throws on empty array (Swissquote returns [] for unsupported symbols like copper)", () => {
    expect(() => parseSwissquotePrice([])).toThrow(/no numeric bid\/ask/);
  });

  it("throws on non-array responses", () => {
    expect(() => parseSwissquotePrice(null)).toThrow(/no numeric bid\/ask/);
  });
});

describe("parseYahooChartPrice", () => {
  it("extracts regularMarketPrice from the chart meta", () => {
    const json = { chart: { result: [{ meta: { regularMarketPrice: 6.215, currency: "USD" } }] } };
    expect(parseYahooChartPrice(json)).toBe(6.215);
  });

  it("throws when chart.error is present", () => {
    const json = { chart: { error: { code: "Not Found" }, result: null } };
    expect(() => parseYahooChartPrice(json)).toThrow(/Yahoo chart error/);
  });

  it("throws when regularMarketPrice is missing or non-numeric", () => {
    expect(() => parseYahooChartPrice({ chart: { result: [{ meta: {} }] } })).toThrow(/non-numeric/);
    expect(() => parseYahooChartPrice(null)).toThrow(/non-numeric/);
  });
});

describe("usdPerTonneToLb", () => {
  it("converts USD/metric-ton to USD/lb", () => {
    // FRED PCOPPUSDM ≈ 13483.75 USD/tonne → ≈ 6.12 USD/lb（gold-api の HG ≈ 6.0 に整合）
    expect(usdPerTonneToLb(13483.75)).toBeCloseTo(6.116, 2);
  });
});

describe("firstOk (fallback chain)", () => {
  const ok = (v: number) => () => Promise.resolve(v);
  const fail = (msg: string) => () => Promise.reject(new Error(msg));

  it("returns the first source's value when it succeeds (no fallback hit)", async () => {
    let secondCalled = false;
    const v = await firstOk([
      ok(100),
      () => {
        secondCalled = true;
        return Promise.resolve(200);
      },
    ]);
    expect(v).toBe(100);
    expect(secondCalled).toBe(false);
  });

  it("skips failing sources and returns the first success", async () => {
    expect(await firstOk([fail("gold-api down"), fail("swissquote down"), ok(6.2)])).toBe(6.2);
  });

  it("throws the last error when every source fails", async () => {
    await expect(firstOk([fail("a"), fail("b"), fail("last")])).rejects.toThrow(/last/);
  });

  it("throws when given no sources", async () => {
    await expect(firstOk([])).rejects.toThrow(/all sources failed/);
  });
});

describe("commodityJpyValues", () => {
  it("converts USD/unit price to JPY", () => {
    const r = commodityJpyValues(96, 97, 159, false);
    expect(r.closeJpy).toBeCloseTo(15423, 0);
    expect(r.openJpy).toBeCloseTo(15264, 0);
    expect(r.change).toBeCloseTo(159, 0);
    expect(r.pct).toBeCloseTo(1.0417, 3);
  });

  it("treats cents/lb (copper) by dividing the rate by 100", () => {
    // 450 cents/lb = $4.50/lb; at 159 JPY/USD → ¥715.5/lb
    const r = commodityJpyValues(440, 450, 159, true);
    expect(r.closeJpy).toBeCloseTo(715.5, 1);
    expect(r.openJpy).toBeCloseTo(699.6, 1);
  });

  it("avoids division by zero when open is 0", () => {
    const r = commodityJpyValues(0, 10, 159, false);
    expect(r.pct).toBe(0);
  });
});

describe("pickLatestTwoValidFred", () => {
  it("returns the two most recent valid observations", () => {
    const obs = [{ value: "4.63" }, { value: "4.58" }, { value: "4.50" }];
    expect(pickLatestTwoValidFred(obs)).toEqual({ current: 4.63, previous: 4.58 });
  });

  it('skips "." missing markers (weekends/holidays)', () => {
    const obs = [{ value: "." }, { value: "4.63" }, { value: "." }, { value: "4.55" }];
    expect(pickLatestTwoValidFred(obs)).toEqual({ current: 4.63, previous: 4.55 });
  });

  it("returns previous=null when only one valid value exists", () => {
    const obs = [{ value: "4.63" }, { value: "." }];
    expect(pickLatestTwoValidFred(obs)).toEqual({ current: 4.63, previous: null });
  });

  it("throws when there are no valid observations", () => {
    expect(() => pickLatestTwoValidFred([{ value: "." }])).toThrow(/No valid/);
  });
});

describe("parseJgbCsv", () => {
  const targets = [
    { label: "2年債", col: "2年" },
    { label: "10年債", col: "10年" },
  ];
  const csv = [
    "（注記行はここに混ざる）",
    "基準日,1年,2年,5年,10年,30年",
    "R8.5.28,0.5,0.85,1.2,2.60,3.10",
    "R8.5.29,0.5,0.88,1.25,2.64,3.12",
    "※本データは...",
  ].join("\n");

  it("extracts current/previous yields for the target tenors", () => {
    const r = parseJgbCsv(csv, targets);
    expect(r).toEqual([
      { term: "2年債", current: 0.88, previous: 0.85 },
      { term: "10年債", current: 2.64, previous: 2.6 },
    ]);
  });

  it("returns previous=null when only one R-row exists (month start)", () => {
    const single = ["基準日,1年,2年,5年,10年,30年", "R8.5.1,0.5,0.9,1.3,2.7,3.2"].join("\n");
    const r = parseJgbCsv(single, targets);
    expect(r[0].previous).toBeNull();
  });

  it("throws when a target column is missing", () => {
    const bad = ["基準日,1年,5年", "R8.5.29,0.5,1.25"].join("\n");
    expect(() => parseJgbCsv(bad, targets)).toThrow(/column/);
  });

  it("throws when the header row is absent", () => {
    expect(() => parseJgbCsv("R8.5.29,0.5,0.88", targets)).toThrow(/header/);
  });
});
