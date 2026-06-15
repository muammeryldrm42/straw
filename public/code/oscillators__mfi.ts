import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function mfi(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const p = 14;
  const tp = c.map((x) => (x.high + x.low + x.close) / 3);
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const calc = (end: number) => {
    let pos = 0, neg = 0;
    for (let k = end - p + 1; k <= end; k++) {
      const mf = tp[k] * c[k].volume;
      if (tp[k] > tp[k - 1]) pos += mf; else neg += mf;
    }
    return neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
  };
  const now = calc(i), prev = calc(i - 1);
  if (prev < 20 && now >= 20) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.73, reason: `MFI exit oversold (${now.toFixed(0)})` });
  }
  if (prev > 80 && now <= 80) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.73, reason: `MFI exit overbought (${now.toFixed(0)})` });
  }
  return makeSignal({ reason: `MFI ${now.toFixed(0)}` });
}
