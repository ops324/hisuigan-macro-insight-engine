# 翡翠眼 仕様書

## プロジェクト概要
マクロ市場情報サイト「翡翠眼」。Next.js (App Router) + Vercel構成。
サイト名：翡翠眼（ひすいがん）

## 開発ワークフロー（手動・非自動）
変更の経路を「自動（レポート）」と「手動（機能・デザイン）」で分ける。

### 自動（レポート）— main 直 push（変更なし）
- launchd（月次・週次・日次）と `/push-reports` は従来どおり `content/` を `main` へ直接 commit & push する。PR は使わない。
- CI（後述）は **PR 限定トリガー**のため、bot の main 直 push では発火しない（無駄な実行・外部 API 呼び出しを避けるための意図的設計）。

### 手動（機能・デザイン・リファクタ）— ブランチ＋PR
- `app/`・`lib/`・`globals.css` 等のコード/デザイン変更は必ず作業ブランチを切り、PR 経由で `main` へマージする。
- ブランチ命名：`feat/*`（機能）・`fix/*`（修正）・`design/*`（デザイン）・`chore/*`（雑務）
- 流れ：ブランチ作成 → 変更 → push → `gh pr create` → CI（lint / test / build）green ＆ Vercel Preview 確認 → squash merge → ブランチ削除
- レポート（`content/`）と手動開発（`app/`・`lib/`）は触るパスが重ならないため、PR ブランチ生存中も bot の main 直 push と競合しない（マージ前に main を取り込めば良い）。

### CI（`.github/workflows/ci.yml`）
- トリガー：`pull_request`（base `main`）**のみ**。`push: main` では発火させない。
- ジョブ（並列・Node 20・`npm ci`）：`lint`（`npm run lint -- --max-warnings 0`・警告ゼロを強制）/ `type-check`（`npm run type-check`＝`tsc --noEmit`）/ `test`（`npm run test`）/ `build`（`npm run build`・シークレット不要）。
- ESLint：`@next/next/no-page-custom-font` は `eslint.config.mjs` で off（App Router では `layout.tsx` の `<head>` フォント読込が正で、このルールは Pages Router 前提の誤検知）。
- PR テンプレート：`.github/pull_request_template.md`。

### main 保護について
- **ブランチ保護は掛けていない（規約ベース）**。理由：bot が同一アカウント（ops324）で main 直 push しており、「PR 必須」保護を厳格化すると bot の push までブロックされるため。手動作業の PR 運用は規約で守る。
- 将来強制したくなった場合の選択肢：① 管理者バイパス付き保護、② bot 用に GitHub App / 別トークンを分離して bot だけ保護をバイパス。

### Vercel Preview
- Git 連携済みのため、PR/ブランチ push ごとに Preview デプロイが自動生成される（設定ファイル不要）。Preview URL で本番反映前に表示確認する。

## 確定仕様
- 初回訪問時のデフォルト表示：レポートページ。`/` にアクセスすると `/reports` にリダイレクト（`next.config.ts` の `redirects()`・307）
- 市場数値画面（株式指数・為替・債券・コモディティ）は `/market`（`app/market/page.tsx`）。レポートページヘッダー右側の「マーケット」リンクからアクセス
- テーマ：ダーク/ライト切り替え（localStorage "theme" キーで全ページ共有・永続化）
- テーマ切替ボタン表示：`LIGHT` / `DARK`（絵文字なし）
- アクセント：彩度を落とした翡翠グリーン（ライト `#2f6f55` / ダーク `#6aa589`）。色源は `lib/theme.ts` の `t.positive` に一本化（旧ネオン翡翠 #2d8c6e / #3aaf8a・モジュールレベルの `JADE` 定数は撤廃済み）
- デザイン基調：**金融エディトリアル**（FT・Monocle・日経の紙面感）。暖かい紙＋墨＋減彩翡翠。グロー（放射背景・box-shadow 光彩・drop-shadow）は全廃
- 角丸：全て直角
- 数値：monospaceフォント
- データは15〜20分遅延表示
- 市場数値ページ（`/market`）ナビの「レポート」タブ：カタカナ表記（`レポート`）
- `/reports` ヘッダー：ブレッドクラムなし（ロゴ「翡翠眼」のみ。右側に「マーケット」リンクとテーマトグル）。「マーケット」リンクは `color: t.positive`（減彩翡翠・ダーク `#6aa589`・ライト `#2f6f55`）でリンクであることを視覚的に明示
- `/reports/[slug]`・`/reports/track-record` のヘッダーブレッドクラム・`/reports` の h1 タイトル：カタカナ表記（`レポート`）
- レポートページのタイトルセクション（格言バナーの直上）サブタイトル文言：「月次・週次・日次のマクロ市場分析レポート」のみ

## データソースと接続状況
| セクション | API | 状況 |
|-----------|-----|------|
| 為替 | ExchangeRate-API無料版 | 完了 |
| 株式指数 | Stooq（Alpha Vantageから移行） | 完了 |
| 米国債 | FRED API | 完了 |
| 日本国債 | 財務省CSV | 完了 |
| コモディティ | Stooq | 完了 |

