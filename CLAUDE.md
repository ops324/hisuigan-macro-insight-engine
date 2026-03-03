# 翡翠眼 仕様書

## プロジェクト概要
マクロ市場情報サイト「翡翠眼」。Next.js (App Router) + Vercel構成。
サイト名：翡翠眼（ひすいがん）

## 確定仕様
- テーマ：ダーク/ライト切り替え（localStorage "theme" キーで全ページ共有・永続化）
- テーマ切替ボタン表示：`LIGHT` / `DARK`（絵文字なし）
- アクセント：翡翠グリーン #2d8c6e / #3aaf8a
- 角丸：全て直角
- 数値：monospaceフォント
- データは15〜20分遅延表示

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
- デフォルト：`"dark"`

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
1. Gemini でレポートを書く
2. `content/reports/{type}/YYYY-MM-DD.md` として保存
3. **Gemini引用番号（` 1`, ` 6` 等）を削除してから commit**（Python スクリプトで除去）
4. `git push` → Vercel 自動デプロイ → ページ公開

### ファイル構成
```
content/reports/monthly/YYYY-MM.md
content/reports/weekly/YYYY-WXX.md
content/reports/daily/YYYY-MM-DD.md
```

### フロントマター形式
```yaml
---
title: "タイトル"
date: "YYYY-MM-DD"
type: "monthly" | "weekly" | "daily"
description: "要約（省略可）。/reports の DAILY BRIEF セクションに表示される"
# 格言（省略可）
quote: "格言テキスト"
quoteAuthor: "著者名・出典"
# 週次レポートのCURRENT VIEW用（省略可）
stance: 68              # 0=リスクオン〜100=リスクオフ
stanceLabel: "守り重視"
themes:
  - "🔴 テーマ1"
  - "🟡 テーマ2"
  - "🟢 テーマ3"
scenarios:
  - label: "シナリオ名"
    probability: 55
    direction: "up" | "neutral" | "down"
    base: true          # ベースシナリオにのみ付与
---
```

### DAILY BRIEF パネル
- レポート一覧ページ（/reports）の CURRENT VIEW 直下に表示
- 最新の日次レポート（daily[0]）の `description` を使用
- 日付・本文・「詳細を読む →」リンクを表示
- `description` がない場合は非表示

### CURRENT VIEW パネル
- レポート一覧ページ（/reports）の最上部に表示
- 最新の週次レポート（weekly[0]）のフロントマターを使用
- 表示要素：スタンスゲージ、KEY THEMES、シナリオ確率バー
- スタンスゲージには「中長期目線」の注記を表示
- stance/themes/scenarios が frontmatter にない場合は非表示

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
  - H2は16pxインデント、H3は32pxインデントで階層表示
- Markdown レンダリング（react-markdown + remark-gfm）
- 免責事項ボックス（全レポート末尾に自動表示）
- ← REPORTS 一覧に戻るリンク

### ライブラリ
- `gray-matter` — frontmatter パース
- `react-markdown` + `remark-gfm` — Markdown → React レンダリング

### ユーティリティ（lib/reports.ts）
- `getAllReports()` — 全レポートのメタデータ（日付降順）
- `getReportsByType(type)` — タイプ別フィルタ
- `getReportBySlug(slug)` — フルデータ（本文＋全 frontmatter フィールド）

## デザイン定数
```js
const JADE = { main: "#2d8c6e", light: "#3aaf8a", dim: "#1e6b53" }
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
- Gemini レポートの引用番号（` 1`, ` 6` 等）は必ず commit 前に削除すること

# currentDate
Today's date is 2026-03-03.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
