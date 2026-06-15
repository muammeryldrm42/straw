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

export function twoBarReversal(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), prev = c[i - 1], cur = c[i];
  // Güçlü kırmızı sonra güçlü yeşil aynı seviyede = reversal
  if (red(prev) && body(prev) > a[i] && green(cur) && body(cur) > a[i] && cur.close > prev.open) return mkPA(c, i, "long", Math.min(prev.low, cur.low) - 0.3 * a[i], 0.7, "Two-bar bullish reversal");
  if (green(prev) && body(prev) > a[i] && red(cur) && body(cur) > a[i] && cur.close < prev.open) return mkPA(c, i, "short", Math.max(prev.high, cur.high) + 0.3 * a[i], 0.7, "Two-bar bearish reversal");
  return makeSignal({ reason: "No two-bar reversal" });
}
