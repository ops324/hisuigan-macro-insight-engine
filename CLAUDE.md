# 翡翠眼 仕様書

## プロジェクト概要
マクロ市場情報サイト「翡翠眼」。Next.js (App Router) + Vercel構成。
サイト名：翡翠眼（ひすいがん）

## 確定仕様
- 初回訪問時のデフォルト表示：数値画面（`/`）。株式指数・為替・債券・コモディティの市場データを表示する
- テーマ：ダーク/ライト切り替え（localStorage "theme" キーで全ページ共有・永続化）
- テーマ切替ボタン表示：`LIGHT` / `DARK`（絵文字なし）
- アクセント：翡翠グリーン #2d8c6e / #3aaf8a
- 角丸：全て直角
- 数値：monospaceフォント
- データは15〜20分遅延表示
- メインページナビの「レポート」タブ：カタカナ表記（`レポート`）
- レポートページのヘッダーブレッドクラム・h1タイトル：カタカナ表記（`レポート`）
- レポートページのタイトルセクション（格言バナーの直上）サブタイトル文言：「月次・週次・日次のマクロ市場分析レポート」のみ

## データソースと接続状況
| セクション | API | 状況 |
|-----------|-----|------|
| 為替 | ExchangeRate-API無料版 | 完了 |
| 株式指数 | Stooq（Alpha Vantageから移行） | 完了 |
| 米国債 | FRED API | 完了 |
| 日本国債 | 財務省CSV | 完了 |
| コモディティ | Stooq | 完了 |

## API仕様

### 為替（完了）
- エンドポイント：https://open.er-api.com/v6/latest/USD, /EUR
- 取得ペア：USD/JPY, EUR/JPY, EUR/USD, GBP/JPY
- 更新：ISR 60秒
- 前日比：取得不可（無料版）
- Route Handler：app/api/forex/route.js

### 株式指数（完了）
- API：Stooq（無料・キー不要）※Alpha Vantage から移行（2026-03-03）
- 移行理由：Alpha Vantage 無料版は25リクエスト/日の制限があり、テスト中に上限に達したため
- エンドポイント：https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv
- 取得銘柄：S&P500(^SPX), NASDAQ100(^NDX), DOW(^DJI), 日経225代替(EWJ.US)
- 更新：ISR 300秒（5分キャッシュ）
- Route Handler：app/api/stocks/route.js
- 備考：Stooq は日経225（^N225）非対応のため EWJ.US（iShares MSCI Japan ETF）で代替
- 備考：米国3指数は ETF プロキシから実指数データに変更（Alpha Vantage 移行時の制約が解消）
- 変動：Stooqから前日終値を取得できないため当日始値比（日中変動）で代用
- ALPHA_VANTAGE_API_KEY は .env.local に残存しているが現在未使用

### 米国債（完了）
- API：FRED API（無料・APIキー必要）
- 取得：2年・5年・10年・30年債利回り
- 更新：ISR 3600秒（1時間キャッシュ。FREDは営業日ベース更新のため）
- APIキー：.env.localに FRED_API_KEY として保存
- Route Handler：app/api/ustreasury/route.js
- Series ID：DGS2, DGS5, DGS10, DGS30
- 備考：観測値が "." (欠損) になる場合があるため直近10件取得し有効値2件を使用
- 前日比：直近有効値2件の差分で算出

### 日本国債（完了）
- API：財務省 国債金利情報CSV（無料・キー不要）
- 備考：日銀APIは機械読み取り形式が不安定なため財務省公開CSVを代替使用
- エンドポイント：https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv
- 取得：2年・5年・10年・30年債利回り
- 更新：ISR 3600秒（1時間キャッシュ）
- Route Handler：app/api/jptreasury/route.js
- エンコード：Shift-JIS → TextDecoder("shift-jis") で変換
- 備考：末尾に注記行が混入するため「R」（令和）で始まる行のみをフィルタ
- 前日比：直近2営業日データの差分で算出
- 備考：月初は前日データが1行のみのため前日比は N/A 扱い

