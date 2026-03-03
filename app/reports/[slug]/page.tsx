import { notFound } from "next/navigation";
import { getReportBySlug, getAllSlugs } from "@/lib/reports";
import ReportClient from "./ReportClient";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReportBySlug(slug);
  if (!report) notFound();

  return <ReportClient report={report} />;
}
