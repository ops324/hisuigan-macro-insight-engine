import { getPredictions, getMetricsHistory } from "@/lib/history";
import { getLearningSignal } from "@/lib/learning-signal";
import TrackRecordClient from "./TrackRecordClient";

export default function TrackRecordPage() {
  const predictions = getPredictions();
  const metricsHistory = getMetricsHistory();
  const learning = getLearningSignal();
  return <TrackRecordClient predictions={predictions} metricsHistory={metricsHistory} learning={learning} />;
}
