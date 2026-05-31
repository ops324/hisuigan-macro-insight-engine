import { getUsTreasury } from "@/lib/market-data";

export const revalidate = 3600; // 1時間キャッシュ（FREDは営業日ベースで更新）

export async function GET() {
  try {
    return Response.json(await getUsTreasury());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
