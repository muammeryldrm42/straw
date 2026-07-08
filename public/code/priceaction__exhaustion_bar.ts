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

export function exhaustionBar(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const avgV = c.slice(i - 20, i).reduce((s, x) => s + x.volume, 0) / 20;
  const lowerWick = Math.min(cur.open, cur.close) - cur.low, upperWick = cur.high - Math.max(cur.open, cur.close);
  // Yüksek hacim + uzun fitil + büyük range = exhaustion
  if (cur.volume > avgV * 2 && rng(cur) > a[i] * 1.5 && lowerWick > body(cur) && cur.close > cur.open) return mkPA(c, i, "long", cur.low - 0.3 * a[i], 0.7, "Exhaustion bar (selling climax)");
  if (cur.volume > avgV * 2 && rng(cur) > a[i] * 1.5 && upperWick > body(cur) && cur.close < cur.open) return mkPA(c, i, "short", cur.high + 0.3 * a[i], 0.7, "Exhaustion bar (buying climax)");
  return makeSignal({ reason: "No exhaustion bar" });
}