### コモディティ（完了）
- API：Stooq（無料・キー不要）
- 備考：Yahoo Finance は2024年頃から認証必須化（401）のため Stooq を使用
- エンドポイント：https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv
- 取得銘柄：WTI原油(cl.f), 金(gc.f), 銀(si.f), 銅(hg.f)
- 更新：ISR 900秒（15分キャッシュ）
- Route Handler：app/api/commodities/route.js
- 変動：Stooqから前日終値を取得できないため当日始値比（日中変動）で代用
- 単位：銅は cents/lb で表示（CME建値準拠）

## テーマシステム

### lib/theme.ts
全ページ共通のダーク/ライトテーマ定数。レポートページで使用。

```ts
export const themeMap = { dark: {...}, light: {...} }
export type ThemeMode = keyof typeof themeMap;
export type Theme = typeof themeMap["dark"] | typeof themeMap["light"];
```

### テーマの持ち方
- `localStorage.getItem("theme")` / `localStorage.setItem("theme", next)` でページ間共有
- キー名：`"theme"`（全ページ統一）
- デフォルト：`"light"`

### メインページ（app/page.tsx）
- 独自 theme オブジェクト（lib/theme.ts とは別、色値が微妙に異なる）
- localStorage 対応済み

### レポートページ（app/reports/）
- lib/theme.ts の themeMap を使用

## レポート機能

### 概要
Gemini で執筆したレポートを Markdown ファイルとして commit することで公開する仕組み。
DB 不要、Vercel 自動デプロイで反映。

### ワークフロー

#### 自動（月次・週次・日次）
- **月次**：毎月1日 6:00 に launchd が自動実行（Claude が前月の振り返り＋当月の展望をリサーチ → 発行月ベースで作成 → `/push-reports` → git push）
- **週次**：毎週月曜 7:00 に launchd が自動実行（Claude が先週のリサーチ → 作成 → `/push-reports` → git push）
- **日次**：毎朝 8:00 に launchd が自動実行（Claude がリサーチ → 作成 → `/push-reports` → git push）
- 手動での依頼も引き続き可能

#### `/push-reports` による公開フロー
1. 同タイプの旧レポートファイルを `git rm` で削除（1タイプ1件ルール）
2. 月次・週次・日次を統合してカレントビュー frontmatter を自動生成
3. Gemini 引用番号・引用文献セクションを自動削除
4. `git add content/reports/` → `git commit` → `git push`
5. Vercel 自動デプロイ → ページ公開

### `/push-reports` スラッシュコマンド（.claude/commands/push-reports.md）
**APIキー不要。Claude Code セッション内で完結する。**

実行すると Claude Code が自動で：
1. 最新の月次・週次・日次レポートを読み込む
2. 3本を統合分析して週次 frontmatter を生成・上書き

| 生成フィールド | 内容 |
|--------------|------|
| `stance` / `stanceLabel` | 中長期リスクオフ度（0〜100）とラベル |
| `marketOverview` | 月次中長期観・週次テーマ・日次動向を統合した市況概要 |
| `themes` | 注目テーマリスト（絵文字＋テキスト 3〜5件） |
| `scenarios` | 予測シナリオ 3件（確率合計100%） |
| `allocation` | 資産配分比率（合計100%） |
| `allocationNote` | 「なぜこの配分か」2〜3文 |
| `sectors` | 注目セクター 4〜6 件（注目度合計100%） |
| `sectorsNote` | 「なぜこのセクターに注目するか」2〜3文 |
| `quote` / `quoteAuthor` | 今週の格言と著者 |

3. コミット内容を報告し、ユーザー確認後に `git commit` → `git push`

### scripts/gen-allocation-note.mjs（オプション・非推奨）
Claude Code を使わず CLI 単体で `allocationNote` のみ生成したい場合の代替手段。
`ANTHROPIC_API_KEY`（`.env.local`）が必要。通常は `/push-reports` を使うこと。

### レポート自動化（macOS launchd）
MacBook 起動中に launchd が自動実行。

