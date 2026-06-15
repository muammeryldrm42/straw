import { Candle, Signal, makeSignal, rsi, atr, sma } from "../indicators";

export function quickScalp(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 7); // hızlı RSI
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const a = atr(c, 14);
  // Aşırı satım bounce - hızlı long
  if (rs[i - 1] < 20 && rs[i] > rs[i - 1] && cur.close > cur.open) {
    const sl = Math.min(prev.low, cur.low) - 0.2 * a[i], r = cur.close - sl;
    if (r > 0) return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.5, cur.close + r * 2.2], confidence: 0.65, reason: `Scalp: RSI7 ${rs[i].toFixed(0)} bounce` });
  }
  // Aşırı alım rejection - hızlı short
  if (rs[i - 1] > 80 && rs[i] < rs[i - 1] && cur.close < cur.open) {
    const sl = Math.max(prev.high, cur.high) + 0.2 * a[i], r = sl - cur.close;
    if (r > 0) return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.5, cur.close - r * 2.2], confidence: 0.65, reason: `Scalp: RSI7 ${rs[i].toFixed(0)} rejection` });
  }
  return makeSignal({ reason: "No scalp setup" });
}
