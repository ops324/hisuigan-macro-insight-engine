import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/format";

describe("formatDate", () => {
  it("ISO 日付を和暦表示に変換する", () => {
    expect(formatDate("2026-07-03")).toBe("2026年7月3日");
  });

  it("不正な文字列はそのまま返す", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("")).toBe("");
  });
});