| レポート | スケジュール | スクリプト | launchd | 祝日チェック |
|---------|------------|----------|---------|------------|
| 月次 | 毎月1日 6:00 | `auto-monthly-report.sh` | `com.hisuigan.monthly-report` | なし（必ず実行） |
| 週次 | 毎週月曜 7:00 | `auto-weekly-report.sh` | `com.hisuigan.weekly-report` | あり |
| 日次 | 毎朝 8:00（月〜金） | `auto-daily-report.sh` | `com.hisuigan.daily-report` | あり |

#### 動作条件
- MacBook が起動中であること（スリープ中は起動後に実行、電源オフは当日スキップ）
- 日次・週次：日本株式市場の開場日のみ（祝日・年末年始はスキップ）
- 月次：祝日チェックなし（毎月1日に必ず実行）

#### 実行フロー（月次）
```
launchd（毎月1日 6:00 AM）
  └→ auto-monthly-report.sh（祝日チェックなし・必ず実行）
       └→ claude --dangerously-skip-permissions -p "先月の月次レポートを..."
            └→ Web リサーチ → レポート作成 → /push-reports → git push（確認なし）
```

#### 実行フロー（週次）
```
launchd（月曜 7:00 AM）
  └→ auto-weekly-report.sh
       └→ check-market-day.py（開場日チェック）
            ├─ 祝日月曜 → スキップ（ログに記録）
            └─ 開場日 → claude --dangerously-skip-permissions -p "先週の週次レポートを..."
                         └→ Web リサーチ → レポート作成 → /push-reports → git push（確認なし）
```

#### 実行フロー（日次）
```
launchd（8:00 AM）
  └→ auto-daily-report.sh
       └→ check-market-day.py（開場日チェック）
            ├─ 休場日 → スキップ（ログに記録）
            └─ 開場日 → claude --dangerously-skip-permissions -p "本日の日次レポートを..."
                         └→ Web リサーチ → レポート作成 → git push（確認なし）
```

#### 自動化ファイル構成
```
~/.claude/scripts/check-market-day.py                     # 開場日チェック（jpholiday 使用）
~/.claude/scripts/auto-monthly-report.sh                  # 月次メイン実行スクリプト
~/.claude/scripts/auto-weekly-report.sh                   # 週次メイン実行スクリプト
~/.claude/scripts/auto-daily-report.sh                    # 日次メイン実行スクリプト
~/Library/LaunchAgents/com.hisuigan.monthly-report.plist  # 月次 launchd スケジュール設定
~/Library/LaunchAgents/com.hisuigan.weekly-report.plist   # 週次 launchd スケジュール設定
~/Library/LaunchAgents/com.hisuigan.daily-report.plist    # 日次 launchd スケジュール設定
~/Library/Logs/hisuigan/monthly-report-YYYY-MM-DD.log     # 月次実行ログ（90日分保持）
~/Library/Logs/hisuigan/weekly-report-YYYY-MM-DD.log      # 週次実行ログ（30日分保持）
~/Library/Logs/hisuigan/daily-report-YYYY-MM-DD.log       # 日次実行ログ（30日分保持）
```

#### 依存パッケージ
- `jpholiday`（Python）：インストール済み（`pip3 install --user jpholiday`）
- `claude` CLI：`/Users/takimototetsuya/.local/bin/claude`（インストール済み）

#### 運用コマンド
```bash
# ── 月次 ──
cat ~/Library/Logs/hisuigan/monthly-report-$(date +%Y-%m-%d).log
launchctl start com.hisuigan.monthly-report
launchctl unload ~/Library/LaunchAgents/com.hisuigan.monthly-report.plist
launchctl load ~/Library/LaunchAgents/com.hisuigan.monthly-report.plist

# ── 週次 ──
cat ~/Library/Logs/hisuigan/weekly-report-$(date +%Y-%m-%d).log
launchctl start com.hisuigan.weekly-report
launchctl unload ~/Library/LaunchAgents/com.hisuigan.weekly-report.plist
launchctl load ~/Library/LaunchAgents/com.hisuigan.weekly-report.plist

# ── 日次 ──
cat ~/Library/Logs/hisuigan/daily-report-$(date +%Y-%m-%d).log
launchctl start com.hisuigan.daily-report
launchctl unload ~/Library/LaunchAgents/com.hisuigan.daily-report.plist
launchctl load ~/Library/LaunchAgents/com.hisuigan.daily-report.plist
```

