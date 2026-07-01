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

export function pivotBreakout(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3, rng = high - low;
  const r2 = pp + rng, s2 = pp - rng, i = c.length - 1, cur = c[i], prev = c[i - 1];
  const vol = c.map((x) => x.volume), avgV = vol.slice(-20).reduce((a, b) => a + b, 0) / 20;
  if (cur.close > r2 && prev.close <= r2 && cur.volume > avgV * 1.3) return mkP(c, i, "long", pp, [r2 + rng * 0.5, r2 + rng], 0.71, "Strong breakout above R2 + volume");
  if (cur.close < s2 && prev.close >= s2 && cur.volume > avgV * 1.3) return mkP(c, i, "short", pp, [s2 - rng * 0.5, s2 - rng], 0.71, "Strong breakdown below S2 + volume");
  return makeSignal({ reason: "Inside R2/S2" });
}
