import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function forceIndex(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const fi: number[] = [0];
  for (let k = 1; k < c.length; k++) fi.push((c[k].close - c[k - 1].close) * c[k].volume);
  const fiEma = ema(fi, 13);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (fiEma[i - 1] <= 0 && fiEma[i] > 0) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: "Force Index turned positive" });
  }
  if (fiEma[i - 1] >= 0 && fiEma[i] < 0) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: "Force Index turned negative" });
  }
  return makeSignal({ reason: "No Force Index cross" });
}
