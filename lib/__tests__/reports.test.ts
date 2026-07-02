import { describe, it, expect } from "vitest";
import path from "path";
import { getAllReports, getReportsByType, getReportBySlug, getAllSlugs } from "@/lib/reports";

// フィクスチャベース（実 content/reports は bot が毎日書き換えるため直接依存しない）
const FIXTURES = path.join(__dirname, "fixtures", "reports");

describe("getAllReports", () => {
  it("全タイプのレポートを読み込む", () => {
    const reports = getAllReports(FIXTURES);
    expect(reports).toHaveLength(5);
  });

  it("日付降順でソートされる（date 欠損は末尾）", () => {
    const reports = getAllReports(FIXTURES);
    const dates = reports.map((r) => r.date);
    expect(dates).toEqual(["2099-04-10", "2099-04-09", "2099-04-06", "2099-04-01", ""]);
  });

  it("frontmatter を型どおりにパースする", () => {
    const monthly = getAllReports(FIXTURES).find((r) => r.slug === "2099-04")!;
    expect(monthly.title).toBe("2099年4月 月次レポート");
    expect(monthly.stance).toBe(55);
    expect(monthly.keyMetrics).toHaveLength(2);
    expect(monthly.keyMetrics![0]).toEqual({ label: "米10年債", value: "4.20%", change: "-0.04", direction: "down" });
    expect(monthly.scenarios![0].base).toBe(true);
    expect(monthly.allocation!.map((a) => a.percent)).toEqual([40, 60]);
  });

  it("title 欠損は slug、type 欠損はディレクトリ名にフォールバック", () => {
    const minimal = getAllReports(FIXTURES).find((r) => r.slug === "2099-04-09-minimal")!;
    expect(minimal.title).toBe("2099-04-09-minimal");
    expect(minimal.type).toBe("daily");
  });
});

describe("getReportsByType", () => {
  it("タイプでフィルタされる", () => {
    expect(getReportsByType("weekly", FIXTURES)).toHaveLength(2);
    expect(getReportsByType("monthly", FIXTURES)).toHaveLength(1);
    expect(getReportsByType("daily", FIXTURES).every((r) => r.type === "daily")).toBe(true);
  });
});

describe("getReportBySlug", () => {
  it("本文込みのフルデータを返す", () => {
    const report = getReportBySlug("2099-W15", FIXTURES)!;
    expect(report.type).toBe("weekly");
    expect(report.quote).toBe("テスト格言");
    expect(report.content).toContain("週次フィクスチャ本文");
  });

  it("存在しない slug は null", () => {
    expect(getReportBySlug("no-such-report", FIXTURES)).toBeNull();
  });
});

describe("getAllSlugs", () => {
  it("slug が一意である", () => {
    const slugs = getAllSlugs(FIXTURES);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

// 実 content への内容非依存の不変条件（bot 更新に影響されない検証のみ）
describe("実 content の不変条件", () => {
  it("全レポートの type は 3 種のいずれかで slug は一意", () => {
    const reports = getAllReports();
    for (const r of reports) {
      expect(["monthly", "weekly", "daily"]).toContain(r.type);
    }
    const slugs = reports.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
