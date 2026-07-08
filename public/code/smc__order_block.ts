import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function orderBlock(c: Candle[]): Signal {
  if (c.length < 210) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14);
  const e = ema(closes, 200);
  const price = closes[closes.length - 1];
  const trend = price > e[e.length - 1] ? "up" : "down";
  const start = Math.max(3, c.length - 50);
  for (let i = c.length - 2; i >= start; i--) {
    const ai = a[i];
    if (isNaN(ai)) continue;
    const cur = c[i], nx = c[i + 1];
    if (cur.close < cur.open && nx.high - cur.low >= ai * 1.5 && nx.close > cur.high) {
      if (trend === "up" && price <= cur.high && price >= cur.low) {
        const entry = (cur.high + cur.low) / 2, sl = cur.low - 0.5 * a[a.length - 1], r = entry - sl;
        return makeSignal({ signal: "long", entry, stop_loss: sl, take_profit: [entry + r * 2, entry + r * 3, entry + r * 5], confidence: 0.78, reason: "Bullish OB retest" });
      }
    }
    if (cur.close > cur.open && cur.high - nx.low >= ai * 1.5 && nx.close < cur.low) {
      if (trend === "down" && price <= cur.high && price >= cur.low) {
        const entry = (cur.high + cur.low) / 2, sl = cur.high + 0.5 * a[a.length - 1], r = sl - entry;
        return makeSignal({ signal: "short", entry, stop_loss: sl, take_profit: [entry - r * 2, entry - r * 3, entry - r * 5], confidence: 0.78, reason: "Bearish OB retest" });
      }
    }
  }
  return makeSignal({ reason: "Aktif OB retest yok" });
}
