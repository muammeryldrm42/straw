import { Candle, Signal, makeSignal, sma, ema, atr, bollingerBands } from "../indicators";

export function massIndex(c: Candle[]): Signal {
  if (c.length < 50) return makeSignal({ reason: "Insufficient data" });
  const range = c.map((x) => x.high - x.low);
  const ema9 = ema(range, 9);
  const ema9of9 = ema(ema9, 9);
  const ratio = ema9.map((v, i) => (ema9of9[i] ? v / ema9of9[i] : 1));
  const sumMI = (end: number) => ratio.slice(end - 24, end + 1).reduce((a, b) => a + b, 0);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const mi = sumMI(i), miPrev = sumMI(i - 1);
  const ema9c = ema(c.map((x) => x.close), 9);
  // Reversal bulge: MI 27 üstüne çıkıp 26.5 altına dönerse
  if (miPrev >= 27 && mi < 26.5) {
    // yön EMA9 eğimiyle
    if (ema9c[i] < ema9c[i - 3]) {
      const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
      return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.68, reason: "Mass Index reversal bulge (down)" });
    }
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.68, reason: "Mass Index reversal bulge (up)" });
  }
  return makeSignal({ reason: `Mass Index ${mi.toFixed(1)}` });
}
