export const revalidate = 60;

export async function GET() {
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD"),
      fetch("https://open.er-api.com/v6/latest/EUR"),
    ]);

    if (!usdRes.ok || !eurRes.ok) {
      throw new Error("Failed to fetch exchange rate data");
    }

    const usdData = await usdRes.json();
    const eurData = await eurRes.json();

    const usdJpy = usdData.rates["JPY"];
    const eurJpy = eurData.rates["JPY"];
    const eurUsd = usdData.rates["EUR"] ? 1 / usdData.rates["EUR"] : eurData.rates["USD"] ? 1 / eurData.rates["USD"] : null;
    const gbpJpy = eurData.rates["JPY"] / eurData.rates["GBP"];

    const forex = [
      {
        pair: "USD/JPY",
        value: usdJpy.toFixed(2),
        change: null,
        pct: null,
      },
      {
        pair: "EUR/JPY",
        value: eurJpy.toFixed(2),
        change: null,
        pct: null,
      },
      {
        pair: "EUR/USD",
        value: eurUsd ? eurUsd.toFixed(4) : null,
        change: null,
        pct: null,
      },
      {
        pair: "GBP/JPY",
        value: gbpJpy.toFixed(2),
        change: null,
        pct: null,
      },
    ];

    return Response.json({
      forex,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