## データ取得アーキテクチャ（lib/market-data.ts）
- **取得/パースの実体は `lib/market-data.ts` に集約**。各 Route Handler（`app/api/*/route.js`）と市場ページ Server Component（`app/market/page.tsx`）の両方がこの lib を呼ぶ薄いラッパ
- 取得関数：`getStocks()` / `getForex()` / `getUsTreasury()` / `getJpTreasury()` / `getCommodities()`。各々**内部で `Promise.allSettled`** を使い、1銘柄が失敗しても取れた銘柄だけ返す（全滅を回避）。失敗銘柄は null 値で返り UI は「---」表示
- キャッシュは `fetch(url, { next: { revalidate: N } })`（為替60・株式300・コモディティ900・米国債/日本国債3600秒）
- 純粋関数（`lib/__tests__/market-data.test.ts` でテスト）：`parseStooqCsv` / `commodityJpyValues` / `pickLatestTwoValidFred` / `parseJgbCsv`
- 表示加工の純粋関数は `lib/metrics.ts`（`changeDisplay` / `metricGroup` / `directionColor` / `directionLabel`。`lib/__tests__/metrics.test.ts` でテスト）。方向の共通型 `Direction`（`up`/`down`/`neutral`）も **`lib/metrics.ts` に集約**（`lib/history.ts` は再エクスポート・`lib/reports.ts` の `ScenarioItem.direction` も参照）。`KeyMetricItem.direction` は frontmatter 語彙の `flat` を含むため別型 `MetricDirection`（`up`/`down`/`flat`）で統合しない
- 日付表示など UI 純粋関数は `lib/format.ts`（`formatDate`＝`YYYY-MM-DD → YYYY年M月D日`。`lib/__tests__/format.test.ts` でテスト。`ReportCard` / `[slug]/ReportClient` が共用）

## テスト（Vitest）
- `npm run test`（`vitest run`）。設定は `vitest.config.ts`（node 環境・`@` エイリアス）。テストは `lib/__tests__/*.test.ts`
- 対象は純粋関数と `lib/reports.ts`（CSV パース・通貨換算・FRED 欠損スキップ・JGB 行抽出・指標表示加工・日付整形・レポート読込）
- `lib/reports.ts` のテスト（`reports.test.ts`）は **フィクスチャ方式**（`lib/__tests__/fixtures/reports/` の .md）。`getAllReports` / `getReportBySlug` / `getReportsByType` / `getAllSlugs` は第2引数 `baseDir`（既定 `content/reports`）でテスト用ディレクトリを注入できる。実 content は bot が毎日書き換えるため内容非依存の不変条件のみ検証

## SEO
- `lib/site.ts`：`SITE_URL`（`NEXT_PUBLIC_SITE_URL` → Vercel 本番URL → localhost の順でフォールバック）と `SITE_NAME`
- `app/layout.tsx`：`metadataBase` ＋ 既定 OpenGraph ＋ Twitter Card（`summary_large_image`。`og:image`/`twitter:image` は `opengraph-image.tsx` から自動注入されるため手書きしない）
- `app/opengraph-image.tsx`：OG 画像（`ImageResponse`・1200×630・ダーク地＋翡翠バー＋明朝「翡翠眼」）。ビルド時に静的生成。日本語グリフは Google Fonts CSS API の `text=` パラメータで Shippori Mincho を必要分だけサブセット fetch。**fetch は try/catch で囲みシステムフォントにフォールバック**（外部依存でビルドを落とさない）
- `app/reports/[slug]/page.tsx`：`generateMetadata`（per-report の title・description・OG・canonical・`article` type）
- `app/sitemap.ts`：`/reports`・`/market`・`/reports/track-record` ＋ 全レポート slug を出力（`/sitemap.xml`）。静的ルートの `lastModified` は**最新レポート日付**（`getAllReports()[0].date`・「常に今日」を避けクロール効率を維持）。日付欠損・不正時のみ `new Date()` フォールバック
- `app/robots.ts`：全許可 ＋ sitemap 参照（`/robots.txt`）

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
- ALPHA_VANTAGE_API_KEY は廃止済み（.env.local からも削除済み。必要な環境変数は .env.example 参照）

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
- 価格表示：日本円（JPY）換算。USD/JPY レートを ExchangeRate-API からリアルタイム取得して乗算
- 単位：WTI原油=円/bbl、金・銀=円/oz、銅=円/lb（銅は cents/lb → USD/lb → JPY/lb 変換）
- 表示形式：¥プレフィックス付き整数円（小数なし）

## テーマシステム

### lib/theme.ts
全ページ共通のダーク/ライトテーマ定数。**全ページ（レポート系・市場数値ページ）の唯一のテーマソース**。

金融エディトリアル・パレット（暖かい紙＋墨＋減彩翡翠＋オックスブラッド）。キー名・`as const` 構造は不変。

```ts
export const themeMap = {
  dark: { // 暖かい墨（ネオン排除）
    bg: "#15140f", surface: "#1c1b15", surfaceAlt: "#24221b",
    border: "#302d24", borderStrong: "#403c30",
    text: "#ece7da", textSub: "#a39c8c", textMuted: "#807969",
    headerBg: "#15140f", positive: "#6aa589", negative: "#cf6f60",
  },
  light: { // 紙面（エディトリアルの主役）
    bg: "#f4f1ea", surface: "#fbfaf6", surfaceAlt: "#ece7db",
    border: "#e0d9ca", borderStrong: "#cabfa8",
    text: "#1b1a16", textSub: "#57534a", textMuted: "#8c8576",
    headerBg: "#fbfaf6", positive: "#2f6f55", negative: "#a23c30",
  },
}
export type ThemeMode = keyof typeof themeMap;
export type Theme = typeof themeMap["dark"] | typeof themeMap["light"];
```

