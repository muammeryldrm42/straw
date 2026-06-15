import { Candle, Signal, makeSignal, atr, rsi } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkR = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

export function stickSandwich(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], c3 = c[i];
  // Bullish: kırmızı, yeşil, kırmızı - c1 ve c3 close eşit
  if (red(c1) && green(c2) && red(c3) && Math.abs(c1.close - c3.close) / c3.close < 0.004) return mkR(c, i, "long", Math.min(c1.low, c3.low) - 0.5 * a[i], 0.67, "Bullish stick sandwich");
  if (green(c1) && red(c2) && green(c3) && Math.abs(c1.close - c3.close) / c3.close < 0.004) return mkR(c, i, "short", Math.max(c1.high, c3.high) + 0.5 * a[i], 0.67, "Bearish stick sandwich");
  return makeSignal({ reason: "No stick sandwich" });
}
