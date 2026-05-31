import { getReportsByType, ReportType, ReportMeta } from "@/lib/reports";
import { getMetricsHistory, MetricsHistory } from "@/lib/history";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  const latestWeekly = getReportsByType("weekly")[0];
  const latestDaily  = getReportsByType("daily")[0];

  const reportsByType: Record<ReportType, ReportMeta[]> = {
    monthly: getReportsByType("monthly"),
    weekly:  getReportsByType("weekly"),
    daily:   getReportsByType("daily"),
  };

  const metricsHistory: MetricsHistory = getMetricsHistory();

  return <ReportsClient latestWeekly={latestWeekly} latestDaily={latestDaily} reportsByType={reportsByType} metricsHistory={metricsHistory} />;
}
