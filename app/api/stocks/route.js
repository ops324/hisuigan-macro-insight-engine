import { getStocks } from "@/lib/market-data";

export const revalidate = 3600; // 1時間キャッシュ（FRED は日次更新）

export async function GET() {
  try {
    return Response.json(await getStocks());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
