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

export function wideRangeBar(c: Candle[]): Signal {
  if (c.length < 20) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const avgRange = c.slice(i - 10, i).reduce((s, x) => s + rng(x), 0) / 10;
  if (rng(cur) > avgRange * 2 && green(cur) && body(cur) > rng(cur) * 0.7) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.69, "Wide-range bar (bullish thrust)");
  if (rng(cur) > avgRange * 2 && red(cur) && body(cur) > rng(cur) * 0.7) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.69, "Wide-range bar (bearish thrust)");
  return makeSignal({ reason: "No wide-range bar" });
}
