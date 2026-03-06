#!/usr/bin/env node
/**
 * gen-allocation-note.mjs
 *
 * 月次・週次・日次レポートを統合的に読み込み、Claude API で
 * 「なぜこの資産配分か」の解説文（allocationNote）を生成し、
 * 最新週次レポートの frontmatter に書き込む。
 *
 * Usage:
 *   node scripts/gen-allocation-note.mjs
 *   npm run gen-note
 *
 * 前提：
 *   - .env.local に ANTHROPIC_API_KEY が設定されていること
 *   - 最新週次レポートに allocation: フィールドがあること
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "content/reports");

// ── .env.local を手動パース（dotenv 不要）─────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5";

if (!API_KEY) {
  console.warn("⚠  ANTHROPIC_API_KEY が未設定です。allocationNote の生成をスキップします。");
  process.exit(0);
}

// ── ユーティリティ ────────────────────────────────────────────────────
/** 指定タイプの最新レポートを返す */
function getLatest(type) {
  const dir = path.join(REPORTS_DIR, type);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort().reverse();
  if (!files.length) return null;
  const filePath = path.join(dir, files[0]);
  return { filePath, raw: fs.readFileSync(filePath, "utf-8") };
}

/** frontmatter 文字列と本文を分離 */
function splitFM(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[1], body: m[2] };
}

/** frontmatter から特定キーの値を取得（シングル行文字列のみ） */
function fmGet(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*"([^"]*)"`, "m"));
  return m?.[1] ?? null;
}

/** 本文から見出しを除いた冒頭テキスト（最大 chars 文字）を取得 */
function excerpt(raw, chars = 700) {
  const { body } = splitFM(raw);
  return body
    .replace(/^#{1,6}\s.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, chars);
}

// ── メイン ────────────────────────────────────────────────────────────
async function main() {
  const monthly = getLatest("monthly");
  const weekly  = getLatest("weekly");
  const daily   = getLatest("daily");

  if (!weekly) {
    console.log("週次レポートが見つかりません。スキップします。");
    process.exit(0);
  }

  const { fm: weeklyFM } = splitFM(weekly.raw);

  if (!weeklyFM.includes("allocation:")) {
    console.log("週次レポートに allocation フィールドがありません。スキップします。");
    process.exit(0);
  }

  // ── コンテキスト収集 ─────────────────────────────────────────────
  const marketOverview = fmGet(weeklyFM, "marketOverview") ?? "（なし）";
  const stanceLabel    = fmGet(weeklyFM, "stanceLabel") ?? "";
  const stanceVal      = weeklyFM.match(/^stance:\s*(\d+)/m)?.[1] ?? "?";

  // themes（YAML リスト形式）
  const themesBlock = weeklyFM.match(/^themes:\s*\n((?:\s*-\s*.+\n?)*)/m)?.[1] ?? "（なし）";
  const themes = themesBlock
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean)
    .join("\n");

  // allocation（YAML リスト → テキスト）
  const allocBlock = weeklyFM.match(/^allocation:\s*\n((?:\s*-[\s\S]*?)(?=\n\S|$))/m)?.[1] ?? "";
  const allocation = allocBlock
    .split(/\n\s*-\s+/)
    .map((item) => {
      const label   = item.match(/label:\s*"([^"]+)"/)?.[1];
      const percent = item.match(/percent:\s*(\d+)/)?.[1];
      return label && percent ? `${label} ${percent}%` : null;
    })
    .filter(Boolean)
    .join(" / ");

  const monthlyExcerpt = monthly ? excerpt(monthly.raw, 600) : "（なし）";
  const dailyDesc =
    (daily ? fmGet(splitFM(daily.raw).fm, "description") : null) ??
    (daily ? excerpt(daily.raw, 300) : "（なし）");

  // ── プロンプト ────────────────────────────────────────────────────
  const prompt = `あなたは機関投資家向けマクロ市場分析AIです。
以下のデータを踏まえ、「なぜこの資産配分になっているのか」を日本語で2〜3文にまとめてください。

【週次：市況概要】
${marketOverview}

【週次：注目テーマ】
${themes}

【週次：スタンス】
${stanceLabel}（リスクオフ度 ${stanceVal}/100）

【現在の配分】
${allocation}

【月次レポート冒頭（中長期観）】
${monthlyExcerpt}

【日次レポート概要（直近動向）】
${dailyDesc}

出力ルール：
- 2〜3文で完結すること
- 「なぜその比率か」の根拠・論拠を中心に述べること
- 分析的・客観的な口調（断定的すぎない）
- 免責事項は含めない（UI側に表示済み）
- 余分な前置き・説明なし。文章のみ出力すること`;

  console.log("🤖 Claude API で allocationNote を生成中...");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error("❌ API エラー:", res.status, await res.text());
    process.exit(0); // push はブロックしない
  }

  const data = await res.json();
  const note = data.content?.[0]?.text?.trim();

  if (!note) {
    console.error("❌ レスポンスが空です。スキップします。");
    process.exit(0);
  }

  console.log("\n📝 生成されたテキスト：");
  console.log(note);

  // ── frontmatter に書き込む ───────────────────────────────────────
  const escaped = note.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  let updated;
  if (weekly.raw.includes("allocationNote:")) {
    // 既存の allocationNote を置換
    updated = weekly.raw.replace(
      /^allocationNote:.*$/m,
      `allocationNote: "${escaped}"`
    );
  } else {
    // closing --- の直前に追記
    updated = weekly.raw.replace(
      /^(---\r?\n[\s\S]*?)\r?\n---/m,
      `$1\nallocationNote: "${escaped}"\n---`
    );
  }

  fs.writeFileSync(weekly.filePath, updated, "utf-8");
  console.log(`\n✅ ${path.relative(ROOT, weekly.filePath)} に allocationNote を書き込みました`);
  console.log("   git add して commit してください。");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(0); // push はブロックしない
});
