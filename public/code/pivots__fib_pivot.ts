import { Candle, Signal, makeSignal, atr } from "../indicators";

const mkP = (c: Candle[], i: number, side: "long" | "short", sl: number, tps: number[], conf: number, reason: string): Signal => {
  const cur = c[i];
  if (side === "long" && cur.close - sl <= 0) return makeSignal({ reason: "Invalid risk" });
  if (side === "short" && sl - cur.close <= 0) return makeSignal({ reason: "Invalid risk" });
  return makeSignal({ signal: side, entry: cur.close, stop_loss: sl, take_profit: tps, confidence: conf, reason });
};
function prevHLC(c: Candle[], window = 24) {
  const w = c.slice(-window - 1, -1);
  return { high: Math.max(...w.map((x) => x.high)), low: Math.min(...w.map((x) => x.low)), close: w[w.length - 1].close };
}

export function fibPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3, rng = high - low;
  const r1 = pp + 0.382 * rng, s1 = pp - 0.382 * rng, r2 = pp + 0.618 * rng, s2 = pp - 0.618 * rng;
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  if (cur.close > r1 && prev.close <= r1) return mkP(c, i, "long", pp, [r2, pp + rng], 0.69, "Fib pivot R1 breakout");
  if (cur.close < s1 && prev.close >= s1) return mkP(c, i, "short", pp, [s2, pp - rng], 0.69, "Fib pivot S1 breakdown");
  return makeSignal({ reason: "Between fib pivots" });
}
