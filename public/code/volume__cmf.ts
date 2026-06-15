import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function cmf(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const p = 20;
  const calc = (end: number) => {
    let mfv = 0, vol = 0;
    for (let k = end - p + 1; k <= end; k++) {
      const rng = c[k].high - c[k].low;
      const mfm = rng === 0 ? 0 : ((c[k].close - c[k].low) - (c[k].high - c[k].close)) / rng;
      mfv += mfm * c[k].volume; vol += c[k].volume;
    }
    return vol === 0 ? 0 : mfv / vol;
  };
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const now = calc(i), prev = calc(i - 1);
  if (prev <= 0.05 && now > 0.05) {
    const sl = cur.close - 2 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `CMF turned positive (${now.toFixed(2)})` });
  }
  if (prev >= -0.05 && now < -0.05) {
    const sl = cur.close + 2 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `CMF turned negative (${now.toFixed(2)})` });
  }
  return makeSignal({ reason: `CMF ${now.toFixed(2)}` });
}