### テーマの持ち方（lib/useTheme.ts）
- **全クライアントコンポーネントは `useTheme()` フック（`lib/useTheme.ts`）を使用**。`const { mode, t, toggleTheme } = useTheme();` の1行で完結
- 実装：`useSyncExternalStore` で `localStorage` を購読。`getServerSnapshot` が `"light"` を返し SSR/ハイドレーション時のミスマッチを回避、マウント後に保存値へ切り替わる
- `toggleTheme` は `localStorage.setItem("theme", next)` ＋ `window.dispatchEvent(new Event("hg-theme-change"))` で同一タブ内の全 `useTheme` を再レンダリング。別タブからの変更は `storage` イベントで反映
- キー名：`"theme"`（全ページ統一）／デフォルト：`"light"`
- **旧実装の `useState`＋`useEffect`＋手書き `localStorage` パターンは撤廃済み**（4ファイルの重複を解消。`react-hooks/set-state-in-effect` 対策）

### 市場数値ページ（app/market/page.tsx・`/market`）
- **`lib/theme.ts` の themeMap を使用（独自 theme は撤廃済み）**。罫線・配色は themeMap 値に統一
- フッター DATA SOURCES：`["Stooq", "ExchangeRate-API", "FRED API (Federal Reserve)", "財務省 (MOF)"]`（現行 API と一致させること。Yahoo Finance・日本銀行 API は廃止済み）
- 債券テーブル（`TreasuryTable`）は **semantic な `<table>`／`<thead>`／`<th scope="col">`／`<tbody>`／`<tr class="hg-treasury-row">`／`<td>`**（スクリーンリーダー対応・WCAG 1.3.1）。`th` はブラウザ既定が bold/center のため `fontWeight:400`・`textAlign` を inline で明示して見た目を維持する（div グリッドへ戻さない）

### レポートページ（app/reports/）
- lib/theme.ts の themeMap を使用

