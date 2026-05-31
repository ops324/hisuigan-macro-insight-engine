import { getStocks, getForex, getUsTreasury, getJpTreasury, getCommodities } from "@/lib/market-data";
import type { StockItem, ForexItem, TreasuryItem, CommodityItem } from "@/lib/market-data";
import MarketClient, { SectionState } from "./MarketClient";

export const revalidate = 60;

function toSection<T>(result: PromiseSettledResult<{ updatedAt: string } & Record<string, unknown>>, key: string): { section: SectionState<T>; updatedAt: string | null } {
  if (result.status === "fulfilled") {
    return { section: { data: (result.value[key] as T[]) ?? [], error: null }, updatedAt: result.value.updatedAt };
  }
  const message = result.reason instanceof Error ? result.reason.message : "データ取得エラー";
  return { section: { data: null, error: message }, updatedAt: null };
}

export default async function MarketPage() {
  const [stocksR, forexR, usR, jpR, comR] = await Promise.allSettled([
    getStocks(),
    getForex(),
    getUsTreasury(),
    getJpTreasury(),
    getCommodities(),
  ]);

  const stocks = toSection<StockItem>(stocksR, "stocks");
  const forex = toSection<ForexItem>(forexR, "forex");
  const ustreasury = toSection<TreasuryItem>(usR, "ustreasury");
  const jptreasury = toSection<TreasuryItem>(jpR, "jptreasury");
  const commodities = toSection<CommodityItem>(comR, "commodities");

  // 「最終更新」は為替（最短キャッシュ）の updatedAt を優先
  const updatedAt = forex.updatedAt ?? stocks.updatedAt ?? commodities.updatedAt ?? null;

  return (
    <MarketClient
      stocks={stocks.section}
      forex={forex.section}
      ustreasury={ustreasury.section}
      jptreasury={jptreasury.section}
      commodities={commodities.section}
      updatedAt={updatedAt}
    />
  );
}
