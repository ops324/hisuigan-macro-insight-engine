import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Direction } from "./metrics";

const REPORTS_DIR = path.join(process.cwd(), "content/reports");

export type ReportType = "monthly" | "weekly" | "daily";

export interface ScenarioItem {
  label: string;
  probability: number;
  direction: Direction;
  base?: boolean;
  rationale?: string;
}

export interface RegimeInfo {
  cycle: string;
  inflation: string;
  policy: string;
  summary?: string;
}

export interface AllocationItem {
  label: string;
  percent: number;
}

export type SectorItem = AllocationItem;

// frontmatter 語彙（"flat"）のため Direction（up/down/neutral）とは統合しない
export type MetricDirection = "up" | "down" | "flat";

export interface KeyMetricItem {
  label: string;
  value: string;
  change?: string;
  direction?: MetricDirection;
}

export interface ReportMeta {
  slug: string;
  title: string;
  date: string;
  type: ReportType;
  description?: string;
  stance?: number;
  stancePrev?: number;
  stanceLabel?: string;
  stanceRationale?: string;
  themes?: string[];
  scenarios?: ScenarioItem[];
  quote?: string;
  quoteAuthor?: string;
  marketOverview?: string;
  regime?: RegimeInfo;
  keyMetrics?: KeyMetricItem[];
  allocation?: AllocationItem[];
  allocationNote?: string;
  sectors?: SectorItem[];
  sectorsNote?: string;
}

export interface Report extends ReportMeta {
  content: string;
}

const TYPE_DIRS: ReportType[] = ["monthly", "weekly", "daily"];

// gray-matter の frontmatter → ReportMeta へのマッピングを一本化
// （getAllReports / getReportBySlug の二重手書きを解消）。
function toReportMeta(slug: string, fallbackType: ReportType, data: matter.GrayMatterFile<string>["data"]): ReportMeta {
  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    type: (data.type as ReportType) ?? fallbackType,
    description: data.description,
    stance: data.stance,
    stancePrev: data.stancePrev,
    stanceLabel: data.stanceLabel,
    stanceRationale: data.stanceRationale,
    themes: data.themes,
    scenarios: data.scenarios,
    quote: data.quote,
    quoteAuthor: data.quoteAuthor,
    marketOverview: data.marketOverview,
    regime: data.regime,
    keyMetrics: data.keyMetrics,
    allocation: data.allocation,
    allocationNote: data.allocationNote,
    sectors: data.sectors,
    sectorsNote: data.sectorsNote,
  };
}

// baseDir はテスト用の注入点（既定は content/reports）。
export function getAllReports(baseDir: string = REPORTS_DIR): ReportMeta[] {
  const reports: ReportMeta[] = [];

  for (const type of TYPE_DIRS) {
    const dir = path.join(baseDir, type);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      reports.push(toReportMeta(slug, type, data));
    }
  }

  // 日付降順
  return reports.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getReportsByType(type: ReportType, baseDir: string = REPORTS_DIR): ReportMeta[] {
  return getAllReports(baseDir).filter((r) => r.type === type);
}

export function getReportBySlug(slug: string, baseDir: string = REPORTS_DIR): Report | null {
  for (const type of TYPE_DIRS) {
    const filePath = path.join(baseDir, type, `${slug}.md`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return { ...toReportMeta(slug, type, data), content };
  }
  return null;
}

export function getAllSlugs(baseDir: string = REPORTS_DIR): string[] {
  return getAllReports(baseDir).map((r) => r.slug);
}
