import { getStocks } from "@/lib/market-data";

export const revalidate = 300; // 5分キャッシュ

export async function GET() {
  try {
    return Response.json(await getStocks());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
