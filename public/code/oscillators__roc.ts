import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function roc(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 12;
  const closes = c.map((x) => x.close);
  const rocAt = (idx: number) => ((closes[idx] - closes[idx - p]) / closes[idx - p]) * 100;
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = rocAt(i), prev = rocAt(i - 1);
  const e = ema(closes, 50);
  if (prev <= 0 && now > 0 && cur.close > e[i]) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "ROC crossed above zero + uptrend" });
  }
  if (prev >= 0 && now < 0 && cur.close < e[i]) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "ROC crossed below zero + downtrend" });
  }
  return makeSignal({ reason: `ROC ${now.toFixed(2)}%` });
}
