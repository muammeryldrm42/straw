import { NextResponse } from "next/server";
import { categorize, isExcluded } from "@/lib/marketCategory";

interface Row {
  id: string;        // demo/signals value (SODEX: prefix dahil)
  display: string;   // gösterim adı
  base: string;
  price: number;
  change: number;    // 24s %
  category: "crypto" | "stocks" | "commodities" | "index" | "ssi";
  source: "binance" | "sodex";
}

export async function GET() {
  const rows: Row[] = [];

  // SoDEX tickers (kripto + hisse + emtia + index) — tek kaynak, her tokenden bir tane
  try {
    const [tk, sy] = await Promise.all([
      fetch("https://mainnet-gw.sodex.dev/api/v1/perps/markets/tickers", { headers: { Accept: "application/json" }, next: { revalidate: 20 } }).then((r) => r.json()).catch(() => null),
      fetch("https://mainnet-gw.sodex.dev/api/v1/perps/markets/symbols", { headers: { Accept: "application/json" }, next: { revalidate: 300 } }).then((r) => r.json()).catch(() => null),
    ]);
    // sembol -> kategori haritası (symbols endpoint tip veriyorsa)
    const catMap: Record<string, string> = {};
    const syArr: any[] = sy ? (Array.isArray(sy) ? sy : sy.data || sy.symbols || []) : [];
    for (const s of syArr) {
      const sym = s.symbol ?? s.name ?? s.symbolName;
      if (sym) catMap[String(sym)] = s.category ?? s.type ?? s.assetType ?? s.kind ?? "";
    }
    const tkArr: any[] = tk ? (Array.isArray(tk) ? tk : tk.data || tk.tickers || []) : [];
    for (const t of tkArr) {
      const sym = t.symbol ?? t.s ?? t.market ?? t.name;
      if (!sym) continue;
      const base = String(sym).split("-")[0];
      if (isExcluded(base)) continue;   // NATGAS vb. hayalet sembolleri ele
      const price = parseFloat(t.lastPrice ?? t.last ?? t.c ?? t.close ?? t.markPrice ?? t.price ?? "0");
      // SoDEX 'change' alanı ham fiyat FARKI (ör. BTC 651 = $651), yüzde değil.
      // Gerçek 24s % = fark / açılış fiyatı (açılış = son fiyat − fark).
      const rawChange = parseFloat(t.priceChange ?? t.change ?? t.priceChangeValue ?? t.P ?? "0");
      const open = price - rawChange;
      let change = open > 0 && isFinite(open) ? (rawChange / open) * 100 : 0;
      if (!isFinite(price) || price <= 0) continue;
      rows.push({
        id: `SODEX:${sym}`, display: String(sym), base,
        price, change: isFinite(change) ? change : 0,
        category: categorize(base, catMap[String(sym)]), source: "sodex",
      });
    }
  } catch { /* atla */ }

  // SoDEX SPOT — SSI endeksleri (MAG7ssi, DEFIssi, MEMEssi). Perp değil spot pazarından.
  // Semboller "v" prefix'li (ör. vMEMEssi_vUSDC); fiyat=lastPx, 24s%=changePct.
  try {
    const spotTk = await fetch("https://mainnet-gw.sodex.dev/api/v1/spot/markets/tickers", { headers: { Accept: "application/json" }, next: { revalidate: 30 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const spotArr: any[] = spotTk ? (Array.isArray(spotTk) ? spotTk : spotTk.data || spotTk.tickers || []) : [];
    const SSI = ["MAG7ssi", "DEFIssi", "MEMEssi"];
    for (const tt of spotArr) {
      const sym = String(tt.symbol ?? tt.s ?? tt.market ?? tt.name ?? "");
      if (!sym) continue;
      const lower = sym.toLowerCase();
      const matched = SSI.find((x) => lower.includes(x.toLowerCase()));
      if (!matched) continue;
      if (!lower.includes("usdc")) continue;
      const price = parseFloat(tt.lastPx ?? tt.lastPrice ?? tt.last ?? tt.lastTradePrice ?? tt.c ?? tt.close ?? tt.markPrice ?? tt.price ?? "0");
      if (!isFinite(price) || price <= 0) continue;
      let change = parseFloat(tt.changePct ?? tt.priceChangePercent ?? tt.changePercent ?? tt.changeRate ?? tt.P ?? "NaN");
      if (!isFinite(change)) {
        const rawChange = parseFloat(tt.change ?? tt.priceChange ?? "0");
        const open = parseFloat(tt.openPx ?? "0") || (price - rawChange);
        change = open > 0 && isFinite(open) ? (rawChange / open) * 100 : 0;
      }
      rows.push({
        id: `SODEX_SPOT:${matched}`, display: `${matched}/USDC`, base: matched,
        price, change: isFinite(change) ? change : 0,
        category: "ssi", source: "sodex",
      });
    }
    // SOSO (SoSoValue token) — sadece spot, futures yok
    for (const tt of spotArr) {
      const sym = String(tt.symbol ?? tt.s ?? tt.market ?? tt.name ?? "");
      const lower = sym.toLowerCase();
      if (!lower.includes("soso") || !lower.includes("usdc")) continue;
      const price = parseFloat(tt.lastPx ?? tt.lastPrice ?? tt.last ?? tt.close ?? tt.price ?? "0");
      if (!isFinite(price) || price <= 0) continue;
      let change = parseFloat(tt.changePct ?? tt.priceChangePercent ?? tt.changePercent ?? "NaN");
      if (!isFinite(change)) {
        const rawChange = parseFloat(tt.change ?? tt.priceChange ?? "0");
        const open = parseFloat(tt.openPx ?? "0") || (price - rawChange);
        change = open > 0 && isFinite(open) ? (rawChange / open) * 100 : 0;
      }
      rows.push({ id: "SODEX_SPOT:SOSO", display: "SOSO/USDC", base: "SOSO", price, change: isFinite(change) ? change : 0, category: "crypto", source: "sodex" });
      break;
    }
  } catch { /* atla */ }

  return NextResponse.json({ rows, count: rows.length });
}
