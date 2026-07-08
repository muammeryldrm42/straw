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

export function woodie(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low } = prevHLC(c), i = c.length - 1, cur = c[i], prev = c[i - 1];
  const pp = (high + low + 2 * cur.open) / 4;
  const r1 = 2 * pp - low, s1 = 2 * pp - high;
  if (cur.close > pp && prev.close <= pp) return mkP(c, i, "long", s1, [r1, r1 + (high - low)], 0.68, "Woodie pivot bullish");
  if (cur.close < pp && prev.close >= pp) return mkP(c, i, "short", r1, [s1, s1 - (high - low)], 0.68, "Woodie pivot bearish");
  return makeSignal({ reason: "At Woodie pivot" });
}
