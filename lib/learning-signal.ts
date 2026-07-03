// 学習シグナル成果物の fs ラッパ（lib/history.ts に倣う）
// - generateLearningSignal：predictions/metrics を読み computeLearningSignal を呼び generatedAt を注入
// - getLearningSignal：commit 済み JSON を読む（無ければ null）
// - serializeLearningSignal：安定キー順＋末尾改行（決定論的な最小 diff）

import fs from "fs";
import path from "path";
import { getMetricsHistory, getPredictions } from "./history";
import { computeLearningSignal, type LearningSignal } from "./learning";

const HISTORY_DIR = path.join(process.cwd(), "content/history");
const SIGNAL_PATH = path.join(HISTORY_DIR, "learning-signal.json");

// asOf（YYYY-MM-DD）を渡さなければ実行時の当日。純粋計算は computeLearningSignal 側で決定論的。
export function generateLearningSignal(asOf?: string): LearningSignal {
  const signal = computeLearningSignal(getPredictions(), getMetricsHistory());
  signal.generatedAt = asOf ?? new Date().toISOString().slice(0, 10);
  return signal;
}

export function getLearningSignal(): LearningSignal | null {
  if (!fs.existsSync(SIGNAL_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(SIGNAL_PATH, "utf-8")) as LearningSignal;
  } catch {
    return null;
  }
}

// computeLearningSignal は挿入順が固定のため JSON.stringify がそのまま安定キー順になる。
export function serializeLearningSignal(signal: LearningSignal): string {
  return JSON.stringify(signal, null, 2) + "\n";
}

export const LEARNING_SIGNAL_PATH = SIGNAL_PATH;
