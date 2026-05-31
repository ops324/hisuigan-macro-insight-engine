import { describe, it, expect } from "vitest";
import {
  parseStooqCsv,
  commodityJpyValues,
  pickLatestTwoValidFred,
  parseJgbCsv,
} from "@/lib/market-data";

describe("parseStooqCsv", () => {
  const header = "Symbol,Date,Time,Open,High,Low,Close,Volume";

  it("parses open and close from a valid row", () => {
    const csv = `${header}\nCL.F,2026-06-01,21:00:00,97.00,98.50,96.10,97.80,12345`;
    expect(parseStooqCsv(csv)).toEqual({ open: 97.0, close: 97.8 });
  });

  it("trims surrounding whitespace", () => {
    const csv = `\n${header}\n^SPX,2026-06-01,21:00:00,7400,7450,7380,7408,0\n`;
    expect(parseStooqCsv(csv)).toEqual({ open: 7400, close: 7408 });
  });

  it("throws when the data row has too few columns", () => {
    const csv = `${header}\nCL.F,2026-06-01,21:00:00,97.00`;
    expect(() => parseStooqCsv(csv)).toThrow(/insufficient columns/);
  });

  it("throws when OHLC is non-numeric (e.g. N/D from Stooq)", () => {
    const csv = `${header}\nCL.F,2026-06-01,N/D,N/D,N/D,N/D,N/D,N/D`;
    expect(() => parseStooqCsv(csv)).toThrow(/non-numeric/);
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
