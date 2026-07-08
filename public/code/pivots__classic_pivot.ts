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

export function classicPivot(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3;
  const r1 = 2 * pp - low, s1 = 2 * pp - high, r2 = pp + (high - low), s2 = pp - (high - low);
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  if (cur.close > pp && prev.close <= pp) return mkP(c, i, "long", s1, [r1, r2], 0.69, "Crossed above classic pivot");
  if (cur.close < pp && prev.close >= pp) return mkP(c, i, "short", r1, [s1, s2], 0.69, "Crossed below classic pivot");
  return makeSignal({ reason: "At classic pivot" });
}
