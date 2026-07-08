import { NextRequest, NextResponse } from "next/server";

// Public market-data proxy — anahtar gerekmez, CORS sorunsuz.
// /api/klines?symbol=BTCUSDT&interval=15m&limit=300
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();
  const interval = searchParams.get("interval") || "15m";
  const limit = searchParams.get("limit") || "300";

  const allowedIntervals = ["1m", "5m", "15m", "1h", "4h", "1d"];
  if (!allowedIntervals.includes(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }
  const lim = Math.min(Math.max(parseInt(limit) || 300, 50), 1000);

  // SoDEX-native marketler — "SODEX:BTC-USD" formatı, SoDEX public perps API'sinden.
  const rawSymbol = searchParams.get("symbol") || "BTCUSDT";
  if (rawSymbol.toUpperCase().startsWith("SODEX:")) {
    const market = rawSymbol.slice(6).toUpperCase();
    const url = `https://mainnet-gw.sodex.dev/api/v1/perps/markets/${encodeURIComponent(market)}/klines?interval=${interval}&limit=${lim}`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 0 } });
      if (res.ok) {
        const j = await res.json();
        const arr: any[] = Array.isArray(j) ? j : (j.data || j.klines || []);
        const candles = arr.map((k: any) => {
          if (Array.isArray(k)) {
            return { time: Math.floor(Number(k[0]) / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +(k[5] || 0) };
          }
          const t = k.t ?? k.T ?? k.time ?? k.openTime ?? k.ts ?? k.startTime;
          return {
            time: Math.floor(Number(t) / 1000),
            open: parseFloat(k.o ?? k.open ?? k.openPrice),
            high: parseFloat(k.h ?? k.high ?? k.highPrice),
            low: parseFloat(k.l ?? k.low ?? k.lowPrice),
            close: parseFloat(k.c ?? k.close ?? k.closePrice),
            volume: parseFloat(k.v ?? k.volume ?? k.vol ?? k.baseVolume ?? 0),
          };
        }).filter((c: any) => isFinite(c.time) && isFinite(c.close))
          .sort((a: any, b: any) => a.time - b.time);
        if (candles.length) return NextResponse.json({ symbol: rawSymbol, interval, candles });
      }
    } catch (e) { /* aşağıda hata dön */ }
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 502 });
  }

  // Bazı coinler SoDEX'te düzgün listeli değil; kendi kaynağından çek.
  const ALT_COINS = ["HYPE"];
  const coinBase = symbol.replace("USDT", "");
  if (ALT_COINS.includes(coinBase)) {
    const intervalMs: Record<string, number> = {
      "1m": 60000, "5m": 300000, "15m": 900000, "1h": 3600000, "4h": 14400000, "1d": 86400000,
    };
    const now = Date.now();
    const startTime = now - lim * (intervalMs[interval] || 900000);
    try {
      const res = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "candleSnapshot", req: { coin: coinBase, interval, startTime, endTime: now } }),
        next: { revalidate: 0 },
      });
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw) && raw.length) {
          const candles = raw.map((k: any) => ({
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c), volume: parseFloat(k.v),
          }));
          return NextResponse.json({ symbol, interval, candles });
        }
      }
    } catch (e) { /* aşağıda hata dön */ }
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 502 });
  }

  // Genel kaynak zinciri (spot + perp)
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${lim}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${lim}`,
    `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${lim}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) continue;
      const raw = await res.json();
      if (!Array.isArray(raw) || !raw.length) continue;
      const candles = raw.map((k: any[]) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
      }));
      return NextResponse.json({ symbol, interval, candles });
    } catch (e) {
      continue;
    }
  }

  // Yukarıdakiler boş dönerse yedek kaynaktan dene (linear perp)
  const altInterval: Record<string, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D" };
  const ai = altInterval[interval];
  if (ai) {
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${ai}&limit=${Math.min(lim, 1000)}`, { next: { revalidate: 0 } });
      if (res.ok) {
        const j = await res.json();
        const list: any[] = j?.result?.list || [];
        if (list.length) {
          const candles = list.map((k: any[]) => ({
            time: Math.floor(Number(k[0]) / 1000),
            open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5] || "0"),
          })).filter((c: any) => isFinite(c.time) && isFinite(c.close)).sort((a: any, b: any) => a.time - b.time);
          if (candles.length) return NextResponse.json({ symbol, interval, candles });
        }
      }
    } catch (e) { /* son hata aşağıda */ }
  }

  return NextResponse.json({ error: "Fiyat verisi alınamadı" }, { status: 502 });
}
