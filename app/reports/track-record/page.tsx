import { getPredictions } from "@/lib/history";
import TrackRecordClient from "./TrackRecordClient";

export default function TrackRecordPage() {
  const predictions = getPredictions();
  return <TrackRecordClient predictions={predictions} />;
}
