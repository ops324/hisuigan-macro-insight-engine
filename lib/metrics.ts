// カレントビュー主要指標の表示ヘルパー。ReportsClient から利用。純粋関数はテスト対象。

// 彩度を落とした方向色（ネオン廃止・紙面に馴染む。両テーマで判読可）
export function directionColor(d: string): string {
  return d === "up" ? "#4e8d6f" : d === "down" ? "#c25f52" : "#8c8576";
}

export function directionLabel(d: string): string {
  return d === "up" ? "▲" : d === "down" ? "▼" : "—";
}

// 変化テキストの単位を整える：利回り系（値が % で終わる）で change が裸の符号付き数値なら pt を補う。
export function changeDisplay(value: string, change?: string): string | undefined {
  if (!change) return undefined;
  const isYield = /%\s*$/.test(value.trim());
  const hasUnit = /[%$]|pt|bp/i.test(change);
  return isYield && !hasUnit ? `${change}pt` : change;
}

// 指標ラベルから資産クラスを推定（金利を先に判定。コモディティの「金」と衝突させないため）。
export function metricGroup(label: string): string {
  if (/債|金利|利回り|イールド/.test(label)) return "金利";
  if (/原油|WTI|ブレント|天然ガス|ガス|金|銀|銅|プラチナ|コモディティ/.test(label)) return "コモディティ";
  if (/\/|円|ドル|ユーロ|ポンド|為替/.test(label)) return "為替";
  if (/S&P|NASDAQ|ナスダック|ダウ|DOW|日経|TOPIX|株|指数/.test(label)) return "株式";
  return "その他";
}
