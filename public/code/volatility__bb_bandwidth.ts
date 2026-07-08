import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function bollingerBandwidth(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const bb = bollingerBands(closes, 20, 2);
  const bw = (idx: number) => (bb.middle[idx] ? (bb.upper[idx] - bb.lower[idx]) / bb.middle[idx] : 0);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const bwNow = bw(i);
  // Son 20 mumun en düşük bandwidth'i (squeeze) sonrası genişleme
  let minBw = Infinity;
  for (let k = i - 20; k < i; k++) minBw = Math.min(minBw, bw(k));
  const wasSqueeze = bw(i - 1) <= minBw * 1.05;
  if (wasSqueeze && bwNow > bw(i - 1)) {
    if (cur.close > bb.upper[i - 1]) {
      const sl = bb.middle[i], r = cur.close - sl;
      return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: "BB bandwidth expanding up (post-squeeze)" });
    }
    if (cur.close < bb.lower[i - 1]) {
      const sl = bb.middle[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: "BB bandwidth expanding down (post-squeeze)" });
    }
  }
  return makeSignal({ reason: "No bandwidth expansion" });
}