### ファイル構成
```
content/reports/monthly/YYYY-MM.md      # 発行月ベース（4月1日発行 → 2026-04.md）
content/reports/weekly/YYYY-WXX.md
content/reports/daily/YYYY-MM-DD.md
.claude/commands/push-reports.md     # /push-reports スラッシュコマンド定義
scripts/gen-allocation-note.mjs      # allocationNote 生成スクリプト（オプション・非推奨）
```

### レポート掲載ルール
- **各タイプ（monthly / weekly / daily）のレポートは常に1件のみ掲載**
- **表示制限：レポート一覧ページ（/reports）では、月次・週次・日次それぞれ最新1件のみ表示する**（`reports.slice(0, 1)` による制限。ReportsClient.tsx）
- 新しいレポートを追加する際は、同タイプの旧ファイルを `git rm` で削除してから commit する（`/push-reports` が自動実行）
- タイトル命名規則：
  - 日次：`YYYY年M月D日 日次レポート`
  - 週次：`YYYY年M月第N週 週次レポート`
  - 月次：`YYYY年M月 月次レポート`（**発行月ベース**。4月1日発行 → 「2026年4月 月次レポート」。内容は前月の振り返り＋当月の展望）
- 月次レポートのファイル名：発行月ベース（4月1日発行 → `2026-04.md`）

### フロントマター形式
```yaml
---
title: "タイトル"
date: "YYYY-MM-DD"
type: "monthly" | "weekly" | "daily"
description: "要約（省略可）。/reports の DAILY BRIEF セクションに表示される"
# ⚠ 手動記述不要。/push-reports スラッシュコマンドが Claude Code セッション内で自動生成・上書きする
# quote: "格言テキスト"
# quoteAuthor: "著者名・出典"
# 週次レポートのCURRENT VIEW用（省略可）
stance: 68              # 0=リスクオン〜100=リスクオフ
stanceLabel: "守り重視"
marketOverview: "市況の概要テキスト（省略可）。市況概要パネルのテーマ一覧上部に表示"
themes:
  - "🔴 テーマ1"
  - "🟡 テーマ2"
  - "🟢 テーマ3"
scenarios:
  - label: "シナリオ名"
    probability: 55
    direction: "up" | "neutral" | "down"
    base: true          # ベースシナリオにのみ付与
# 参考資産配分モデル（省略可）。合計100%になるように設定
allocation:
  - label: "日本株"
    percent: 15
  - label: "海外株（先進国）"
    percent: 10
# ⚠ 手動記述不要。/push-reports スラッシュコマンドが Claude Code セッション内で自動生成・上書きする
# allocationNote: "（自動生成）"
# 注目セクター（省略可）。注目度の重み付け。合計100%になるように設定
sectors:
  - label: "半導体"
    percent: 25
  - label: "エネルギー"
    percent: 20
# ⚠ 手動記述不要。/push-reports スラッシュコマンドが Claude Code セッション内で自動生成・上書きする
# sectorsNote: "（自動生成）"
---
```

### 日次レポート本文仕様

#### H1: タイトル
`# 📊 DAILY MACRO BRIEF — YYYY年M月D日`

#### 免責事項（blockquote）
レポート冒頭に1回のみ記載。各市場セクション内には記載しない。
```
> ⚠️ 本レポートはAIによる情報提供目的のマクロ分析です。投資助言・売買推奨ではありません。投資判断はご自身の責任で行ってください。
```

#### セクション構成（上から順）

1. **スコープサマリー**（H2）
   - 短期（1〜4週）/ 中期（3〜12ヶ月）【メイン】/ 長期（1〜5年）の3段構成
   - 箇条書き。中期に【メイン】を付与

2. **本日のマクロ結論**（H2）
   - 当日の最重要イベントと市場への影響を総括するテキスト

3. **各市場の環境分析（変化あり市場のみ）**（H2）
   - 変化のあった市場のみ掲載（全市場を毎日書く必要はない）
   - 各市場は H3 で区切る（詳細は後述「各市場セクションの構成」参照）

