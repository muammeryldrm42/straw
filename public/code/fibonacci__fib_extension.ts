import { Candle, Signal, makeSignal, atr, ema } from "../indicators";

const mk = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};
function swing(c: Candle[], end: number, span = 50) {
  const w = c.slice(end - span + 1, end + 1);
  let hiIdx = 0, loIdx = 0;
  for (let k = 0; k < w.length; k++) { if (w[k].high > w[hiIdx].high) hiIdx = k; if (w[k].low < w[loIdx].low) loIdx = k; }
  const hi = w[hiIdx].high, lo = w[loIdx].low;
  const up = hiIdx > loIdx; // son hareket yukarı mı (high low'dan sonra geldi)
  return { hi, lo, up, range: hi - lo };
}

export function fibExtension(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up && c[i].close > s.hi && c[i - 1].close <= s.hi) return mk(c, i, "long", s.hi - a[i] * 1.5, [s.hi + s.range * 0.618, s.hi + s.range], 0.7, "Breakout to 1.618 fib extension (up)");
  if (!s.up && c[i].close < s.lo && c[i - 1].close >= s.lo) return mk(c, i, "short", s.lo + a[i] * 1.5, [s.lo - s.range * 0.618, s.lo - s.range], 0.7, "Breakdown to 1.618 fib extension (down)");
  return makeSignal({ reason: "No extension breakout" });
}
