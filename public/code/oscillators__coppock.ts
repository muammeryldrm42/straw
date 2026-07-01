import { Candle, Signal, makeSignal, sma, ema, atr } from "../indicators";

export function coppock(c: Candle[]): Signal {
  if (c.length < 60) return makeSignal({ reason: "Insufficient data" });
  const closes = c.map((x) => x.close);
  const rocN = (n: number, idx: number) => ((closes[idx] - closes[idx - n]) / closes[idx - n]) * 100;
  const raw: number[] = [];
  for (let k = 0; k < closes.length; k++) {
    if (k < 14) { raw.push(0); continue; }
    raw.push(rocN(11, k) + rocN(14, k));
  }
  // WMA(10) of raw
  const wma = raw.map((_, idx) => {
    if (idx < 10) return 0;
    let num = 0, den = 0;
    for (let w = 0; w < 10; w++) { num += raw[idx - w] * (10 - w); den += (10 - w); }
    return num / den;
  });
  const i = c.length - 1, cur = c[i], a = atr(c, 14);
  if (wma[i - 1] <= 0 && wma[i] > 0) {
    const sl = cur.close - 2.5 * a[i], r = cur.close - sl;
    return makeSignal({ signal: "long", entry: cur.close, stop_loss: sl, take_profit: [cur.close + r * 2, cur.close + r * 3, cur.close + r * 5], confidence: 0.72, reason: "Coppock curve turned up (long-term buy)" });
  }
  return makeSignal({ reason: `Coppock ${wma[i].toFixed(1)}` });
}
