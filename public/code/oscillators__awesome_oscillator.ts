import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function awesomeOscillator(c: Candle[]): Signal {
  if (c.length < 45) return makeSignal({ reason: "Insufficient data" });
  const median = c.map((x) => (x.high + x.low) / 2);
  const ao = sma(median, 5).map((v, i) => v - sma(median, 34)[i]);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (ao[i - 1] <= 0 && ao[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.7, reason: "Awesome Oscillator zero cross up" });
  }
  if (ao[i - 1] >= 0 && ao[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.7, reason: "Awesome Oscillator zero cross down" });
  }
  return makeSignal({ reason: "No AO zero cross" });
}
