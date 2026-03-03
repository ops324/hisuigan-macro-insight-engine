import { getReportsByType } from "@/lib/reports";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const weeklyReports = getReportsByType("weekly");
  const latest = weeklyReports[0];

  if (!latest || !latest.quote) {
    return NextResponse.json({ quote: null, quoteAuthor: null });
  }

  return NextResponse.json({
    quote: latest.quote,
    quoteAuthor: latest.quoteAuthor ?? null,
  });
}