4. **注目指標・トリガー**（H2）
   - テーブル形式：トリガー条件 / 現在の評価 / 達成確率 / 発動時に一般的に起こりやすいこと

5. **本日の注目イベント**（H2）
   - テーブル形式：時刻（JST）/ 国 / 指標・イベント / 注目理由

6. **今週の注目スケジュール**（H2）
   - テーブル形式：日付 / 国 / 指標・イベント / 注目理由

7. **情報ソース**（末尾）
   - イタリック体で参照ソースと取得日を列挙

#### 各市場セクションの構成（H3）

見出し形式：`### 絵文字 市場名`
例：`### 🇺🇸 米国株式市場`、`### 💴 為替市場（USD/JPY）`、`### 🛢️ コモディティ（原油・金）`

各セクション内の構成：

1. **ベースシナリオ行**
   `**◉ ベースシナリオ（確率 XX% ★評価）**`
   - 確率：ベースシナリオの実現確率
   - ★評価：確信度（★1〜5。☆で残りを埋める。例：★★★☆☆）

2. **根拠行**（ベースシナリオ行から改行して記載）
   `根拠：S0（ソース名）+ S2（ソース名）+ ...`
   - 情報ソースコードを `+` で連結（ソースコード一覧は後述）

3. **分析テキスト**
   - 現在の市場状況、背景、ポジション動向等を記述

4. **シナリオテーブル**
   | シナリオ | 確率 | 内容 |
   - 📈 上振れ / 📉 下振れ / ⚡ テールリスク
   - 全シナリオの確率合計は100%（ベースシナリオ含む）

5. **注目されやすい動き**
   「この環境で一般的に注目されやすい動き：」で始まるまとめ段落

#### 情報ソースコード

| コード | カテゴリ | 例 |
|--------|----------|-----|
| S0 | 市場データ・メディア | Bloomberg, Reuters, 日経, CoinMarketCap |
| S1 | 中央銀行 | FRB, 日本銀行 |
| S2 | 経済指標 | 米BLS NFP, GDP, 家計調査, 春闘 |
| S4 | ポジション | CFTC COT |
| S5 | テクニカル・価格 | CME, TradingView |
| S7 | センチメント | CNN Fear & Greed, Crypto Fear & Greed Index |

### 格言バナー（Quote Banner）
- 表示ページ：レポート一覧ページ（`/reports`）のみ
- **メインページ（`/`）・詳細レポートページ（`/reports/[slug]`）には表示しない**（詳細ページには別途エピグラフとして表示）
- ソース：最新の週次レポート（weekly[0]）の `quote` / `quoteAuthor` frontmatter
- 表示位置：レポート一覧（`/reports`）のページタイトルセクション直下、CURRENT VIEW の上
- デザイン：翡翠グリーンの縦ボーダー、斜体テキスト、著者名付き
- `quote` がない場合は非表示
- `quoteAuthor` は省略可。AI（翡翠眼）が生成した格言の場合は `quoteAuthor: "翡翠眼"` とする

### DAILY BRIEF パネル
- レポート一覧ページ（/reports）の CURRENT VIEW 直下に表示
- 最新の日次レポート（daily[0]）の `description` を使用
- 日付・本文・「詳細を読む →」リンクを表示
- `description` がない場合は非表示

