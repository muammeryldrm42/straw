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

export function risingThreeMethods(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14);
  const c1 = c[i - 4], small = c.slice(i - 3, i), c5 = c[i];
  // Rising: büyük yeşil, 3 küçük (gövde içinde), büyük yeşil yeni high
  if (green(c1) && body(c1) > a[i] && small.every((x) => body(x) < body(c1) && x.high < c1.high && x.low > c1.low) &&
      green(c5) && c5.close > c1.close) return mkR(c, i, "long", c1.low - 0.3 * a[i], 0.7, "Rising three methods (bullish continuation)");
  if (red(c1) && body(c1) > a[i] && small.every((x) => body(x) < body(c1) && x.high < c1.high && x.low > c1.low) &&
      red(c5) && c5.close < c1.close) return mkR(c, i, "short", c1.high + 0.3 * a[i], 0.7, "Falling three methods (bearish continuation)");
  return makeSignal({ reason: "No three methods" });
}
