import { Candle, Signal, makeSignal, rsi, sma, atr, bollingerBands } from "../indicators";

// 1. Z-Score Mean Reversion - 20-period rolling mean ± 2σ
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

// 2. RSI Extreme Reversal - RSI <20 long, >80 short
export function rsiExtreme(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rs = rsi(closes, 14);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  // RSI <20 + dönüş mumu
  if (rs[i] < 20 && cur.close > cur.open && cur.close > c[i - 1].close) {
    const sl = cur.low - 0.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.74, reason: `RSI extreme ${rs[i].toFixed(0)} + bullish reversal` });
  }
  // RSI >80 + dönüş mumu
  if (rs[i] > 80 && cur.close < cur.open && cur.close < c[i - 1].close) {
    const sl = cur.high + 0.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.74, reason: `RSI extreme ${rs[i].toFixed(0)} + bearish reversal` });
  }
  return makeSignal({ reason: `RSI ${rs[i]?.toFixed(0)} - not extreme` });
}

// 3. BB Mean Reversion - üst/alt bantta dokunma → orta band hedef
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
