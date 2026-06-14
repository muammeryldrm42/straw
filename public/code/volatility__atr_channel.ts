import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function atrChannel(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const mid = ema(closes, 20), a = atr(c, 14);
  const i = c.length - 1, cur = c[i], prev = c[i - 1];
  const upper = mid[i] + 2 * a[i], lower = mid[i] - 2 * a[i];
  const upperPrev = mid[i - 1] + 2 * a[i - 1], lowerPrev = mid[i - 1] - 2 * a[i - 1];
  if (cur.close > upper && prev.close <= upperPrev) {
    const sl = mid[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 2, cur.close + r * 3], confidence: 0.71, reason: "ATR channel breakout up" });
  }
  if (cur.close < lower && prev.close >= lowerPrev) {
    const sl = mid[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 2, cur.close - r * 3], confidence: 0.71, reason: "ATR channel breakdown down" });
  }
  return makeSignal({ reason: "Inside ATR channel" });
}
