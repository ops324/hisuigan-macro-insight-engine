import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReportBySlug, getAllSlugs } from "@/lib/reports";
import { SITE_NAME } from "@/lib/site";
import ReportClient from "./ReportClient";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) return {};

  const title = `${report.title} | ${SITE_NAME}`;
  const description = report.description ?? `${SITE_NAME}のマクロ市場分析レポート。`;
  const url = `/reports/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      publishedTime: report.date || undefined,
    },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) notFound();

  return <ReportClient report={report} />;
}
