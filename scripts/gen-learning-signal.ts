// content/history/learning-signal.json を決定論的に生成する。
// 実行：npm run gen:learning [-- --date=YYYY-MM-DD]
//
// CI は PR 限定で bot の main 直 push は無検証のため、この生成器自身が最後の砦。
// 書込み前に predictions.json の形状と成果物スキーマを検証し、失敗なら【書かず】非0終了する。

import fs from "fs";
import path from "path";
import { generateLearningSignal, serializeLearningSignal, LEARNING_SIGNAL_PATH } from "../lib/learning-signal";
import { validateLearningSignal } from "../lib/learning";

// 引数 --date=YYYY-MM-DD（省略時は当日）
const dateArg = process.argv.find((a) => a.startsWith("--date="))?.split("=")[1];

// predictions.json の最小形状チェック（配列・必須キー）
function validatePredictions(): string[] {
  const errors: string[] = [];
  const p = path.join(process.cwd(), "content/history/predictions.json");
  if (!fs.existsSync(p)) return ["predictions.json not found"];
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return ["predictions.json is not valid JSON"];
  }
  if (!Array.isArray(data)) return ["predictions.json must be an array"];
  data.forEach((rec, i) => {
    const r = rec as Record<string, unknown>;
    if (typeof r.weekSlug !== "string") errors.push(`[${i}] weekSlug missing`);
    if (typeof r.date !== "string") errors.push(`[${i}] date missing`);
    if (typeof r.stance !== "number") errors.push(`[${i}] stance missing`);
    if (!r.baseScenario || typeof r.baseScenario !== "object") errors.push(`[${i}] baseScenario missing`);
    if (!Array.isArray(r.scenarios)) errors.push(`[${i}] scenarios must be array`);
    if (!("outcome" in r)) errors.push(`[${i}] outcome key missing`);
  });
  return errors;
}

function main(): void {
  const predErrors = validatePredictions();
  if (predErrors.length) {
    console.error("✗ predictions.json validation failed:");
    predErrors.slice(0, 10).forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  const signal = generateLearningSignal(dateArg);
  const { ok, errors } = validateLearningSignal(signal);
  if (!ok) {
    console.error("✗ learning-signal validation failed (not written):");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }

  fs.writeFileSync(LEARNING_SIGNAL_PATH, serializeLearningSignal(signal), "utf-8");
  console.log(
    `✓ learning-signal.json written (generatedAt=${signal.generatedAt}, ` +
      `predictions=${signal.sourceCounts.predictions}, resolved=${signal.sourceCounts.resolvedOutcomes}, ` +
      `matured6M=${signal.maturity.sixMonthWindowsMatured})`,
  );
}

main();
