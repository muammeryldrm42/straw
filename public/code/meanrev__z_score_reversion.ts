import { Candle, Signal, makeSignal, rsi, sma, atr, bollingerBands } from "../indicators";

export function zScoreReversion(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const period = 20;
  const i = c.length - 1, cur = c[i];
  const slice = closes.slice(i - period + 1, i + 1);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (sd === 0) return makeSignal({ reason: "Volatility zero" });
  const z = (cur.close - mean) / sd;
  const a = atr(c, 14);
  // Z > +2: aşırı yüksek → short (mean'e dönüş bekleniyor)
  if (z > 2 && cur.close < cur.open) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [mean + sd, mean, mean - sd * 0.5], confidence: 0.7, reason: `Z-score +${z.toFixed(2)} → mean reversion short` });
  }
  if (z < -2 && cur.close > cur.open) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [mean - sd, mean, mean + sd * 0.5], confidence: 0.7, reason: `Z-score ${z.toFixed(2)} → mean reversion long` });
  }
  return makeSignal({ reason: `Z-score ${z.toFixed(2)} (normal range)` });
}
