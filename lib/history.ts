import fs from "fs";
import path from "path";
import type { Direction } from "./metrics";

// 共通型は lib/metrics.ts に集約（既存 import 互換のため再エクスポート）
export type { Direction };

const HISTORY_DIR = path.join(process.cwd(), "content/history");

export interface PredictionOutcome {
  assessedDate: string;
  spxActualChange?: string;
  spxDirection?: Direction;
  baseScenarioDirection: Direction;
  match: boolean;
  note: string;
}

export interface PredictionScenario {
  label: string;
  probability: number;
  direction: Direction;
  base?: boolean;
}

// 資産別の長期方向バイアス（月次・週次の longTermViews frontmatter から harvest）
export interface LongTermView {
  asset: string;
  bias: Direction;
  rationale?: string;
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
    direction: Direction;
  };
  scenarios: PredictionScenario[];
  keyMetrics: PredictionMetric[];
  outcome: PredictionOutcome | null;
  // 任意・後方互換：資産別の長期方向と、その根拠となった構造変数のスナップショット
  longTermViews?: LongTermView[];
  structuralInputs?: Record<string, string>;
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
