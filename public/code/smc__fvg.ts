import { Candle, Signal, makeSignal, ema, atr, swingHighs, swingLows } from "../indicators";

export function fvg(c: Candle[]): Signal {
  if (c.length < 205) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const a = atr(c, 14);
  const e = ema(closes, 200);
  const price = closes[closes.length - 1];
  const trend = price > e[e.length - 1] ? "up" : "down";
  for (let i = c.length - 2; i >= 2; i--) {
    const ai = a[i];
    if (isNaN(ai)) continue;
    // bullish
    if (c[i - 2].high < c[i].low && c[i].low - c[i - 2].high >= ai * 0.3) {
      const mid = (c[i].low + c[i - 2].high) / 2;
      if (trend === "up" && price > c[i - 2].high && price < c[i].low) {
        const sl = c[i - 2].high - 0.5 * a[a.length - 1];
        const r = mid - sl;
        return makeSignal({ signal: "long", entry: mid, stop_loss: sl, take_profit: [mid + r * 2, mid + r * 3, mid + r * 5], confidence: 0.75, reason: `Bullish FVG mitigation @ ${mid.toFixed(2)}` });
      }
    }
    // bearish
    if (c[i - 2].low > c[i].high && c[i - 2].low - c[i].high >= ai * 0.3) {
      const mid = (c[i - 2].low + c[i].high) / 2;
      if (trend === "down" && price < c[i - 2].low && price > c[i].high) {
        const sl = c[i - 2].low + 0.5 * a[a.length - 1];
        const r = sl - mid;
        return makeSignal({ signal: "short", entry: mid, stop_loss: sl, take_profit: [mid - r * 2, mid - r * 3, mid - r * 5], confidence: 0.75, reason: `Bearish FVG mitigation @ ${mid.toFixed(2)}` });
      }
    }
  }
  return makeSignal({ reason: "No active FVG entry" });
}
