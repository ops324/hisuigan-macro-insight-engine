import { getReportsByType, ReportType, ReportMeta } from "@/lib/reports";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  const types: ReportType[] = ["monthly", "weekly", "daily"];
  const latestWeekly = getReportsByType("weekly")[0];
  const latestDaily  = getReportsByType("daily")[0];

  const reportsByType: Record<ReportType, ReportMeta[]> = {
    monthly: getReportsByType("monthly"),
    weekly:  getReportsByType("weekly"),
    daily:   getReportsByType("daily"),
  };

  return <ReportsClient latestWeekly={latestWeekly} latestDaily={latestDaily} reportsByType={reportsByType} />;
}
