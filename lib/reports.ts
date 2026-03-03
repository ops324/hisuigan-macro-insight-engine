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
}

export interface ReportMeta {
  slug: string;
  title: string;
  date: string;
  type: ReportType;
  description?: string;
  stance?: number;
  stanceLabel?: string;
  themes?: string[];
  scenarios?: ScenarioItem[];
  quote?: string;
  quoteAuthor?: string;
}

export interface Report extends ReportMeta {
  content: string;
}

const TYPE_DIRS: ReportType[] = ["monthly", "weekly", "daily"];

export function getAllReports(): ReportMeta[] {
  const reports: ReportMeta[] = [];

  for (const type of TYPE_DIRS) {
    const dir = path.join(REPORTS_DIR, type);
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
        stanceLabel: data.stanceLabel,
        themes: data.themes,
        scenarios: data.scenarios,
        quote: data.quote,
        quoteAuthor: data.quoteAuthor,
      });
    }
  }

  // 日付降順
  return reports.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getReportsByType(type: ReportType): ReportMeta[] {
  return getAllReports().filter((r) => r.type === type);
}

export function getReportBySlug(slug: string): Report | null {
  for (const type of TYPE_DIRS) {
    const filePath = path.join(REPORTS_DIR, type, `${slug}.md`);
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
      stanceLabel: data.stanceLabel,
      themes: data.themes,
      scenarios: data.scenarios,
      quote: data.quote,
      quoteAuthor: data.quoteAuthor,
      content,
    };
  }
  return null;
}

export function getAllSlugs(): string[] {
  return getAllReports().map((r) => r.slug);
}
