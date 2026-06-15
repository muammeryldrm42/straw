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

export function fibTrendContinuation(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i), e = ema(c.map((x) => x.close), 21);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up && e[i] > e[i - 10]) { const f5 = s.hi - s.range * 0.5; if (c[i].low <= f5 && c[i].close > f5 && c[i].close > c[i].open) return mk(c, i, "long", f5 - a[i] * 2, [s.hi, s.hi + s.range * 0.5], 0.7, "Fib pullback in confirmed uptrend"); }
  if (!s.up && e[i] < e[i - 10]) { const f5 = s.lo + s.range * 0.5; if (c[i].high >= f5 && c[i].close < f5 && c[i].close < c[i].open) return mk(c, i, "short", f5 + a[i] * 2, [s.lo, s.lo - s.range * 0.5], 0.7, "Fib pullback in confirmed downtrend"); }
  return makeSignal({ reason: "No fib continuation" });
}
