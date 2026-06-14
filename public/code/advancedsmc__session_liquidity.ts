import { Candle, Signal, makeSignal, atr, swingHighs, swingLows } from "../indicators";

const mkA = (c: Candle[], i: number, side: "long" | "short", slPrice: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - slPrice <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && slPrice - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: slPrice, take_profit: tps, confidence: conf, reason });
};

export function sessionLiquidity(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, a = atr(c, 14), cur = c[i];
  const win = c.slice(i - 20, i), hi = Math.max(...win.map((x) => x.high)), lo = Math.min(...win.map((x) => x.low));
  // Sweep low sonra dönüş = long
  if (cur.low < lo && cur.close > lo && cur.close > cur.open) return mkA(c, i, "long", cur.low - a[i] * 0.5, [cur.close + (hi - cur.close) * 0.5, hi], 0.72, "Session-low liquidity sweep + reversal");
  if (cur.high > hi && cur.close < hi && cur.close < cur.open) return mkA(c, i, "short", cur.high + a[i] * 0.5, [cur.close - (cur.close - lo) * 0.5, lo], 0.72, "Session-high liquidity sweep + reversal");
  return makeSignal({ reason: "No session sweep" });
}
