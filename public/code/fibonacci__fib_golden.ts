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

export function goldenPocket(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), s = swing(c, i);
  if (s.range <= 0) return makeSignal({ reason: "No swing" });
  if (s.up) {
    const gpTop = s.hi - s.range * 0.618, gpBot = s.hi - s.range * 0.65;
    if (c[i].low <= gpTop && c[i].low >= gpBot - a[i] * 0.5 && c[i].close > c[i].open) return mk(c, i, "long", gpBot - a[i], [c[i].close + s.range * 0.4, s.hi], 0.73, "Golden pocket (0.618–0.65) long");
  } else {
    const gpBot = s.lo + s.range * 0.618, gpTop = s.lo + s.range * 0.65;
    if (c[i].high >= gpBot && c[i].high <= gpTop + a[i] * 0.5 && c[i].close < c[i].open) return mk(c, i, "short", gpTop + a[i], [c[i].close - s.range * 0.4, s.lo], 0.73, "Golden pocket (0.618–0.65) short");
  }
  return makeSignal({ reason: "Not in golden pocket" });
}
