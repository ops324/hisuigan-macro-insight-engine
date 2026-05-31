import type { MetadataRoute } from "next";
import { getAllReports } from "@/lib/reports";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/reports", "/market", "/reports/track-record"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const reportRoutes = getAllReports().map((r) => ({
    url: `${SITE_URL}/reports/${r.slug}`,
    lastModified: r.date ? new Date(r.date) : new Date(),
  }));

  return [...staticRoutes, ...reportRoutes];
}
