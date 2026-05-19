import fs from "fs";
import path from "path";

const HISTORY_DIR = path.join(process.cwd(), "content/history");

export interface PredictionOutcome {
  assessedDate: string;
  spxActualChange?: string;
  spxDirection?: "up" | "down" | "neutral";
  baseScenarioDirection: "up" | "down" | "neutral";
  match: boolean;
  note: string;
}

export interface PredictionScenario {
  label: string;
  probability: number;
  direction: "up" | "down" | "neutral";
  base?: boolean;
}

export interface PredictionMetric {
  label: string;
  value: string;
  numericValue: number;
}

export interface PredictionRecord {
  weekSlug: string;
  date: string;
  stance: number;
  stanceLabel: string;
  baseScenario: {
    label: string;
    probability: number;
    direction: "up" | "down" | "neutral";
  };
  scenarios: PredictionScenario[];
  keyMetrics: PredictionMetric[];
  outcome: PredictionOutcome | null;
}

export interface MetricPoint {
  date: string;
  weekSlug: string;
  numericValue: number;
  displayValue: string;
}

export type MetricsHistory = Record<string, MetricPoint[]>;

export function getPredictions(): PredictionRecord[] {
  const filePath = path.join(HISTORY_DIR, "predictions.json");
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as PredictionRecord[];
}

export function getMetricsHistory(): MetricsHistory {
  const filePath = path.join(HISTORY_DIR, "metrics.json");
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as MetricsHistory;
}

export function getSparklinePoints(label: string): MetricPoint[] {
  const history = getMetricsHistory();
  return (history[label] ?? []).slice(-12);
}