### CURRENT VIEW パネル
- レポート一覧ページ（/reports）の最上部に表示
- **位置付け：月次・週次・日次レポートから統合的に作られる中長期視点の概況パネル**
- **市況概要・スタンス・シナリオ予測・資産配分はいずれも中長期視点での内容**
- データソース：最新の週次レポート（weekly[0]）のフロントマターを使用（月次・週次・日次を踏まえて執筆者が統合的に記述）
- 表示要素：スタンス、市況概要、予測シナリオの3カラム ＋ 下部に参考資産配分モデル ＋ 注目セクター
- スタンスゲージには「中長期目線」の注記と「AI（翡翠眼）による参考値。投資助言ではありません。」を表示
- 予測シナリオのラベル：「予測シナリオ（翡翠眼 AI推定・参考値）」
- 参考資産配分モデル：3カラムの直下に横幅フルで表示。ラベル「参考資産配分モデル（翡翠眼 AI推定・参考値）」「投資助言ではありません」を両端に表示。SVGドーナツグラフ（132px）＋凡例（カラースウォッチ・ラベル・%）の横並び構成
- 解説文（allocationNote）：frontmatterの `allocationNote` フィールドから取得。**`/push-reports` スラッシュコマンドが月次・週次・日次レポートを統合して Claude Code セッション内で自動生成し書き込む**（手動記述不要・APIキー不要）。「なぜこの配分か」2〜3文。ラベル行の直下・グラフの上に翡翠グリーンの左ボーダー（`2px solid ${JADE}44`・paddingLeft 10px）付きで表示。フォントサイズ11px・`t.textMuted`色・行間1.8。`allocationNote` がない場合は非表示
- `quote`/`quoteAuthor` も **`/push-reports` が自動生成**（手動記述不要）。今週の市場環境に示唆を与える格言・名言（30文字以内）と著者名を生成。AI生成の場合は `quoteAuthor: "翡翠眼"` とする
- ドーナツグラフ：セグメント間に3度のギャップを設け、上端（12時方向）スタート。外径44%・内径34%（リング幅10%、細身でミニマル）
- ベースリング：セグメント背後に `t.border` 色の薄いガイドリングを描画
- センター装飾：翡翠グリーンの二重極小ドット（r=5 opacity=0.14 + r=2 opacity=0.42）
- グロー：SVG全体に `drop-shadow(0 2px 10px rgba(45,140,110,0.22))` で翡翠色の光彩
- 配色：`ALLOC_COLORS = ["#2d8c6e", "#c4963a", "#6b96b8", "#a87db5", "#74c4ad", "#a0a0a0"]`（翡翠・琥珀/金・鋼青・菫/紫水晶・浅翡翠・銀）
- 凡例マーカー：円形ドット（7px・`borderRadius: "50%"`）＋色に合わせた淡いグロー（`boxShadow`）
- モバイル時：ドーナツと凡例が縦積みに変換（`flexWrap: "wrap"`）
- stance/themes/scenarios が frontmatter にない場合は非表示
- 注目セクター：資産配分モデルの直下に表示。ラベル「注目セクター（翡翠眼 AI推定・参考値）」「投資助言ではありません」を両端に表示。AllocationDonut コンポーネントを SECTOR_COLORS パレットで再利用（132px SVGドーナツグラフ＋凡例）
- 解説文（sectorsNote）：frontmatter の `sectorsNote` フィールドから取得。`/push-reports` が自動生成。ラベル行の直下・グラフの上に翡翠グリーンの左ボーダー付きで表示
- sectors がない場合は注目セクターのみ非表示
- allocation がない場合は配分モデルのみ非表示
- ラベル表示テキスト：`カレントビュー`（カタカナ。英語 "CURRENT VIEW" は使用しない）
- ヘッダーサブタイトル：「月次・週次・日次統合 · 中長期視点」をカレントビューラベルの右に表示
- モバイル時：ヘッダー行は縦積み、レポートタイトル・区切り文字は非表示

### ページ構成
| ページ | ファイル | 役割 |
|--------|---------|------|
| `/reports` | `app/reports/page.tsx` | サーバーコンポーネント（データ取得のみ） |
| `/reports` | `app/reports/ReportsClient.tsx` | クライアントコンポーネント（テーマ・描画） |
| `/reports/[slug]` | `app/reports/[slug]/page.tsx` | サーバーコンポーネント（データ取得のみ） |
| `/reports/[slug]` | `app/reports/[slug]/ReportClient.tsx` | クライアントコンポーネント（テーマ・描画） |
| 共通 | `app/reports/ReportCard.tsx` | レポート一覧カード（t: Theme を受け取る） |

### 個別レポートページの機能
- 格言エピグラフ（frontmatter の `quote`/`quoteAuthor` が存在する場合のみ表示）
  - 目次の直前、翡翠グリーンの左ボーダー付きで上品に表示
