import { Candle, Signal, makeSignal, rsi, atr, sma } from "../indicators";

export function momentumBurst(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  const move = Math.abs(cur.close - cur.open);
  if (move < a[i] * 2) return makeSignal({ reason: "Insufficient momentum" });
  const vols = c.map((x) => x.volume), avgV = sma(vols, 20)[i];
  if (cur.volume < avgV * 1.5) return makeSignal({ reason: "Volume not confirmed" });
  // Yön: yeşil mum = long, kırmızı = short
  if (cur.close > cur.open) {
    const sl = cur.low - 0.3 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1, cur.close + r * 1.8, cur.close + r * 3], confidence: 0.72, reason: `Momentum burst up (${(move/a[i]).toFixed(1)}x ATR)` });
  } else {
    const sl = cur.high + 0.3 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1, cur.close - r * 1.8, cur.close - r * 3], confidence: 0.72, reason: `Momentum burst down (${(move/a[i]).toFixed(1)}x ATR)` });
  }
}
