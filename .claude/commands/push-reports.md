# push-reports

月次・週次・日次レポートを統合してカレントビュー frontmatter を生成し、git push するワークフロー。
APIキー不要。Claude Code セッション内で完結する。

## 実行手順

### Step 1: レポートを読み込む

以下を順番に読む：
1. `content/reports/monthly/` 内の最新ファイル（ファイル名降順で先頭）
2. `content/reports/weekly/` 内の最新ファイル
3. `content/reports/daily/` 内の最新ファイル

### Step 1.5: 旧レポートを削除する（1タイプ1件ルール）

各タイプのディレクトリに複数ファイルが存在する場合、最新1件（ファイル名降順で先頭）を残し、それ以外を `git rm` で削除する。

対象ディレクトリ：
- `content/reports/monthly/`
- `content/reports/weekly/`
- `content/reports/daily/`

削除が不要な場合（各ディレクトリに1件のみ）はスキップする。

### Step 2: カレントビュー frontmatter を統合生成する

3本のレポートの内容・スタンス・テーマを総合的に分析し、
週次レポートの frontmatter に以下のフィールドを生成・上書きする。

#### 生成ルール

| フィールド | 生成ルール |
|-----------|-----------|
| `stancePrev` | **stance を上書きする前**に、週次ファイルに記載されている現在の `stance` 値をこのフィールドへ退避する（前回値の保存）。週次ファイルに `stance` が未記載の場合は `stancePrev` も省略する |
| `stance` | 中長期リスクオフ度を 0〜100 の整数で設定（0=完全リスクオン、100=完全リスクオフ） |
| `stanceLabel` | stance に対応するラベル（例：「積極的」「中立」「守り重視」「完全守備」） |
| `stanceRationale` | なぜこの stance 値になったかを 2〜3 文で。stance を押し上げた/押し下げた具体的な要因（指標・イベント・地政学等）を明示する。数字の根拠を残すための必須フィールド |
| `marketOverview` | 市況概要を 2〜3 文で。月次の中長期観・週次の相場テーマ・日次の直近動向を統合した内容 |
| `regime` | 現在のマクロ局面を 4 フィールドで。`cycle`（景気局面：拡大／減速／後退 等）・`inflation`（インフレ局面：加速／高止まり／鈍化 等）・`policy`（金融政策局面：引き締め／据え置き／緩和 等）・`summary`（総括 1〜2 文）。各局面ラベルは 12 文字以内を目安に簡潔に |
| `keyMetrics` | 主要指標スナップショットを 4〜6 件。各項目は `label`（指標名）・`value`（値。単位込みの文字列）・`change`（前回比。任意）・`direction`（`up`/`down`/`flat`。任意）。`change` は確かな数値が取れる場合のみ付与し、不明なら省略する。**コモディティ（WTI原油・金・銀・銅等）の `value` は必ず日本円（¥）で記載すること**。USD 建て価格に最新の USD/JPY レートを乗算して整数円に丸め `¥XX,XXX` 形式で記載する（例：WTI $97・USD/JPY 159 → `"¥15,423"`）。株式指数・債券利回り・為替は従来どおりの単位 |
| `themes` | 注目テーマを 3〜5 件。絵文字（🔴🟡🟢）でリスク度を表現。形式：`"絵文字 テーマ名 — 説明"` |
| `scenarios` | 予測シナリオを 3 件（楽観・中立・悲観）。確率の合計は必ず 100%。base: true は 1 件のみ。各シナリオに `rationale`（その確率と判断の根拠を 1〜2 文で）を必ず付与する |
| `allocation` | 資産配分を 6 クラス以内で。合計は必ず 100%。コモディティ・債券・株式・現金をバランスよく |
| `allocationNote` | 「なぜこの配分か」を 2〜3 文で。月次の中長期観・週次のテーマ・日次の動向を統合した根拠 |
| `sectors` | 注目セクターを 4〜6 件。注目度（percent）の合計は必ず 100%。セクター例：半導体、エネルギー、金融、ヘルスケア、テクノロジー、不動産、公益事業、素材、消費財、通信 等 |
| `sectorsNote` | 「なぜこれらのセクターに注目するか」を 2〜3 文で。月次の構造変化・週次のテーマ・日次の動向を統合した根拠 |
| `quote` | 今週の市場環境に示唆を与える格言・名言（30文字以内） |
| `quoteAuthor` | 格言の著者名または出典。AI生成の場合は `"翡翠眼"` |

