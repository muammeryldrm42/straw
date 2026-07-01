import { NextResponse } from "next/server";
import { isExcluded } from "@/lib/marketCategory";

// SoDEX'in AKTİF perp marketlerini döner (coin, emtia/RWA, index, stock token).
// symbols endpoint delisted/hayalet sembol de döndürebildiği için (örn NATGAS),
// tickers ile kesiştirip yalnızca CANLI fiyatı olan = trade edilebilir marketleri tutuyoruz.
export async function GET() {
  try {
    const [syRes, tkRes] = await Promise.all([
      fetch("https://mainnet-gw.sodex.dev/api/v1/perps/markets/symbols", { headers: { Accept: "application/json" }, next: { revalidate: 300 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://mainnet-gw.sodex.dev/api/v1/perps/markets/tickers", { headers: { Accept: "application/json" }, next: { revalidate: 60 } }).then((r) => r.ok ? r.json() : null).catch(() => null),
    ]);

    // tickers'ta canlı fiyatı (>0) olan sembollerin kümesi = gerçekten aktif marketler
    const tkArr: any[] = tkRes ? (Array.isArray(tkRes) ? tkRes : tkRes.data || tkRes.tickers || []) : [];
    const live = new Map<string, number>(); // symbol -> price
    for (const t of tkArr) {
      const sym = t.symbol ?? t.s ?? t.market ?? t.name;
      const price = parseFloat(t.lastPrice ?? t.last ?? t.c ?? t.close ?? t.markPrice ?? t.price ?? "0");
      if (sym && isFinite(price) && price > 0) live.set(String(sym), price);
    }

    // symbols listesini al; tickers varsa yalnızca canlı olanları tut
    const syArr: any[] = syRes ? (Array.isArray(syRes) ? syRes : syRes.data || syRes.symbols || []) : [];
    let source: any[] = syArr;
    // symbols boşsa ama tickers doluysa, listeyi doğrudan tickers'tan üret
    if (!syArr.length && tkArr.length) {
      source = tkArr;
    }

    const seen = new Set<string>();
    const markets = source
      .map((s: any) => {
        const sym = s.symbol ?? s.name ?? s.symbolName ?? s.s ?? s.market ?? (typeof s === "string" ? s : null);
        if (!sym) return null;
        const symStr = String(sym);
        if (isExcluded(symStr.split("-")[0])) return null;   // NATGAS vb. hayalet sembolleri ele
        // tickers verisi varsa canlı kontrolü uygula; yoksa (tickers erişilemezse) tümünü geçir
        if (live.size > 0 && !live.has(symStr)) return null;
        if (seen.has(symStr)) return null;
        seen.add(symStr);
        return {
          symbol: symStr,                           // örn "BTC-USD"
          base: symStr.split("-")[0],               // örn "BTC"
          maxLeverage: s.maxLeverage ?? s.maxLev ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ markets, count: markets.length, live: live.size });
  } catch {
    return NextResponse.json({ markets: [], error: "SoDEX unreachable" }, { status: 502 });
  }
}
