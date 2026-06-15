import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function volumeOscillator(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const vols = c.map((x) => x.volume);
  const fast = sma(vols, 5), slow = sma(vols, 20);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const vo = ((fast[i] - slow[i]) / slow[i]) * 100;
  // Yüksek hacim + yön = trend onayı
  if (vo > 40 && cur.close > cur.open && cur.close > c[i - 1].close) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.69, reason: `Volume Oscillator spike +${vo.toFixed(0)}% + green` });
  }
  if (vo > 40 && cur.close < cur.open && cur.close < c[i - 1].close) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.69, reason: `Volume Oscillator spike +${vo.toFixed(0)}% + red` });
  }
  return makeSignal({ reason: `Volume Oscillator ${vo.toFixed(0)}%` });
}