#### sectorsNote の口調
- 分析的・客観的（断定しすぎない）
- 「〜を背景に」「〜リスクを踏まえ」「〜の観点から」などを使用
- 免責事項は含めない（UI側に表示済み）

#### allocationNote の口調
- 分析的・客観的（断定しすぎない）
- 「〜を背景に」「〜リスクを踏まえ」「〜の観点から」などを使用
- 免責事項は含めない（UI側に表示済み）

### Step 3: 週次ファイルを更新する

生成した frontmatter フィールドを週次レポートファイルに書き込む。
既存フィールドは上書き。存在しないフィールドは追加。
本文（--- 以降のMarkdown）は変更しない。

### Step 3.5: 予測履歴を更新する

`content/history/predictions.json` と `content/history/metrics.json` を更新する。

#### predictions.json の更新手順

1. ファイルを読み込む
2. 配列末尾のエントリ（前週分）の `outcome` が `null` の場合、今週の keyMetrics と前週の keyMetrics を比較して `outcome` を記入する：
   - `assessedDate`: 今週の週次レポートの `date`
   - `spxActualChange`: 今週のS&P 500の `change`（フィールドがあれば）
   - `spxDirection`: 今週と前週のS&P 500 numericValue を比較して `"up"` / `"down"` / `"neutral"` を判定（変化率 ±0.5% 未満は `"neutral"`）
   - `baseScenarioDirection`: 前週エントリの `baseScenario.direction`
   - `match`: `spxDirection === baseScenarioDirection` の場合 `true`
   - `note`: 実績の簡潔な説明（1〜2文。例：「S&P 500 -1.2%。調整が続きベースシナリオの下落方向と一致」）
3. 今週の予測エントリを末尾に追加する：
   - `weekSlug`: 今週の週次ファイル名（例：`"2026-W21"`）
   - `date`: 今週の `date`
   - `stance`: 新しい stance 値
   - `stanceLabel`: 新しい stanceLabel
   - `baseScenario`: base: true のシナリオの label・probability・direction
   - `scenarios`: 全3シナリオ（label・probability・direction・base）
   - `keyMetrics`: 今週の keyMetrics から label・value・numericValue（数値変換した値）を抽出
   - `outcome`: `null`
4. ファイルに書き戻す

#### numericValue の算出方法

| 指標 | 変換 |
|------|------|
| S&P 500, 日経225 等（カンマ区切り整数） | カンマを除去して数値変換 |
| 米10年債, 日本10年債 等（`%` 付き） | `%` を除去して数値変換 |
| WTI原油, 金 等（`¥` 付き整数・円建て） | `¥` とカンマを除去して数値変換 |

#### metrics.json の更新手順

1. ファイルを読み込む
2. 各 keyMetric の `label` をキーとして、今週の値を末尾に追加する：
   - `date`: 今週の `date`
   - `weekSlug`: 今週の週次ファイル名
   - `numericValue`: 上記変換式で算出
   - `displayValue`: frontmatter の `value` をそのまま使用
3. キーが存在しない場合は新規作成する
4. ファイルに書き戻す

### Step 4: git 操作

```
git status で変更ファイルを確認
git add content/reports/ content/history/   （レポート＋履歴ファイル。.claude/ や scripts/ は含めない）
```

コミット前にユーザーに以下を報告し、確認を取ること：
- 削除したファイル（あれば）
- 更新した週次ファイル名
- 生成した frontmatter フィールドの概要（stance・stanceLabel・quote・allocationNote・sectors・sectorsNote 等）
- 前週 outcome の評価結果（方向一致/不一致・note）

確認後：
```
git commit -m "レポート更新: [週次ファイル名] カレントビュー生成 + 日次レポート [日付]"
git push
```

## 注意事項
- `stancePrev` は必ず**旧 `stance` 値の退避**として設定する（新 stance を書き込む前に旧値を読み取ること）
- `keyMetrics` の `value` は単位込みの文字列。株式・債券・為替は従来どおり（例：`"4.63%"`、`"7,408"`）。**コモディティは円建て**（例：WTI → `"¥15,427"`、金 → `"¥715,680"`）
- allocation の合計が 100% になっていることを必ず確認する
- sectors の percent 合計が 100% になっていることを必ず確認する
- scenarios の probability 合計が 100 になっていることを必ず確認する
- quote は 30 文字以内。AI生成の場合は quoteAuthor を `"翡翠眼"` にする
- 本文 Markdown は一切変更しない
- Gemini 引用番号（ 1  6 等）が残っていたら削除する
- `## 引用文献` セクションが残っていたら削除する
