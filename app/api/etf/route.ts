import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// SoSoValue Spot ETF flows (BTC/ETH). News ile aynı key: SOSOVALUE_API_KEY.
// historical = 300 günlük günlük/kümülatif net akış; current = özet + fon bazında detay.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // SoSoValue ETF type haritası (us-{coin}-spot kalıbı + HK ETF'leri)
  const ASSET_TYPES: Record<string, string> = {
    btc: "us-btc-spot", eth: "us-eth-spot", sol: "us-sol-spot", xrp: "us-xrp-spot",
    bnb: "us-bnb-spot", doge: "us-doge-spot", hype: "us-hype-spot", link: "us-link-spot",
    ltc: "us-ltc-spot", avax: "us-avax-spot", hbar: "us-hbar-spot", dot: "us-dot-spot",
    "hk-btc": "hk-btc-spot", "hk-eth": "hk-eth-spot", "hk-sol": "hk-sol-spot",
  };
  const assetKey = searchParams.get("asset") || "btc";
  const asset = ASSET_TYPES[assetKey] || "us-btc-spot";
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) return NextResponse.json({ error: "no-key" });

  const base = "https://api.sosovalue.xyz/openapi/v2/etf";
  const opts = {
    method: "POST",
    headers: { "x-soso-api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: asset }),
    next: { revalidate: 300 },
  };

  try {
    const [hRes, cRes] = await Promise.all([
      fetch(`${base}/historicalInflowChart`, opts).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${base}/currentEtfDataMetrics`, opts).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const histRaw: any[] = hRes?.data?.list || (Array.isArray(hRes?.data) ? hRes.data : []) || [];
    let history = histRaw
      .map((d) => ({ date: d.date, net: Number(d.totalNetInflow), cum: Number(d.cumNetInflow), traded: Number(d.totalValueTraded), assets: Number(d.totalNetAssets) }))
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date)); // eski -> yeni

    // Yedek: eski historical endpoint boşsa yeni market-data API'nin summary-history'sinden çek
    if (!history.length) {
      try {
        const sym = assetKey.replace("hk-", "").toUpperCase();
        const cc = assetKey.startsWith("hk-") ? "HK" : "US";
        const shUrl = `https://openapi.sosovalue.com/openapi/v1/etfs/summary-history?symbol=${sym}&country_code=${cc}&limit=300`;
        const shRes = await fetch(shUrl, { headers: { "x-soso-api-key": key, Accept: "application/json" }, next: { revalidate: 300 } })
          .then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const shList: any[] = shRes?.data || [];
        history = shList
          .map((d) => ({ date: d.date, net: Number(d.total_net_inflow), cum: Number(d.cum_net_inflow), traded: Number(d.total_value_traded), assets: Number(d.total_net_assets) }))
          .filter((d) => d.date)
          .sort((a, b) => a.date.localeCompare(b.date));
      } catch { /* yedek de başarısızsa history boş kalır */ }
    }

    const c = cRes?.data || {};
    const summary = {
      totalNetAssets: c.totalNetAssets?.value ?? null,
      dailyNetInflow: c.dailyNetInflow?.value ?? null,
      cumNetInflow: c.cumNetInflow?.value ?? null,
      totalTokenHoldings: c.totalTokenHoldings?.value ?? null,
      dailyTotalValueTraded: c.dailyTotalValueTraded?.value ?? null,
      marketCapPct: c.totalNetAssetsPercentage?.value ?? null,
      lastUpdate: c.totalNetAssets?.lastUpdateDate ?? c.dailyNetInflow?.lastUpdateDate ?? "",
    };
    const funds = ((c.list || []) as any[]).map((f) => ({
      ticker: f.ticker, institute: f.institute,
      netAssets: f.netAssets?.value ?? null,
      dailyNetInflow: f.dailyNetInflow?.value ?? null,
      cumNetInflow: f.cumNetInflow?.value ?? null,
      fee: f.fee?.value ?? null,
      premium: f.discountPremiumRate?.value ?? null,
    })).filter((f) => f.ticker);

    if (!history.length && !funds.length) return NextResponse.json({ error: "empty", summary, funds, history });
    return NextResponse.json({ asset, summary, funds, history });
  } catch {
    return NextResponse.json({ error: "exception" });
  }
}
