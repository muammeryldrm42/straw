import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function ultimateOscillator(c: Candle[]): Signal {
  if (c.length < 40) return makeSignal({ reason: "Insufficient data" });
  const bp: number[] = [], tr: number[] = [];
  for (let k = 1; k < c.length; k++) {
    const lowMin = Math.min(c[k].low, c[k - 1].close);
    bp.push(c[k].close - lowMin);
    tr.push(Math.max(c[k].high, c[k - 1].close) - lowMin);
  }
  const sum = (arr: number[], end: number, n: number) => arr.slice(end - n + 1, end + 1).reduce((a, b) => a + b, 0);
  const j = bp.length - 1;
  const avg7 = sum(bp, j, 7) / sum(tr, j, 7);
  const avg14 = sum(bp, j, 14) / sum(tr, j, 14);
  const avg28 = sum(bp, j, 28) / sum(tr, j, 28);
  const uo = (100 * (4 * avg7 + 2 * avg14 + avg28)) / 7;
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (uo < 30) {
    const sl = cur.low - 1.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 1.5, cur.close + r * 2.5, cur.close + r * 4], confidence: 0.71, reason: `Ultimate Oscillator oversold (${uo.toFixed(0)})` });
  }
  if (uo > 70) {
    const sl = cur.high + 1.5 * a[i], r = sl - cur.close;
    return makeSignal({ signal: "short", entry: cur.close, stop_loss: sl, take_profit: [cur.close - r * 1.5, cur.close - r * 2.5, cur.close - r * 4], confidence: 0.71, reason: `Ultimate Oscillator overbought (${uo.toFixed(0)})` });
  }
  return makeSignal({ reason: `Ultimate Oscillator ${uo.toFixed(0)}` });
}
