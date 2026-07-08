import { Candle, Signal, makeSignal, rsi, sma, atr, bollingerBands } from "../indicators";

export function bbMeanReversion(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const bb = bollingerBands(closes, 20, 2);
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const a = atr(c, 14);
  // Trend filtresi: BB orta bandı bir önceki orta banttan çok uzakta değilse (trendli pazarda mean reversion riski)
  const midSlope = Math.abs(bb.middle[i] - bb.middle[i - 10]) / bb.middle[i];
  if (midSlope > 0.02) return makeSignal({ reason: "Strong trend — mean reversion risky" });
  // Alt banda dokunma + dönüş = long
  if (prev.low <= bb.lower[i - 1] && cur.close > cur.open && cur.close > prev.close) {
    const sl = prev.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [bb.middle[i], bb.upper[i] - (bb.upper[i] - bb.middle[i]) * 0.3], confidence: 0.7, reason: "BB lower band touch + reversal" });
  }
  if (prev.high >= bb.upper[i - 1] && cur.close < cur.open && cur.close < prev.close) {
    const sl = prev.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [bb.middle[i], bb.lower[i] + (bb.middle[i] - bb.lower[i]) * 0.3], confidence: 0.7, reason: "BB upper band touch + rejection" });
  }
  return makeSignal({ reason: "No BB band touch" });
}