- 目次（frontmatter 後の H1/H2/H3 を自動抽出、クリックでジャンプ）
  - 各見出し（H1/H2/H3）に `id={slugify(text)}` を付与し、目次の `<a href="#id">` でアンカーリンク
  - H2は16pxインデント、H3は32pxインデントで階層表示
  - モバイル時：H2は8px、H3は16pxに縮小。長い見出しは省略表示（text-overflow: ellipsis）
- Markdown レンダリング（react-markdown + remark-gfm）
- 免責事項ボックス（全レポート末尾に自動表示）
- ← レポート一覧に戻るリンク

### ライブラリ
- `gray-matter` — frontmatter パース
- `react-markdown` + `remark-gfm` — Markdown → React レンダリング

### ユーティリティ（lib/reports.ts）
- `getAllReports()` — 全レポートのメタデータ（日付降順）
- `getReportsByType(type)` — タイプ別フィルタ
- `getReportBySlug(slug)` — フルデータ（本文＋全 frontmatter フィールド）

## モバイル対応
- ブレークポイント：`max-width: 768px`
- CSSクラス命名規則：`hg-*`（globals.css に `!important` で定義）
- Turbopack の CSS キャッシュ問題：globals.css 変更後は `.next` を削除してサーバー再起動が必要な場合あり

### モバイル対応クラス一覧
| クラス | 対象 | 効果 |
|--------|------|------|
| `.hg-nav-sections` | メインページ セクションナビタブ | 非表示 |
| `.hg-status-text` | ステータスバー長文テキスト | 非表示 |
| `.hg-grid-4` | 4カラムグリッド（株式・為替・コモディティ） | 2カラムに変換 |
| `.hg-grid-2` | 2カラムグリッド（債券） | 1カラムに変換 |
| `.hg-cv-grid` | カレントビュー3カラムグリッド | 1カラムに変換 |
| `.hg-cv-header` | カレントビューヘッダー行 | 縦積みに変換 |
| `.hg-cv-header-sub` | カレントビューのレポートタイトル・区切り | 非表示 |
| `.hg-footer-row` | フッター横並び | 縦積みに変換 |
| `.hg-card-row` | レポートカードのタイトル/日付行 | 縦積みに変換 |
| `.hg-toc-h2` | 目次H2アイテム | paddingLeft: 8px |
| `.hg-toc-h3` | 目次H3アイテム | paddingLeft: 16px |
| `.hg-toc-link` | 目次リンク | 省略表示（ellipsis） |
| `.hg-data-note` | 為替「前日比データなし」テキスト | 省略表示（ellipsis） |

## デザイン定数
```js
const JADE = { main: "#2d8c6e", light: "#3aaf8a", dim: "#1e6b53" }
const ALLOC_COLORS = ["#2d8c6e", "#c4963a", "#6b96b8", "#a87db5", "#74c4ad", "#a0a0a0"]
// 翡翠・琥珀/金・鋼青・菫/紫水晶・浅翡翠・銀
const SECTOR_COLORS = ["#3a7bd5", "#d4a843", "#5ba88c", "#c75b5b", "#8b6baf", "#a0a0a0"]
// 群青・黄金・翠・朱・藤紫・銀
```

## メタデータ（app/layout.tsx）
```ts
title: "翡翠眼 | マクロ市場分析"
description: "為替・株式指数・米国債・日本国債・コモディティのリアルタイムデータと..."
lang: "ja"
```

## 注意事項
- APIキーは必ず.env.localに保存
- .env.localは.gitignoreに含まれていることを確認
- チャットにAPIキーを貼らない
- Gemini レポートの引用番号（` 1`, ` 6` 等）は必ず commit 前に削除すること（`/push-reports` が自動削除）
- カレントビュー frontmatter の生成は `/push-reports` スラッシュコマンドで行う（APIキー不要・Claude Code セッション内で完結）
- `git add` の対象は `content/reports/` のみ（`.claude/` や `scripts/` は通常含めない）
- コミットメッセージ形式：`レポート更新: [週次ファイル名] + カレントビュー生成`
- `npm run gen-note`（`scripts/gen-allocation-note.mjs`）は Claude Code を使わない場合のオプション手段（非推奨）

# currentDate
Today's date is 2026-03-03.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
