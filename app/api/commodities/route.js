import { getCommodities } from "@/lib/market-data";

export const revalidate = 900; // 15分キャッシュ

export async function GET() {
  try {
    return Response.json(await getCommodities());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
