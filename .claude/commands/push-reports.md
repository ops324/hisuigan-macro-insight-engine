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

### Step 1.7: 学習シグナルを読んで自己補正する（フィードバックループ）

Step 2 でスタンス・シナリオを生成する**前に**、機械可読の学習シグナルを読んで**決定論的に**分岐する。
散文でエントリを目視するのではなく、`content/history/learning-signal.json` のフィールドで判断する
（この成果物は Step 3.5.3 で `predictions.json`/`metrics.json` から自動生成される定量集計）。

1. `content/history/learning-signal.json` を読み込む（**欠損/破損時のみ**、従来どおり `predictions.json` の
   直近評価済みを目視する簡易レビューへ 1 回だけフォールバックし、push はブロックしない）
2. 以下のフィールドで分岐する（数値で判断・目視補正しない）：
   - `maturity.sixMonthWindowsMatured === false` → **結果ベースで stance を動かさない**。長期評価は蓄積待ち。
   - `stance.discipline.collapsedFlag === true` → stance が「滑らか過ぎて無反応（事実上の定数）」の警告。
     真のレジームシフトに反応できているか点検し、必要なら**動かす方向**へ見直す（滑らかさの追い過ぎを是正）。
   - `stance.flags` に `INSUFFICIENT_SAMPLE` → 構造的理由以外で stance を動かさない（サンプル不足）。
   - `directionBias` は **`DESCRIPTIVE_ONLY`（記述専用）**。多重検定のため**方向補正の根拠にしない**（参考のみ）。
   - `scenarioCalibration.horizon === "short"` → 確率は動かさない（Brier/reliability は品質モニタのみ）。
   - `recommendations.stanceDelta`（既に縮約済み）を、もし調整するなら**その絶対値を上限**として扱う。
     現状は `0`・`overallConfidence: "low"` のため、実質「結果ベースの補正はしない」。
3. 補正を適用した場合は `stanceRationale` に成果物を引用して 1 文添える
   （例：「learning-signal.json 上、系統的な方向バイアスは認められないため方向補正は行わない」）。
4. 補正を適用した場合は **Step 3.5 で当該予測レコードに `adjustments` を記録**する（監査用・下記）。

#### 位置付け（必須）
- **本プロダクトの主目的は長期（6M+）の予測精度**。日次±1%S&P採点は near-random の短期サニティ層であり
  長期スキルの指標ではない。補正は**遅い構造変数の変化**（バリュエーション・政策サイクル・信用スプレッド等）に
  基づいて行い、日次イベントだけでは動かさない。学習シグナルは**助言**であり、最終判断は執筆者が行う。
- 学習シグナルは既に小標本で縮約済み。**その `stanceDelta` を超える補正はしない**。直近 1〜2 件の外れに
  引きずられない（リーセンシーバイアス回避）。

### Step 2: カレントビュー frontmatter を統合生成する

3本のレポートの内容・スタンス・テーマを総合的に分析し、
週次レポートの frontmatter に以下のフィールドを生成・上書きする。

#### 生成ルール

