import { getPredictions, getMetricsHistory } from "@/lib/history";
import TrackRecordClient from "./TrackRecordClient";

export default function TrackRecordPage() {
  const predictions = getPredictions();
  const metricsHistory = getMetricsHistory();
  return <TrackRecordClient predictions={predictions} metricsHistory={metricsHistory} />;
}
