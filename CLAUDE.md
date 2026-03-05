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
1. Gemini でレポートを書く
2. `content/reports/{type}/YYYY-MM-DD.md` として保存
3. **Gemini引用番号（` 1`, ` 6` 等）を削除してから commit**（Python スクリプトで除去）
4. **`## 引用文献` セクションは掲載しない**（commit 前に削除する）
5. `git push` → Vercel 自動デプロイ → ページ公開

### ファイル構成
```
content/reports/monthly/YYYY-MM.md
content/reports/weekly/YYYY-WXX.md
content/reports/daily/YYYY-MM-DD.md
```

### レポート掲載ルール
- **各タイプ（monthly / weekly / daily）のレポートは常に1件のみ掲載**
- **表示制限：レポート一覧ページ（/reports）では、月次・週次・日次それぞれ最新1件のみ表示する**（`reports.slice(0, 1)` による制限。ReportsClient.tsx）
- 新しいレポートを追加する際は、同タイプの旧ファイルを削除してから commit する
- タイトル命名規則：
  - 日次：`YYYY年M月D日 日次レポート`
  - 週次：`YYYY年M月第N週 週次レポート`
  - 月次：`YYYY年M月 月次レポート`

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
---
```

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
- 表示要素：スタンス、市況概要、予測シナリオの3カラム ＋ 下部に参考資産配分モデル
- スタンスゲージには「中長期目線」の注記と「AI（翡翠眼）による参考値。投資助言ではありません。」を表示
- 予測シナリオのラベル：「予測シナリオ（翡翠眼 AI推定・参考値）」
- 参考資産配分モデル：3カラムの直下に横幅フルで表示。ラベル「参考資産配分モデル（翡翠眼 AI推定・参考値）」「投資助言ではありません」を両端に表示。SVGドーナツグラフ（132px）＋凡例（カラースウォッチ・ラベル・%）の横並び構成
- ドーナツグラフ：セグメント間に2度のギャップを設け、上端（12時方向）スタート。外径44%・内径27%（リング幅17%）
- 配色：`ALLOC_COLORS = ["#2d8c6e", "#74c4ad", "#c4963a", "#6b96b8", "#9bb5c8", "#b5b5b5"]`（翡翠グリーン・ライトジェイド・アンバー・スチールブルー・ライトブルー・グレー）
- モバイル時：ドーナツと凡例が縦積みに変換（`flexWrap: "wrap"`）
- stance/themes/scenarios が frontmatter にない場合は非表示
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
