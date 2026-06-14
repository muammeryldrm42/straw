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

export function floorPivotBounce(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), pp = (high + low + close) / 3;
  const r1 = 2 * pp - low, s1 = 2 * pp - high, a = atr(c, 14), i = c.length - 1, cur = c[i];
  // S1'e değip dönüş = long, R1'e değip dönüş = short
  if (Math.abs(cur.low - s1) < a[i] * 0.5 && cur.close > cur.open) return mkP(c, i, "long", s1 - a[i], [pp, r1], 0.68, "Bounce off S1 pivot");
  if (Math.abs(cur.high - r1) < a[i] * 0.5 && cur.close < cur.open) return mkP(c, i, "short", r1 + a[i], [pp, s1], 0.68, "Rejection at R1 pivot");
  return makeSignal({ reason: "Not at floor pivot" });
}