### アクセシビリティ（WCAG 2.1 AA 方針）
- 数値テーブルは semantic `<table>`（上記 `TreasuryTable`）。div グリッドで擬似テーブルを作らない
- 純粋な図表（`Sparkline` の SVG・`AllocationDonut` のバー）は `role="img"` ＋ 内訳を要約した `aria-label`（Sparkline は `<title>` も併記）
- テーマトグルボタンは全ページ（`MarketClient` / `ReportsClient` / `TrackRecordClient` / `[slug]/ReportClient`）で `aria-label` ＋ `aria-pressed={mode === "dark"}` を付与

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
| `stance` / `stanceLabel` | 中長期リスクオフ度（0〜100）とラベル。**長期(6M+)ゲージ**＝週次変化は原則 ±5pt 以内、月次の長期水準を一次アンカーとし日次イベントで乱高下させない（[長期予測精度](#長期6m予測精度の方針) 参照） |
| `stancePrev` | 旧 `stance` 値の退避（前回比表示用。stance 上書き前に保存） |
| `stanceRationale` | なぜこの stance 値か。**遅い構造変数を最低3つ引用**（バリュエーション/ERP・政策サイクル/実質金利・業績・信用スプレッド・カーブ・長期トレンド）。日次イベントだけを根拠にしない |
| `longTermViews` | **全資産の長期(6M+)方向**。資産別 `{asset, bias(up/neutral/down), rationale}`（S&P 500・日経225・米10年債・日本10年債・USD/JPY・WTI原油・金）。rationale はその資産固有の構造ドライバーを最低2つ引用。track-record の資産別6M採点に使用 |
| `structuralInputs` | （任意）stance/見立ての根拠となった構造変数スナップショット（valuation/policy/earnings/credit/curve/trend） |
| `marketOverview` | 月次中長期観・週次テーマ・日次動向を統合した市況概要 |
| `regime` | 現在のマクロ局面（景気 cycle・インフレ inflation・金融政策 policy・総括 summary） |
| `keyMetrics` | 主要指標スナップショット 4〜6 件（label・value・change・direction）。**為替の長期採点のため `USD/JPY` を必ず含める**（metrics.json に系列蓄積） |
| シナリオ `rationale` | 各予測シナリオの確率・判断の根拠（1〜2 文） |
| `themes` | 注目テーマリスト（絵文字＋テキスト 3〜5件。絵文字は表示時に無発光スウォッチへ変換されるが frontmatter には従来どおり絵文字を記述する） |
| `scenarios` | 予測シナリオ 3件（確率合計100%） |
| `allocation` | 資産配分比率（合計100%） |
| `allocationNote` | 「なぜこの配分か」2〜3文 |
| `sectors` | 注目セクター 4〜6 件（注目度合計100%） |
| `sectorsNote` | 「なぜこのセクターに注目するか」2〜3文 |
| `quote` / `quoteAuthor` | 今週の格言と著者 |

3. コミット内容を報告し、ユーザー確認後に `git commit` → `git push`

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
content/history/predictions.json        # 予測精度ログ（永続蓄積・1-file-rule 対象外）
content/history/metrics.json            # 指標時系列ログ（永続蓄積・1-file-rule 対象外）
.claude/commands/push-reports.md     # /push-reports スラッシュコマンド定義
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
stancePrev: 65          # ⚠ 手動記述不要。/push-reports が旧 stance 値を退避。前回比表示用
stanceLabel: "守り重視"
stanceRationale: "なぜこの stance 値か（省略可）。⚠ 手動記述不要。/push-reports が自動生成。構造変数を最低3つ引用"
# 全資産の長期(6M+)方向（省略可）。⚠ 手動記述不要。/push-reports・月次生成が自動生成。track-record の資産別6M採点に使用
longTermViews:
  - asset: "S&P 500"
    bias: "neutral"        # up | neutral | down（6M+の方向）
    rationale: "その資産固有の構造ドライバーを最低2つ引用（株＝バリュエーション/業績/政策 等）"
  - asset: "USD/JPY"
    bias: "up"
    rationale: "日米金利差・実質金利差・当局介入 等"
  # 同様に 日経225・米10年債・日本10年債・WTI原油・金 を列挙
marketOverview: "市況の概要テキスト（省略可）。市況概要パネルのテーマ一覧上部に表示"
# 現在のレジーム（省略可）。⚠ 手動記述不要。/push-reports が自動生成
regime:
  cycle: "景気減速"          # 景気局面
  inflation: "インフレ再加速"  # インフレ局面
  policy: "引き締め長期化"    # 金融政策局面
  summary: "局面の総括（1〜2文）"
# 主要指標スナップショット（省略可）。⚠ 手動記述不要。/push-reports が自動生成
keyMetrics:
  - label: "米10年債"
    value: "4.63%"        # 単位込みの文字列。コモディティは円換算の数字のみ（例：WTI → "15,427"）
    change: "+0.05"       # 前回比（任意。確かな数値が取れる場合のみ）
    direction: "up"       # up | down | flat（任意）
themes:                  # 先頭の信号絵文字は表示時に無発光スウォッチへ変換（🔴=朱・🟡=琥珀・🟢=翡翠など）。frontmatter は絵文字記述のままでよい
  - "🔴 テーマ1"
  - "🟡 テーマ2"
  - "🟢 テーマ3"
scenarios:
  - label: "シナリオ名"
    probability: 55
    direction: "up" | "neutral" | "down"
    base: true          # ベースシナリオにのみ付与
    rationale: "その確率・判断の根拠（1〜2文）。⚠ 手動記述不要。/push-reports が自動生成"
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
- **市場数値ページ（`/market`）・詳細レポートページ（`/reports/[slug]`）には表示しない**（詳細ページには別途エピグラフとして表示）
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
- 表示要素：ヘッダー直下に主要指標ストリップ ＋ 現在のレジームパネル ＋ スタンス、市況概要、予測シナリオの3カラム ＋ 下部に参考資産配分モデル ＋ 注目セクター
- 主要指標ストリップ（keyMetrics）：ヘッダーと3カラムグリッドの間に表示。デザイン方向は「精密ティッカー」。ラベル「主要指標」（JADE）を左、右に**期間ラベル＋as-of日付**「前週比 · YYYY-MM-DD 時点」（textMuted）を配置。各セル（上から）＝① **資産クラスeyebrow**（9px・JADE・uppercase・グループ先頭セルのみ表示。容器は `height:13` ＋ `lineHeight:"13px"`・span も `lineHeight:"13px"`／`display:inline-block`／`verticalAlign:top` で高さを固定。**祖先から継承する `line-height:24px` を打ち消し、テキスト有無でセル中身の縦位置がズレる「ジグザグ」を防ぐ**。旧 `minHeight:13` だけの予約では eyebrow 表示セルの行ボックスが 24px に膨らみ非表示セル 13px との間で 11px ズレてジグザグ化していた）／② 指標名（11px・textMuted・`flex:1 minWidth:0` で ellipsis）＋スパークライン（右端・`flexShrink:0`・2点以上で表示）／③ 値（18px・monospace・bold）／④ **デルタ角チップ**（任意・`minHeight:21` で高さ予約）。チップは方向色の地（`${dc}1a`）＋方向色文字＋▲/▼/—、直角（角丸なし）。`keyMetrics` がない場合は非表示
- 資産クラス推定（`metricGroup(label)`）：ラベルから 金利（債/金利/利回り/イールド）→ コモディティ（原油/WTI/ブレント/天然ガス/金/銀/銅/プラチナ）→ 為替（/・円・ドル等）→ 株式（S&P/NASDAQ/ダウ/日経/TOPIX/株/指数）→ その他 の順で判定（コモディティの「金」と金利を衝突させないため金利を先に判定）。連続する同一グループの先頭セルにのみ eyebrow を表示。グループ未保有データでも安全に動作（型変更不要・generator 非依存）
- 変化単位整理（`changeDisplay(value, change)`）：値が `%` で終わる利回り系で change が裸の符号付き数値（%・$・pt・bp なし）のとき `pt` を補う（例：米10年債 `-0.04` → `-0.04pt`）。それ以外は change を verbatim 表示
- セルホバー（`.hg-metric-cell` / globals.css）：減彩翡翠インナーボーダー（`inset 0 0 0 1px rgba(63,115,90,0.40)`・z-index:5）＋ツールチップ（`.hg-metric-tip`）出現。ツールチップ＝セル下に絶対配置（右半分のセルは `right:0`、左半分は `left:0` でビューポート見切れ回避）、影は浅め（`0 4px 14px rgba(0,0,0,0.12)`）。内容＝指標名＋最新精密値（`metrics.json` 最新点 `displayValue（date）`、無ければ `value（as-of 時点）`）＋直近N週レンジ「直近N週: lo 〜 hi」。テーマ連動色は inline・出現アニメは CSS クラスで制御。**Turbopack の CSS キャッシュ問題に注意**：globals.css にクラス追加後は `.next` 削除＋サーバー再起動でないと新ルールが読み込まれない場合あり
- スパークライン（`Sparkline` コンポーネント）：各指標セル下部にセル全幅のインライン SVG（既定 高さ40px・`viewBox` 論理幅200・`preserveAspectRatio="none"`）。`metrics.json` の当該指標を直近12〜16件描画。2点未満は非表示。**フラット仕様＝1本の細い折れ線（strokeWidth 1.25・round cap/join）＋終点の単一ドット（r2）のみ**（旧 7層装飾＝面塗りグラデ・グリッド線・最大最小マーカー・3重終点円は全廃）。trend 色＝直近2点比較で上昇＝`color`（＝`t.positive` 減彩翡翠）・下落＝`downColor`（＝`t.negative`）。座標は `Math.round` で決定的（SSR/CSR 一致）
- 現在のレジームパネル（regime）：主要指標ストリップと3カラムグリッドの間に表示。ラベル「現在のレジーム」（JADE）の下に景気局面・インフレ局面・金融政策局面の3セル（各セル＝局面ラベル11px＋局面名15px・bold）。直下に総括（summary）を翡翠グリーンの左ボーダー付きで表示。`regime` がない場合は非表示
- スタンスゲージには「中長期目線」の注記と「AI（翡翠眼）による参考値。投資助言ではありません。」を表示
- スタンスゲージ：墨の細トラック（`t.border`）＋ 現在値までを `t.textSub` 単色で塗る（旧 翡翠→赤グラデは廃止）。現在値は実線ドット（`t.text`）、前回値は中空リング（ゴーストマーカー・`t.textMuted` ボーダー）で描画
- スタンス前回比（stancePrev）：RISK-ON/OFF行の下に「前回比 ↑+4 前回 68」を表示。デルタ配色は増加（リスクオフ寄り）=減彩琥珀 `#b08a4a`・減少=`t.positive`・横ばい=`t.textMuted`。`stancePrev` がない場合は非表示
- スタンス判断根拠（stanceRationale）：スタンス欄の前回比行と免責注記の間に「判断根拠」ラベル＋本文を翡翠グリーンの左ボーダー付きで表示。`stanceRationale` がない場合は非表示
- シナリオ判断根拠（scenario.rationale）：各予測シナリオの確率バー直下に根拠テキスト（11px・textMuted）を表示。各シナリオの `rationale` がない場合はその行のみ非表示
- 予測シナリオのラベル：「予測シナリオ（AI推定・参考値）」（翡翠眼を省略した短縮形）
- 参考資産配分モデル：3カラムの直下に横幅フルで表示。ラベル「参考資産配分モデル（AI推定・参考値）」「投資助言ではありません」を両端に表示（`white-space: nowrap`）。**水平100%積み上げバー（高さ10px・角丸無し・グロー無し・トーナル配色）＋ 序列付き凡例リスト**（無発光の小矩形スウォッチ・ラベル・% の縦並び）の構成
- 解説文（allocationNote）：frontmatterの `allocationNote` フィールドから取得。**`/push-reports` スラッシュコマンドが月次・週次・日次レポートを統合して Claude Code セッション内で自動生成し書き込む**（手動記述不要・APIキー不要）。「なぜこの配分か」2〜3文。ラベル行の直下・グラフの上に減彩翡翠の左ボーダー（`2px solid ${t.positive}66`・paddingLeft 12px）付きで表示。フォントサイズ12px・`t.textSub`色・行間1.85。`allocationNote` がない場合は非表示
- `quote`/`quoteAuthor` も **`/push-reports` が自動生成**（手動記述不要）。今週の市場環境に示唆を与える格言・名言（30文字以内）と著者名を生成。AI生成の場合は `quoteAuthor: "翡翠眼"` とする
- 比率チャート（`AllocationDonut` コンポーネント・名称は踏襲だが**実体は水平積み上げバー**）：① 上部に高さ10px の100%積み上げバー（`t.border` 枠・セグメント間は `t.surface` 1px 区切り・角丸無し・グロー無し）／② 下部に序列付き凡例（各行＝10px 無発光矩形スウォッチ＋ラベル13px `t.text`＋% 13px `t.textSub` monospace、行間は `borderBottom: 1px solid t.border`・`padding: 8px 0`）。drop-shadow・三重グロー円・白インナーリム・凡例ドットのハロー（`boxShadow`）は全廃
- 配色（トーナル・序列あり）：`ALLOC_COLORS = ["#2f6f55", "#7d9a6f", "#b9a35f", "#c0894d", "#9a8579", "#bcb4a4"]`（翡翠起点の土系トーナル）
- **SSR Hydration**：バー幅は百分率のみ（`Math.cos`/`Math.sin` 不使用）のため決定論的。旧ドーナツの `mounted` プレースホルダー回避ロジックは不要・撤去済み
- stance/themes/scenarios が frontmatter にない場合は非表示
- 注目セクター：資産配分モデルの直下に表示。ラベル「注目セクター（AI推定・参考値）」「投資助言ではありません」を両端に表示（`white-space: nowrap`）。`AllocationDonut`（積み上げバー）を `SECTOR_COLORS` パレットで再利用
- 解説文（sectorsNote）：frontmatter の `sectorsNote` フィールドから取得。`/push-reports` が自動生成。ラベル行の直下・グラフの上に翡翠グリーンの左ボーダー付きで表示（allocationNote と同スタイル）
- sectors がない場合は注目セクターのみ非表示
- allocation がない場合は配分モデルのみ非表示
- ラベル表示テキスト：`カレントビュー`（カタカナ。英語 "CURRENT VIEW" は使用しない）
- ヘッダーサブタイトル：「月次・週次・日次統合 · 中長期視点」をカレントビューラベルの右に表示
- モバイル時：ヘッダー行は縦積み、レポートタイトル・区切り文字は非表示

### ページ構成
| ページ | ファイル | 役割 |
|--------|---------|------|
| `/`（→`/reports`） | `next.config.ts` | `redirects()` で `/reports` へ 307 リダイレクト |
| `/market` | `app/market/page.tsx` | サーバーコンポーネント（`lib/market-data.ts` で並列データ取得・SSR） |
| `/market` | `app/market/MarketClient.tsx` | クライアントコンポーネント（テーマ・描画） |
| `/reports` | `app/reports/page.tsx` | サーバーコンポーネント（データ取得のみ） |
| `/reports` | `app/reports/ReportsClient.tsx` | クライアントコンポーネント（ヘッダ・格言・一覧レイアウト。カレントビュー等は子コンポーネントに委譲） |
| `/reports/[slug]` | `app/reports/[slug]/page.tsx` | サーバーコンポーネント（データ取得のみ） |
| `/reports/[slug]` | `app/reports/[slug]/ReportClient.tsx` | クライアントコンポーネント（テーマ・描画） |
| `/reports/track-record` | `app/reports/track-record/page.tsx` | サーバーコンポーネント（predictions.json 読込） |
| `/reports/track-record` | `app/reports/track-record/TrackRecordClient.tsx` | クライアントコンポーネント（予測ログ描画） |
| 共通 | `app/reports/ReportCard.tsx` | レポート一覧カード（t: Theme を受け取る。ホバーは `.hg-report-card` の CSS のみ） |
| 共通 | `app/reports/CurrentView.tsx` | カレントビュー本体（スタンス・市況・シナリオ・配分・セクター。`ReportsClient` から分離） |
| 共通 | `app/reports/KeyMetrics.tsx` | 主要指標ストリップ（`Sparkline` を利用） |
| 共通 | `app/reports/RegimePanel.tsx` | 現在のレジームパネル |
| 共通 | `app/reports/Sparkline.tsx` | スパークライン SVG（`SPARK_VW`） |
| 共通 | `app/reports/AllocationDonut.tsx` | 水平積み上げバー（`ALLOC_COLORS` / `SECTOR_COLORS` を export） |

> **注**：カレントビュー系（`AllocationDonut` / `Sparkline` / `KeyMetrics` / `RegimePanel` / `CurrentView`）は元々 `ReportsClient.tsx` 内の非 export 関数だったが、保守性のため個別ファイルへ分離済み（named export・props の `t` は `lib/theme.ts` の `Theme` 型）。JSX・スタイルは分離時に不変。

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
- `getAllReports(baseDir?)` — 全レポートのメタデータ（日付降順）
- `getReportsByType(type, baseDir?)` — タイプ別フィルタ
- `getReportBySlug(slug, baseDir?)` — フルデータ（本文＋全 frontmatter フィールド）
- `getAllSlugs(baseDir?)` — 全 slug 一覧
- frontmatter → `ReportMeta` のマッピングは private `toReportMeta()` に一本化（`getAllReports` / `getReportBySlug` で共用）。`baseDir` は既定 `content/reports`・テスト用の注入点

### ユーティリティ（lib/history.ts）
- `getPredictions()` — `content/history/predictions.json` の全 PredictionRecord を取得
- `getMetricsHistory()` — `content/history/metrics.json` の MetricsHistory を取得
- `getSparklinePoints(label)` — 指定指標の直近12件の MetricPoint を取得（スパークライン用）

### 予測精度ログ（/reports/track-record）
- ベースシナリオ予測と実績を事実並置で表示
- 評価方式：ベースシナリオの direction（up / down / neutral）と翌週S&P 500週次変動の方向が一致したか
  - 変化率 ±1.0% 未満は neutral 扱い（日次〜数日規模の値動きにおける「実質フラット」の定義。±0.5%では狭すぎて neutral 予想がほぼ的中にならない構造的問題があったため 2026-05-24 に拡大）
  - **判定基準 ±1.0% は 2026-05-24 に確定。以後は固定・遡及変更しない**（評価済みエントリを後から再採点しない）。万一見直す場合は全履歴を新基準で再採点し変更履歴を開示する
  - 「方向一致」タグ（JADE）/ 「方向不一致」タグ（赤）/ 「PENDING」タグ（評価前）
- サマリーバー：評価済み件数・方向一致数・不一致数・一致率（resolved が1件以上の場合に表示）
- 注記：確率や値幅の精度は評価対象外。AI参考記録である旨を明示
- フィードバックループ：予測ログは `/push-reports`（Step 1.7）で次回のスタンス・シナリオ生成にレビューされ、**系統的バイアスのみ**を補正する（直近1〜2件の結果への過剰反応＝リーセンシーバイアスは明示的に回避。評価済み5件未満では大きな補正をしない）

### 長期（6M+）予測精度の方針
**本プロダクトの主目的は長期（6M+）の予測精度**。track-record は二層構成：
- **長期検証（全資産・6M+）＝主指標**：stance と資産別 `longTermViews` の方向を、各資産の **6M 前方リターン**で採点（`lib/track-record.ts`）。資産別の中立バンドは 株 ±1.0%・利回り ±0.15pt・為替 ±0.5%・コモディティ ±1.5%。6M ホライズンは独立観測が年に数個しか得られず**有意な IC には年単位の蓄積**を要するため、本評価は約2026-11以降に点灯。それまでの即時指標は **stance 滑らかさ**（長期ゲージが日次で乱高下していないか）。暫定の短窓 IC は**重複窓・有効N僅少の参考値**で過信しない（`sampleNonOverlapping` で独立化・有効N併記）。
- **予測記録（参考）**：週次ベースシナリオと翌週S&P方向（locked ±1%）の**事実並置のみ**。短期方向は near-random で評価対象外のため、**的中率・素朴比などの集計は表示しない**（ノイズ・誤読回避。`shortTermSummary` は lib に残置するが UI 非表示）。判定基準 ±1.0% は 2026-05-24 確定・遡及変更なし。
- 採点インフラ純粋関数は `lib/track-record.ts`（`forwardReturn`/`sampleNonOverlapping`/`assetLongViewScore`/`informationCoefficient`/`bucketedForwardReturns`/`stanceSmoothness`/`shortTermSummary`・`lib/__tests__/history.test.ts` でテスト）。fs 非依存でクライアントからも利用。型は `lib/history.ts`。
- **生成規律**：stance/見立ては**月次レポートを長期の一次アンカー**とし、週次・日次はバンド内微修正のみ。stance 週次変化は原則 ±5pt 以内（超えるのは文書化されたレジーム/構造シフト時）。根拠は遅い構造変数（バリュエーション・政策・信用・カーブ等）に置き、日次イベントだけで動かさない。

### スパークライン（KeyMetrics コンポーネント内）
- 各指標セル下部にセル全幅のインライン SVG（既定 高さ40px・`viewBox` 論理幅200・`preserveAspectRatio="none"`）
- `metrics.json` の当該指標データを直近12〜16件読み込んで折れ線を描画
- 2点以上ある場合のみ表示（1点以下は非表示）
- **フラット仕様：1本の細い折れ線（strokeWidth 1.25・round cap/join）＋ 終点の単一ドット（r2）のみ**。旧装飾（面塗りグラデ・グリッド線・最大最小中空マーカー・終点3重円）は全廃
- 直近2点の比較で上昇＝`color`（`t.positive` 減彩翡翠）・下落＝`downColor`（`t.negative`）でライン・終点ドットを色分け。座標は `Math.round` で決定的（SSR/CSR 一致）
- 方向ラベル（`directionLabel`）は ▲（up）/ ▼（down）/ —（flat）。デルタチップで使用。方向色（`directionColor`）も減彩トーン（up `#4e8d6f`・down `#c25f52`・flat `#8c8576`）
- スパークライン用データは `/push-reports` の Step 3.5 で毎週自動蓄積

### content/history/ 運用ルール
- `predictions.json`・`metrics.json` は **1-file-rule 対象外**（削除せず永続蓄積）
- `/push-reports` の Step 3.5 で自動更新（前週 outcome 記入 → 今週予測追記）
- `git add content/history/` を `content/reports/` と同時に staging する

## モバイル対応
- ブレークポイント：`max-width: 768px`
- CSSクラス命名規則：`hg-*`（globals.css に `!important` で定義）
- Turbopack の CSS キャッシュ問題：globals.css 変更後は `.next` を削除してサーバー再起動が必要な場合あり

### モバイル対応クラス一覧
| クラス | 対象 | 効果 |
|--------|------|------|
| `.hg-nav-sections` | 市場数値ページ セクションナビタブ | 非表示 |
| `.hg-status-text` | ステータスバー長文テキスト | 非表示 |
| `.hg-grid-4` | 4カラムグリッド（株式・為替・コモディティ） | 2カラムに変換 |
| `.hg-grid-2` | 2カラムグリッド（債券） | 1カラムに変換 |
| `.hg-cv-grid` | カレントビュー3カラムグリッド | 1カラムに変換 |
| `.hg-cv-metrics` | カレントビュー主要指標ストリップ | 2カラムに変換 |
| `.hg-cv-regime` | カレントビューレジームパネル | 1カラムに変換 |
| `.hg-cv-header` | カレントビューヘッダー行 | 縦積みに変換 |
| `.hg-cv-header-sub` | カレントビューのレポートタイトル・区切り | 非表示 |
| `.hg-footer-row` | フッター横並び | 縦積みに変換 |
| `.hg-card-row` | レポートカードのタイトル/日付行 | 縦積みに変換 |
| `.hg-toc-h2` | 目次H2アイテム | paddingLeft: 8px |
| `.hg-toc-h3` | 目次H3アイテム | paddingLeft: 16px |
| `.hg-toc-link` | 目次リンク | 省略表示（ellipsis） |
| `.hg-data-note` | 為替「前日比データなし」テキスト | 省略表示（ellipsis） |

### インタラクションクラス一覧（hover・transition）
| クラス | 対象 | 効果 |
|--------|------|------|
| `.hg-data-card` | 市場数値ページ データグリッドセル | ホバーで減彩翡翠インナーボーダー（`inset 0 0 0 1px rgba(63,115,90,0.20)`） |
| `.hg-treasury-row` | 債券テーブル行（`<tr>`） | ホバーで薄い減彩翡翠背景（`rgba(63,115,90,0.05)`） |
| `.hg-nav-link` | ヘッダーナビリンク | ホバーで翡翠色に変化 |
| `.hg-metric-cell` | カレントビュー主要指標セル | ホバーで翡翠インナーボーダー＋ツールチップ出現 |
| `.hg-metric-tip` | 主要指標セルのツールチップ | 既定 opacity:0、親セル hover で出現（精密値・レンジ表示） |
| `.hg-report-card` | レポート一覧カード | `@media (hover: hover)` でのみホバー時に翡翠左ボーダー（`border-left-color: rgba(63,115,90,0.95)`）。タッチ端末では無効。旧 `useState` ホバーを CSS 化 |

## デザイン定数
```js
// アクセント翡翠はモジュールレベル定数を撤廃し t.positive（モード連動の減彩翡翠：ライト #2f6f55 / ダーク #6aa589）に一本化
const ALLOC_COLORS = ["#2f6f55", "#7d9a6f", "#b9a35f", "#c0894d", "#9a8579", "#bcb4a4"]
// 翡翠起点の土系トーナル（序列あり）
const SECTOR_COLORS = ["#3c5e74", "#6f8a86", "#b9a35f", "#b06a55", "#8a7d8f", "#bcb4a4"]
// 鋼青起点のトーナル
// 方向色（lib/metrics.ts directionColor）：up #4e8d6f / down #c25f52 / flat #8c8576（減彩）
// スタンス増加デルタ＝減彩琥珀 #b08a4a
```

## タイポグラフィ体系（4書体）
コンセプト：「洗練された金融エディトリアル × 日本的精度」。役割で書体を分ける。
| 役割 | 書体 | 用途 |
|------|------|------|
| 編集の声（和文明朝） | `var(--font-serif-jp)` = Shippori Mincho（OSフォールバック付き） | ロゴ「翡翠眼」・各ページのマストヘッド/タイトル・格言（プルクオート/エピグラフ）・レポート本文の h1/h2・一覧の月次/週次/日次見出し |
| 編集の声（Latin明朝） | `var(--font-serif-en)` = Newsreader（OSフォールバック付き） | 英語見出し・英語ラベル（市場ページの `EQUITY INDICES` 等のサブタイトルはイタリック）・数字見出し。紙面感の強化用 |
| UI（サンセリフ） | `var(--font-geist-sans)` | ナビ・ラベル・補助テキスト |
| データ（等幅） | `monospace` | 数値（株価・利回り・%・指標値）。既存どおり変更しない |

- Shippori Mincho・Newsreader は `app/layout.tsx` の `<head>` で Google Fonts `<link>`（1リンクに統合）で読込。`--font-serif-jp` / `--font-serif-en` は `globals.css` で定義
- **明朝（和文・Latin）は「編集的な見出し・引用」専用**。小さなUIラベルやデータには使わない（細部が潰れ可読性が落ちるため）
- 格言は斜体ではなく明朝アップライト＋装飾引用符（`.hg-quote-mark`）。和文に合成斜体は不自然なため
- アクセントバーは**減彩翡翠の単色実線**（`t.positive`）。旧仕様のグラデーション（`linear-gradient`）＋グロー（`box-shadow`）は全廃

## 背景の空気感・モーション
- **各ページの背景はフラットな単色紙面**（`backgroundColor: t.bg` のみ）。旧仕様の翡翠グリーン放射グラデーション（`backgroundImage`）・マストヘッドのグラデ背景は全廃（AI臭の主因のため）
- ページロード演出：`globals.css` の `@keyframes hg-fade-up` / `.hg-reveal`（段階表示は inline `animationDelay` でずらす）。`@media (prefers-reduced-motion: reduce)` で無効化

## メタデータ（app/layout.tsx）
```ts
title: "翡翠眼 | マクロ市場分析"
description: "為替・株式指数・米国債・日本国債・コモディティのリアルタイムデータと..."
lang: "ja"
```

## 注意事項
- APIキーは必ず.env.localに保存（テンプレートは `.env.example`。`.gitignore` は `.env*` を無視しつつ `!.env.example` で例のみ追跡）
- 現在必須の環境変数は `FRED_API_KEY` のみ（未設定時は `getUsTreasury` が `console.warn` を出し throw → allSettled 吸収で「---」表示）
- .env.localは.gitignoreに含まれていることを確認
- チャットにAPIキーを貼らない
- Gemini レポートの引用番号（` 1`, ` 6` 等）は必ず commit 前に削除すること（`/push-reports` が自動削除）
- カレントビュー frontmatter の生成は `/push-reports` スラッシュコマンドで行う（APIキー不要・Claude Code セッション内で完結）
- `git add` の対象は `content/reports/` のみ（`.claude/` や `scripts/` は通常含めない）
- コミットメッセージ形式：`レポート更新: [週次ファイル名] + カレントビュー生成`

# currentDate
Today's date is 2026-03-03.

      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
