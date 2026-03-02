export const revalidate = 3600; // 1時間キャッシュ（FREDは営業日ベースで更新）

const SERIES = [
  { id: "DGS2",  term: "2年債"  },
  { id: "DGS5",  term: "5年債"  },
  { id: "DGS10", term: "10年債" },
  { id: "DGS30", term: "30年債" },
];

// FRED観測値は週末・祝日に "." が入る場合があるため直近の有効値2件を取得
async function fetchSeries(seriesId, apiKey) {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}` +
    `&api_key=${apiKey}` +
    `&sort_order=desc` +
    `&limit=10` +          // 多めに取得して欠損をスキップ
    `&file_type=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED fetch failed for ${seriesId}: ${res.status}`);
  const data = await res.json();

  if (data.error_message) throw new Error(data.error_message);

  // "." (欠損) を除いた直近2件を取り出す
  const valid = (data.observations ?? []).filter((o) => o.value !== ".");
  if (valid.length === 0) throw new Error(`No valid data for ${seriesId}`);

  return {
    current:  parseFloat(valid[0].value),
    previous: valid.length > 1 ? parseFloat(valid[1].value) : null,
  };
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "FRED_API_KEY not configured" }, { status: 500 });
  }

  try {
    const results = await Promise.all(
      SERIES.map(({ id }) => fetchSeries(id, apiKey))
    );

    const ustreasury = SERIES.map(({ term }, i) => {
      const { current, previous } = results[i];
      const change = previous !== null ? current - previous : null;

      return {
        term,
        value:  `${current.toFixed(3)}%`,
        change: change !== null
          ? `${change >= 0 ? "+" : ""}${change.toFixed(3)}`
          : null,
        trend:  change !== null ? (change >= 0 ? "up" : "down") : null,
      };
    });

    return Response.json({ ustreasury, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
