import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function equalHighsCluster(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const sh = swingHighs(c, 4), sl = swingLows(c, 4), i = c.length - 1, a = atr(c, 14), cur = c[i];
  const highs: number[] = [], lows: number[] = [];
  for (let k = Math.max(0, i - 40); k < i; k++) { if (sh[k] !== null) highs.push(sh[k] as number); if (sl[k] !== null) lows.push(sl[k] as number); }
  // 2+ eşit high -> sweep edilirse short
  const eqHigh = highs.filter((h, idx) => highs.some((h2, j) => j !== idx && Math.abs(h - h2) / h < 0.004));
  const eqLow = lows.filter((l, idx) => lows.some((l2, j) => j !== idx && Math.abs(l - l2) / l < 0.004));
  if (eqHigh.length >= 2) { const lvl = Math.max(...eqHigh); if (cur.high > lvl && cur.close < lvl) return mkA(c, i, "short", cur.high + a[i] * 0.5, [cur.close - a[i] * 2, cur.close - a[i] * 4], 0.72, "Equal-highs liquidity swept + rejection"); }
  if (eqLow.length >= 2) { const lvl = Math.min(...eqLow); if (cur.low < lvl && cur.close > lvl) return mkA(c, i, "long", cur.low - a[i] * 0.5, [cur.close + a[i] * 2, cur.close + a[i] * 4], 0.72, "Equal-lows liquidity swept + reversal"); }
  return makeSignal({ reason: "No equal-level sweep" });
}
