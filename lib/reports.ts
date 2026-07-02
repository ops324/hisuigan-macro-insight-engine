import fs from "fs";
import path from "path";
import matter from "gray-matter";

const REPORTS_DIR = path.join(process.cwd(), "content/reports");

export type ReportType = "monthly" | "weekly" | "daily";

export interface ScenarioItem {
  label: string;
  probability: number;
  direction: "up" | "neutral" | "down";
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

export interface KeyMetricItem {
  label: string;
  value: string;
  change?: string;
  direction?: "up" | "down" | "flat";
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
      reports.push({
        slug,
        title: data.title ?? slug,
        date: data.date ?? "",
        type: (data.type as ReportType) ?? type,
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
      });
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
    return {
      slug,
      title: data.title ?? slug,
      date: data.date ?? "",
      type: (data.type as ReportType) ?? type,
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
      content,
    };
  }
  return null;
}

export function getAllSlugs(baseDir: string = REPORTS_DIR): string[] {
  return getAllReports(baseDir).map((r) => r.slug);
}
