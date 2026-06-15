import { Candle, Signal, makeSignal, atr, ema } from "../indicators";

const body = (c: Candle) => Math.abs(c.close - c.open);
const rng = (c: Candle) => c.high - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;
const mkPA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long") { const r = cur.close - slPrice; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "long", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: conf, reason }); }
  const r = slPrice - cur.close; if (r <= 0) return makeSignal({ reason: "Invalid risk" }); return makeSignal({ signal: "short", entry: cur.close, stop_loss: slPrice, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: conf, reason });
};

export function threeBarReversal(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), c1 = c[i - 2], c2 = c[i - 1], cur = c[i];
  // Düşen low (c2 en düşük), sonra yükselen close = bullish 3-bar
  if (c2.low < c1.low && c2.low < cur.low && cur.close > c2.high && green(cur)) return mkPA(c, i, "long", c2.low - 0.3 * a[i], 0.7, "Three-bar bullish reversal");
  if (c2.high > c1.high && c2.high > cur.high && cur.close < c2.low && red(cur)) return mkPA(c, i, "short", c2.high + 0.3 * a[i], 0.7, "Three-bar bearish reversal");
  return makeSignal({ reason: "No three-bar reversal" });
}
