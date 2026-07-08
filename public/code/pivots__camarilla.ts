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

export function camarilla(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const { high, low, close } = prevHLC(c), rng = high - low;
  const h3 = close + rng * 1.1 / 4, l3 = close - rng * 1.1 / 4, h4 = close + rng * 1.1 / 2, l4 = close - rng * 1.1 / 2;
  const i = c.length - 1, prev = c[i - 1], cur = c[i];
  // H3 kırılımı = long breakout, L3 = short
  if (cur.close > h3 && prev.close <= h3) return mkP(c, i, "long", close, [h4, h4 + rng * 0.2], 0.7, "Camarilla H3 breakout");
  if (cur.close < l3 && prev.close >= l3) return mkP(c, i, "short", close, [l4, l4 - rng * 0.2], 0.7, "Camarilla L3 breakdown");
  return makeSignal({ reason: "Between Camarilla levels" });
}
