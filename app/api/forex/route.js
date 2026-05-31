import { getForex } from "@/lib/market-data";

export const revalidate = 60;

export async function GET() {
  try {
    return Response.json(await getForex());
  } catch (err) {
    return Response.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
