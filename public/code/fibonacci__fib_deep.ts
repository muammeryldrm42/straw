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

export function fibDeep(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) { const f786 = s.hi - s.range * 0.786; if (c[i].low <= f786 + a[i] && c[i].low >= s.lo && c[i].close > c[i].open) return mk(c, i, "long", s.lo - a[i], [s.hi - s.range * 0.382, s.hi], 0.69, "Deep 0.786 retracement (last-chance long)"); }
  else { const f786 = s.lo + s.range * 0.786; if (c[i].high >= f786 - a[i] && c[i].high <= s.hi && c[i].close < c[i].open) return mk(c, i, "short", s.hi + a[i], [s.lo + s.range * 0.382, s.lo], 0.69, "Deep 0.786 retracement (last-chance short)"); }
  return makeSignal({ reason: "Not at 0.786" });
}
