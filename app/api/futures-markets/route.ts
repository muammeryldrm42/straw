import { NextResponse } from "next/server";

// Binance USD-M Futures'ta listeli TÜM perpetual coinleri döner.
// Her coinden tek adet: quoteAsset=USDT, contractType=PERPETUAL, status=TRADING.
// value formatı düz Binance sembolü: "BTCUSDT".
const HOSTS = ["https://fapi.binance.com", "https://fapi1.binance.com", "https://fapi2.binance.com"];

export async function GET() {
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/fapi/v1/exchangeInfo`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 }, // 1 saat cache
      });
      if (!res.ok) continue;
      const j = await res.json();
      const syms: any[] = j.symbols || [];
      const seen = new Set<string>();
      const markets = syms
        .filter((s) =>
          s.contractType === "PERPETUAL" &&
          s.status === "TRADING" &&
          s.quoteAsset === "USDT"
        )
        .map((s) => ({
          symbol: String(s.symbol),                                  // "BTCUSDT"
          base: String(s.baseAsset),                                 // "BTC"
          maxLeverage: null as number | null,
        }))
        .filter((m) => {
          // base bazında dedupe (USDT-only zaten tekilleştirir, yine de garanti)
          if (seen.has(m.base)) return false;
          seen.add(m.base);
          return true;
        })
        // hacimli/popüler coinler ön planda olsun diye base alfabetik yerine bırakıyoruz;
        // sıralamayı tickers route 24s hacme göre yapacak.
        .sort((a, b) => a.base.localeCompare(b.base));
      if (markets.length) {
        return NextResponse.json({ markets, count: markets.length, source: "binance-futures" });
      }
    } catch {
      continue;
    }
  }
  return NextResponse.json({ markets: [], error: "Binance Futures unreachable" }, { status: 502 });
}
