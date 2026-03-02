# MACRO MARKETS 仕様書

## プロジェクト概要
マクロ市場情報サイト。Next.js (App Router) + Tailwind + Vercel構成。

## 確定仕様
- テーマ：ダーク/ライト切り替え
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

### コモディティ（完了）
- API：Stooq（無料・キー不要）
- 備考：Yahoo Finance は2024年頃から認証必須化（401）のため Stooq を使用
- エンドポイント：https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv
- 取得銘柄：WTI原油(cl.f), 金(gc.f), 銀(si.f), 銅(hg.f)
- 更新：ISR 900秒（15分キャッシュ）
- Route Handler：app/api/commodities/route.js
- 変動：Stooqから前日終値を取得できないため当日始値比（日中変動）で代用
- 単位：銅は cents/lb で表示（CME建値準拠）

## レポート機能

### 概要
Gemini で執筆したレポートを Markdown ファイルとして commit することで公開する仕組み。
DB 不要、Vercel 自動デプロイで反映。

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
description: "要約（省略可）"
---
```

### ページ
- `/reports` — 一覧（月次/週次/日次セクション）
- `/reports/[slug]` — 個別レポート（Server Component, generateStaticParams）

### ライブラリ
- `gray-matter` — frontmatter パース
- `react-markdown` + `remark-gfm` — Markdown → React レンダリング

### ユーティリティ
- `lib/reports.ts` — `getAllReports()`, `getReportBySlug()`, `getReportsByType()`

## デザイン定数
```js
const JADE = { main: "#2d8c6e", light: "#3aaf8a", dim: "#1e6b53" }
```

## 注意事項
- APIキーは必ず.env.localに保存
- .env.localは.gitignoreに含まれていることを確認
- チャットにAPIキーを貼らない
