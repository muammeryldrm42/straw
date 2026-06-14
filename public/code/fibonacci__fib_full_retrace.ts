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

export function fibFullRetrace(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  // Fiyat tüm swing'i geri aldıysa (1.0) ve dönüyorsa
  if (s.up && c[i].low <= s.lo + a[i] && c[i].close > c[i].open) return mk(c, i, "long", s.lo - a[i] * 1.5, [s.lo + s.range * 0.5, s.hi], 0.68, "Full retrace to swing low — reversal long");
  if (!s.up && c[i].high >= s.hi - a[i] && c[i].close < c[i].open) return mk(c, i, "short", s.hi + a[i] * 1.5, [s.hi - s.range * 0.5, s.lo], 0.68, "Full retrace to swing high — reversal short");
  return makeSignal({ reason: "No full retrace" });
}
