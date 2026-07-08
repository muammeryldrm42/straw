import { Candle, Signal, makeSignal, sma, atr } from "../indicators";

export function volumeSurge(c: Candle[]): Signal {
  if (c.length < 30) return makeSignal({ reason: "Insufficient data" });
  const vols = c.map((x) => x.volume), i = c.length - 1, cur = c[i];
  const avgV = sma(vols.slice(0, -1), 20)[vols.length - 2];
  const mult = cur.volume / (avgV || 1);
  if (mult < 3) return makeSignal({ reason: `Surge yok (${mult.toFixed(2)}x)` });
  if (cur.close <= cur.open) return makeSignal({ reason: "Volume on red candle — skip" });
  const a = atr(c, 14), sl = cur.close - a[i] * 1.5, r = cur.close - sl;
  const conf = Math.min(0.5 + (mult - 3) * 0.05 + 0.2, 0.95);
  return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3.5, cur.close + r * 5], confidence: conf, reason: `Volume surge ${mult.toFixed(1)}x, yeşil mum` });
}
