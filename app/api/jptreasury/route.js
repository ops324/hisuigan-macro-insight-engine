import { getJpTreasury } from "@/lib/market-data";

export const revalidate = 3600; // 1時間キャッシュ（財務省CSVは営業日ベース更新）

export async function GET() {
  try {
    return Response.json(await getJpTreasury());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
