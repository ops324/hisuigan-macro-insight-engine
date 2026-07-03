import { describe, it, expect } from "vitest";
import { formatDate, splitPanelLines } from "@/lib/format";

describe("formatDate", () => {
  it("ISO 日付を和暦表示に変換する", () => {
    expect(formatDate("2026-07-03")).toBe("2026年7月3日");
  });

  it("不正な文字列はそのまま返す", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("")).toBe("");
  });
});

describe("splitPanelLines", () => {
  it("句点「。」ごとに改行する", () => {
    expect(splitPanelLines("A。B。")).toEqual(["A。", "B。"]);
  });

  it("読点区切りで文中の丸数字の直前でも改行する", () => {
    expect(splitPanelLines("守りだが、④業績：強い。")).toEqual(["守りだが、", "④業績：強い。"]);
  });

  it("句点直後の丸数字で二重改行しない", () => {
    expect(splitPanelLines("維持した。①政策の話。")).toEqual(["維持した。", "①政策の話。"]);
  });

  it("区切りが無い文字列はそのまま1要素で返す", () => {
    expect(splitPanelLines("abc")).toEqual(["abc"]);
  });

  it("空文字は空配列を返す", () => {
    expect(splitPanelLines("")).toEqual([]);
  });

  it("複合語の「・」は割らない", () => {
    expect(splitPanelLines("実質金利・割引率の高止まり。")).toEqual(["実質金利・割引率の高止まり。"]);
  });
});