| フィールド | 生成ルール |
|-----------|-----------|
| `stancePrev` | **stance を上書きする前**に、週次ファイルに記載されている現在の `stance` 値をこのフィールドへ退避する（前回値の保存）。週次ファイルに `stance` が未記載の場合は `stancePrev` も省略する |
| `stance` | 中長期リスクオフ度を 0〜100 の整数で設定（0=完全リスクオン、100=完全リスクオフ）。**これは長期(6M+)ゲージ**。週次の変化は原則 ±5pt 以内に収め、それを超えるのは政策転換・バリュエーション極値・景気後退入り等の**文書化されたレジーム/構造シフト**がある時だけ。月次の長期水準を一次アンカーとし、週次・日次はその範囲を微修正するのみ（上書きしない）。日次イベントだけで stance を動かさない |
| `stanceLabel` | stance に対応するラベル（例：「積極的」「中立」「守り重視」「完全守備」） |
| `stanceRationale` | なぜこの stance 値になったかを 2〜3 文で。**遅い構造変数を最低3つ引用**して正当化する（バリュエーション/株式リスクプレミアム・金融政策サイクル/実質金利・業績トレンド・信用スプレッド・イールドカーブ・長期トレンド等）。日次イベントだけを根拠にしない。数字の根拠を残すための必須フィールド |
| `longTermViews` | **全マクロ資産の長期(6M+)方向の見立て**。資産別に `{asset, bias, rationale}` の配列。対象：S&P 500・日経225・米10年債・日本10年債・USD/JPY・WTI原油・金。`bias` は `up`/`neutral`/`down`。`rationale` には**その資産固有の構造ドライバーを最低2つ引用**（株＝バリュエーション/業績/政策、債券＝政策金利パス/インフレ/ターム・プレミアム/需給、為替＝日米金利差/実質金利差/当局介入、コモディティ＝需給/在庫/地政学・実質金利/ドル/中銀買い）。日次イベントだけで方向を動かさない（長期ゲージ）。track-record の資産別6M採点に使われる |
| `structuralInputs` | stance/見立ての根拠となった構造変数の**数値スナップショット**。学習の特徴量になるため、可能な限り**数値**で記録する（取れないものは省略可）。キーと単位：`valuation_erp`（S&P500 の株式リスクプレミアム %）・`real_rate_10y`（米10年実質金利 %）・`credit_spread_hy`（米ハイイールドOAS %）・`curve_2s10s`（米2s10s 傾き pt）・`policy_rate`（FF 上限 %）・`earnings_rev`（S&P500 EPS 改定率 % など）。値は数値（`{ "valuation_erp": 1.8, "real_rate_10y": 2.1, "curve_2s10s": 0.35 }`）。自由文の所見は別キー `structuralNotes`（文字列）に退避してよい。**この数値は特徴量行列（lib/features.ts）へ供給され、6M ラベル成熟後の regime 条件付き評価に使う**。今から数値で蓄積しないと成熟時に特徴量が空になる |
| `marketOverview` | 市況概要を 2〜3 文で。月次の中長期観・週次の相場テーマ・日次の直近動向を統合した内容 |
| `regime` | 現在のマクロ局面を 4 フィールドで。`cycle`（景気局面：拡大／減速／後退 等）・`inflation`（インフレ局面：加速／高止まり／鈍化 等）・`policy`（金融政策局面：引き締め／据え置き／緩和 等）・`summary`（総括 1〜2 文）。各局面ラベルは 12 文字以内を目安に簡潔に |
| `keyMetrics` | 主要指標スナップショットを 4〜6 件。各項目は `label`（指標名）・`value`（値。単位込みの文字列）・`change`（前回比。任意）・`direction`（`up`/`down`/`flat`。任意）。`change` は確かな数値が取れる場合のみ付与し、不明なら省略する。**コモディティ（WTI原油・金・銀・銅等）の `value` は必ず日本円（¥）で記載すること**。USD 建て価格に最新の USD/JPY レートを乗算して整数円に丸め `¥XX,XXX` 形式で記載する（例：WTI $97・USD/JPY 159 → `"¥15,423"`）。株式指数・債券利回り・為替は従来どおりの単位。**為替の長期採点のため `USD/JPY` を keyMetrics に必ず含める**（`value` は `"159.20"` 等の数値文字列・`numericValue` はその数値）。これにより metrics.json に USD/JPY 系列が蓄積され資産別6M採点が可能になる |
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
   - `spxDirection`: 今週と前週のS&P 500 numericValue を比較して `"up"` / `"down"` / `"neutral"` を判定（**変化率 ±1.0% 未満は `"neutral"`**。±1.0% 以上の上昇は `"up"`、±1.0% 以上の下落は `"down"`）
     - **判定基準 ±1.0% は 2026-05-24 に確定。以後は遡及変更しない**（過去の評価済みエントリを後から再採点しない）。万一基準を見直す場合は、全履歴を新基準で再採点し、変更履歴を track-record ページ等で開示すること
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
   - **`longTermViews`: frontmatter の `longTermViews` を【そのままコピー】**（資産別6M採点の唯一の入力。これが無いと長期評価は永久に空になる。必須）
   - **`structuralInputs`: frontmatter の `structuralInputs`（数値）を【そのままコピー】**（特徴量へ供給）
   - **`adjustments`: Step 1.7 で学習シグナルに基づく補正を適用した場合のみ** `{ "stanceDelta": <適用した増減>, "basis": ["採用したフラグ・根拠"] }` を記録（補正なしなら省略）。ループが精度を上げているか下げているかを後から監査するため
   - `outcome`: `null`
4. ファイルに書き戻す

#### numericValue の算出方法

| 指標 | 変換 |
|------|------|
| S&P 500, 日経225 等（カンマ区切り整数） | カンマを除去して数値変換 |
| 米10年債, 日本10年債 等（`%` 付き） | `%` を除去して数値変換 |
| WTI原油, 金 等（円建て整数・記号なし） | カンマを除去して数値変換 |

#### metrics.json の更新手順

1. ファイルを読み込む
2. 各 keyMetric の `label` をキーとして、今週の値を末尾に追加する：
   - `date`: 今週の `date`
   - `weekSlug`: 今週の週次ファイル名
   - `numericValue`: 上記変換式で算出
   - `displayValue`: frontmatter の `value` をそのまま使用
3. キーが存在しない場合は新規作成する
4. ファイルに書き戻す

### Step 3.5.3: 学習シグナルを再生成する

`predictions.json` と `metrics.json` を**書き戻した後**に、学習シグナル成果物を再生成する
（順序厳守：先にデータ更新 → 後で集計。逆だと成果物が 1 週遅れる）。

```
npm run gen:learning -- --date=YYYY-MM-DD   （YYYY-MM-DD は今週の date）
```

- これは `content/history/learning-signal.json` を決定論的に生成する（Claude が手計算しない）。
- スクリプトは**書込み前に `predictions.json` の形状と成果物スキーマを検証**し、失敗すれば**書かずに非0終了**する
  （CI は PR 限定で bot の main 直 push は無検証のため、この生成器が最後の砦）。エラーが出たら push を中止し、
  `predictions.json` の該当エントリを修正してから再実行する。
- 既存の**評価済み `outcome` は再採点しない**（±1.0% 基準 2026-05-24 確定・遡及変更なし。成果物は `outcome` を
  記録通り読むのみ）。

### Step 4: git 操作

```
git status で変更ファイルを確認
git add content/reports/ content/history/   （レポート＋履歴＋learning-signal.json。.claude/ や scripts/ は含めない）
```
- `content/history/` には `predictions.json`・`metrics.json`・**`learning-signal.json`** が含まれる（3 つとも staging）。

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
- `keyMetrics` の `value` は単位込みの文字列。株式・債券・為替は従来どおり（例：`"4.63%"`、`"7,408"`）。**コモディティは円換算の数字のみ・記号なし**（例：WTI → `"15,427"`、金 → `"715,680"`）
- allocation の合計が 100% になっていることを必ず確認する
- sectors の percent 合計が 100% になっていることを必ず確認する
- scenarios の probability 合計が 100 になっていることを必ず確認する
- quote は 30 文字以内。AI生成の場合は quoteAuthor を `"翡翠眼"` にする
- 本文 Markdown は一切変更しない
- Gemini 引用番号（ 1  6 等）が残っていたら削除する
- `## 引用文献` セクションが残っていたら削除する
