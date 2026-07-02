import type { MetadataRoute } from "next";
import { getAllReports } from "@/lib/reports";
import { SITE_URL } from "@/lib/site";

// 有効な日付文字列のみ Date 化（不正・欠損はフォールバック）
function toDate(dateStr: string | undefined, fallback: Date): Date {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const reports = getAllReports(); // 日付降順
  const now = new Date();
  // 静的ルートの lastModified は「常に今日」ではなく最新レポート日付（クロール効率のため実更新に合わせる）
  const latest = toDate(reports[0]?.date, now);

  const staticRoutes = ["/reports", "/market", "/reports/track-record"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: latest,
  }));

  const reportRoutes = reports.map((r) => ({
    url: `${SITE_URL}/reports/${r.slug}`,
    lastModified: toDate(r.date, now),
  }));

  return [...staticRoutes, ...reportRoutes];
}
